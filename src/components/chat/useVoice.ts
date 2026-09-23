import { useCallback, useEffect, useRef, useState } from 'react';
import { safeStorage } from '../../utils/storage';

/**
 * Voice for Zora, entirely in the browser:
 *  - listen(): speech → text via the Web Speech API (Chrome, Edge, Safari)
 *  - speak():  Zora's reply read aloud via SpeechSynthesis, Indian-English voice when available
 */

const VOICE_PREF_KEY = 'indiabank_zora_voice_replies';

type RecognitionCtor = new () => any;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Turn chat markdown into something that sounds natural when read out. */
export function toSpeakable(text: string): string {
  return text
    .replace(/\[INTENT:[A-Z_]+\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[•\-*]\s+/gm, '')
    .replace(/^\s*(\d+)[.)]\s+/gm, '$1. ')
    .replace(/•{2,}\s*(\d{4})/g, 'ending $1')
    .replace(/₹\s?([\d,]+(?:\.\d+)?)/g, (_, n: string) => {
      const [whole, paise] = n.replace(/,/g, '').split('.');
      const rupees = Number(whole).toLocaleString('en-IN');
      return paise && Number(paise) > 0 ? `${rupees} rupees and ${Number(paise)} paise` : `${rupees} rupees`;
    })
    .replace(/\bp\.a\./gi, 'per annum')
    .replace(/\bA\/C\b/g, 'account')
    .replace(/\bUTR\b/g, 'U T R')
    .replace(/\bFD\b/g, 'fixed deposit')
    .replace(/\bEMI\b/g, 'E M I')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function useVoice(opts: { onTranscript: (text: string) => void }) {
  const { onTranscript } = opts;
  const recognitionSupported = !!getRecognition();
  const synthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [voiceReplies, setVoiceRepliesState] = useState<boolean>(() => safeStorage.getItem(VOICE_PREF_KEY) === '1');
  const recRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const setVoiceReplies = useCallback((v: boolean) => {
    setVoiceRepliesState(v);
    safeStorage.setItem(VOICE_PREF_KEY, v ? '1' : '0');
    if (!v && synthesisSupported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [synthesisSupported]);

  /* ---------------- speech → text ---------------- */

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
    setInterim('');
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    if (synthesisSupported) window.speechSynthesis.cancel(); // don't transcribe Zora's own voice
    const rec = new Ctor();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = '';
    rec.onresult = (e: any) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else live += r[0].transcript;
      }
      setInterim(live || finalText);
    };
    rec.onerror = () => {
      setListening(false);
      setInterim('');
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
      const said = finalText.trim();
      if (said) onTranscriptRef.current(said);
    };

    recRef.current = rec;
    setInterim('');
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [synthesisSupported]);

  /* ---------------- text → speech ---------------- */

  const pickVoice = useCallback(() => {
    if (!synthesisSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => /en-IN/i.test(v.lang) && /female|Veena|Rishi|Google/i.test(v.name)) ||
      voices.find((v) => /en-IN/i.test(v.lang)) ||
      voices.find((v) => /en-GB/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      null
    );
  }, [synthesisSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!synthesisSupported || !voiceReplies) return;
      const clean = toSpeakable(text);
      if (!clean) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || 'en-IN';
      u.rate = 1.02;
      u.pitch = 1.05;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [synthesisSupported, voiceReplies, pickVoice]
  );

  const stopSpeaking = useCallback(() => {
    if (!synthesisSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [synthesisSupported]);

  // Voices load asynchronously in some browsers; warm the list.
  useEffect(() => {
    if (!synthesisSupported) return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener?.('voiceschanged', warm);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', warm);
      window.speechSynthesis.cancel();
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, [synthesisSupported]);

  return {
    recognitionSupported,
    synthesisSupported,
    listening,
    interim,
    speaking,
    voiceReplies,
    setVoiceReplies,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
