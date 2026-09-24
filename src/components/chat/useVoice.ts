import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice for Zora.
 *
 *  Speech → text
 *    - Web Speech API when the browser has it (Chrome, Edge, Safari): the recogniser ends itself
 *      after a natural pause, which is our "the customer stopped talking" signal.
 *    - Otherwise the mic is recorded and sent to /api/voice/stt (ElevenLabs Scribe).
 *
 *  Text → speech
 *    - /api/voice/tts (ElevenLabs) sentence by sentence through ONE <audio> element that is
 *      unlocked during the customer's tap (browsers only allow sound after a gesture). The next
 *      sentence is prefetched while the current one plays; short pauses between sentences and
 *      paragraphs make it sound like a person rather than a reader.
 *    - Falls back to the browser's SpeechSynthesis when the server has no ElevenLabs key, and
 *      reports `audioBlocked` when the browser refuses playback so the UI can say so.
 *
 *  Hands-free mode chains the two: (greeting →) listen → send → speak → listen again. Talking
 *  over Zora stops her (barge-in). Pause freezes both until resumed.
 */


type RecognitionCtor = new () => any;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Turn chat markdown into something that sounds natural when read out. */
export function toSpeakable(text: string): string {
  return text
    .replace(/\[(?:INTENT|ACTION|SHOW):[^\]]*\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[•\-*]\s+/gm, '')
    .replace(/^\s*(\d+)[.)]\s+/gm, '$1. ')
    .replace(/•{2,}\s*(\d{4})/g, 'ending $1')
    .replace(/X{2,}\s*(\d{4})/g, 'ending $1')
    .replace(/₹\s?([\d,]+(?:\.\d+)?)/g, (_, n: string) => {
      const [whole, paise] = n.replace(/,/g, '').split('.');
      const rupees = Number(whole).toLocaleString('en-IN');
      return paise && Number(paise) > 0 ? `${rupees} rupees and ${Number(paise)} paise` : `${rupees} rupees`;
    })
    .replace(/\bp\.a\./gi, 'per annum')
    .replace(/\bA\/C\b/g, 'account')
    .replace(/\bUTR\b/g, 'U T R')
    .replace(/\bFD\b/g, 'fixed deposit')
    .replace(/\bRD\b/g, 'recurring deposit')
    .replace(/\bEMI\b/g, 'E M I')
    .replace(/\bIFSC\b/g, 'I F S C')
    .replace(/\bOTP\b/g, 'O T P')
    .replace(/\bUPI\b/g, 'U P I')
    .replace(/\bIMPS\b/g, 'I M P S')
    .replace(/\bNEFT\b/g, 'N E F T')
    .replace(/\bGST\b/g, 'G S T')
    .replace(/\bCIBIL\b/g, 'sibil')
    .replace(/\s[—–]\s/g, ', ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Split text into speakable sentences; returns [sentence, pauseAfterMs][]. */
function splitSentences(text: string): [string, number][] {
  const out: [string, number][] = [];
  const paragraphs = text.split(/\n{2,}/);
  paragraphs.forEach((para, pi) => {
    const parts = para.replace(/\n/g, ' ').match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [];
    parts.forEach((p, i) => {
      const s = p.trim();
      if (!s) return;
      const last = i === parts.length - 1;
      out.push([s, last && pi < paragraphs.length - 1 ? 420 : /[?!]$/.test(s) ? 260 : 170]);
    });
  });
  return out;
}

// 0.1 s of silence — used to unlock the audio element inside a user gesture
const SILENT_WAV =
  'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQ4AAAAAAAAAAAAAAAAAAAAAAA==';

interface QueueItem {
  text: string;
  pause: number;
  url?: Promise<string | null>;
}

export function useVoice(opts: { onTranscript: (text: string) => void }) {
  const { onTranscript } = opts;
  const recognitionSupported = !!getRecognition();
  const synthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const recorderSupported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [voiceReplies, setVoiceRepliesState] = useState<boolean>(false); // on only inside the voice session
  const [handsFree, setHandsFreeState] = useState(false);
  const [serverTts, setServerTts] = useState<boolean | null>(null);

  const recRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const handsFreeRef = useRef(false);
  const pausedRef = useRef(false);
  const voiceRepliesRef = useRef(voiceReplies);
  const listeningRef = useRef(false);
  const silentTurnsRef = useRef(0);
  const serverTtsRef = useRef<Promise<boolean> | null>(null);

  // playback
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const playingRef = useRef(false);
  const generationRef = useRef(0); // bumped on stop → in-flight items are dropped
  const utteranceOpenRef = useRef(false); // a streamed reply is still being written
  const onIdleRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    serverTtsRef.current = fetch('/api/voice/config')
      .then((r) => r.json())
      .then((d) => {
        const ok = !!d?.tts;
        setServerTts(ok);
        return ok;
      })
      .catch(() => {
        setServerTts(false);
        return false;
      });
  }, []);

  const setVoiceReplies = useCallback((v: boolean) => {
    voiceRepliesRef.current = v;
    setVoiceRepliesState(v);
  }, []);

  /* ---------------- audio element (unlocked inside a tap) ---------------- */

  const getAudioEl = useCallback(() => {
    if (!audioElRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      el.setAttribute('playsinline', 'true');
      audioElRef.current = el;
    }
    return audioElRef.current;
  }, []);

  /** Call from a click/tap handler so later programmatic playback is allowed (Safari, iOS, strict Chrome). */
  const unlockAudio = useCallback(() => {
    try {
      const el = getAudioEl();
      el.muted = true;
      el.src = SILENT_WAV;
      el.play()
        .then(() => {
          el.pause();
          el.muted = false;
          setAudioBlocked(false);
        })
        .catch(() => {
          el.muted = false;
        });
    } catch {
      /* ignore */
    }
  }, [getAudioEl]);

  /* ---------------- text → speech ---------------- */

  const stopSpeaking = useCallback(() => {
    generationRef.current += 1;
    queueRef.current = [];
    utteranceOpenRef.current = false;
    const el = audioElRef.current;
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    if (synthesisSupported) window.speechSynthesis.cancel();
    playingRef.current = false;
    setSpeaking(false);
  }, [synthesisSupported]);

  const fetchAudioUrl = useCallback(async (text: string, gen: number): Promise<string | null> => {
    try {
      const r = await fetch('/api/voice/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!r.ok) return null;
      const blob = await r.blob();
      if (gen !== generationRef.current) return null;
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, []);

  const playUrl = useCallback(
    (url: string, gen: number) =>
      new Promise<'ok' | 'blocked' | 'error'>((resolve) => {
        const el = getAudioEl();
        let settled = false;
        const done = (r: 'ok' | 'blocked' | 'error') => {
          if (settled) return;
          settled = true;
          el.onended = null;
          el.onerror = null;
          resolve(r);
        };
        el.onended = () => done('ok');
        el.onerror = () => done('error');
        el.src = url;
        el.muted = false;
        el.volume = 1;
        const p = el.play();
        if (p && typeof p.catch === 'function') {
          p.catch((err: any) => {
            if (gen !== generationRef.current) return done('ok');
            done(err?.name === 'NotAllowedError' ? 'blocked' : 'error');
          });
        }
      }),
    [getAudioEl]
  );

  const speakWithBrowser = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!synthesisSupported) return resolve();
        const u = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const v = voices.find((x) => /en-IN/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang)) || null;
        if (v) u.voice = v;
        u.lang = v?.lang || 'en-IN';
        u.rate = 1.03;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      }),
    [synthesisSupported]
  );

  const finishedSpeaking = useCallback(() => {
    playingRef.current = false;
    setSpeaking(false);
    onIdleRef.current?.();
  }, []);

  const pump = useCallback(async () => {
    if (playingRef.current) return;
    playingRef.current = true;
    setSpeaking(true);
    const gen = generationRef.current;
    const useServer = (await serverTtsRef.current) ?? false;
    while (queueRef.current.length > 0 && gen === generationRef.current) {
      const item = queueRef.current.shift()!;
      // prefetch the next sentence while this one plays
      const next = queueRef.current[0];
      if (next && !next.url && useServer) next.url = fetchAudioUrl(next.text, gen);

      const url = useServer ? await (item.url || fetchAudioUrl(item.text, gen)) : null;
      if (gen !== generationRef.current) break;
      let spoken = false;
      if (url) {
        const result = await playUrl(url, gen);
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
        if (result === 'ok') spoken = true;
        else if (result === 'blocked') setAudioBlocked(true);
      }
      if (gen !== generationRef.current) break;
      if (!spoken) await speakWithBrowser(item.text);
      if (gen !== generationRef.current) break;
      if (item.pause) await new Promise((r) => setTimeout(r, item.pause));
    }
    if (gen !== generationRef.current) return;
    if (utteranceOpenRef.current) {
      // the model is still writing — wait for more sentences without dropping the "speaking" state
      playingRef.current = false;
      return;
    }
    finishedSpeaking();
  }, [fetchAudioUrl, playUrl, speakWithBrowser, finishedSpeaking]);

  const enqueue = useCallback(
    (sentences: [string, number][]) => {
      if (!voiceRepliesRef.current || pausedRef.current) return;
      const gen = generationRef.current;
      for (const [text, pause] of sentences) {
        const item: QueueItem = { text, pause };
        if (queueRef.current.length === 0 && !playingRef.current) item.url = serverTtsRef.current?.then((ok) => (ok ? fetchAudioUrl(text, gen) : null)) ?? undefined;
        queueRef.current.push(item);
      }
      if (queueRef.current.length) void pump();
    },
    [fetchAudioUrl, pump]
  );

  /** Speak a complete reply. */
  const speak = useCallback(
    (text: string) => {
      if (!voiceRepliesRef.current) return;
      const clean = toSpeakable(text);
      if (!clean) return;
      stopSpeaking();
      utteranceOpenRef.current = false;
      enqueue(splitSentences(clean));
    },
    [enqueue, stopSpeaking]
  );

  /**
   * Speak a reply as it streams in. `push` receives raw deltas; complete sentences are voiced
   * as soon as they close, and `end` flushes whatever is left.
   */
  const beginUtterance = useCallback(() => {
    stopSpeaking();
    utteranceOpenRef.current = true;
    let buffer = '';
    let spokenAny = false;
    const flushComplete = () => {
      const m = buffer.match(/^([\s\S]*[.!?]["')\]]*)(\s+[\s\S]*|\s*)$/);
      if (!m) return;
      const done = m[1];
      const rest = buffer.slice(done.length);
      if (!rest.trim() && !/\n\s*$/.test(rest) && done.length < 40) return; // a bare "Hi." alone sounds clipped
      buffer = rest;
      const clean = toSpeakable(done);
      if (clean) {
        spokenAny = true;
        enqueue(splitSentences(clean));
      }
    };
    return {
      push(delta: string) {
        if (!voiceRepliesRef.current) return;
        buffer += delta;
        flushComplete();
      },
      end() {
        utteranceOpenRef.current = false;
        const clean = toSpeakable(buffer);
        buffer = '';
        if (clean) {
          spokenAny = true;
          enqueue(splitSentences(clean));
        } else if (!spokenAny || (!playingRef.current && queueRef.current.length === 0)) {
          if (!playingRef.current) finishedSpeaking();
        } else if (!playingRef.current && queueRef.current.length) {
          void pump();
        }
      },
    };
  }, [enqueue, pump, stopSpeaking, finishedSpeaking]);

  /* ---------------- speech → text ---------------- */

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    try {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
    setInterim('');
  }, []);

  const startListeningRef = useRef<(opts?: { bargeIn?: boolean }) => void>(() => {});

  const handleTranscript = useCallback((said: string) => {
    if (pausedRef.current) return;
    if (said) {
      silentTurnsRef.current = 0;
      onTranscriptRef.current(said);
    } else if (handsFreeRef.current) {
      // nothing heard — listen again a couple of times, then rest until tapped
      silentTurnsRef.current += 1;
      if (silentTurnsRef.current <= 2) setTimeout(() => !pausedRef.current && !playingRef.current && startListeningRef.current({ bargeIn: false }), 250);
      else silentTurnsRef.current = 0;
    }
  }, []);

  const listenWithRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

      // crude silence detection: stop ~1.1 s after the customer stops talking (max 15 s)
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let heard = false;
      let lastLoud = Date.now();
      const started = Date.now();
      const tick = setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        if (rms > 0.02) {
          heard = true;
          lastLoud = Date.now();
          setInterim('Listening…');
        }
        if ((heard && Date.now() - lastLoud > 1100) || Date.now() - started > 15000 || !listeningRef.current) {
          clearInterval(tick);
          if (rec.state === 'recording') rec.stop();
        }
      }, 100);

      rec.onstop = async () => {
        clearInterval(tick);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
        setListening(false);
        setInterim('');
        listeningRef.current = false;
        if (!heard || chunks.length === 0) return handleTranscript('');
        setTranscribing(true);
        try {
          const blob = new Blob(chunks, { type: mime || 'audio/webm' });
          const r = await fetch('/api/voice/stt', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
          const d = await r.json();
          handleTranscript(String(d?.text || '').trim());
        } catch {
          handleTranscript('');
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start(250);
    } catch {
      setListening(false);
      listeningRef.current = false;
    }
  }, [handleTranscript]);

  const startListening = useCallback(
    (o: { bargeIn?: boolean } = {}) => {
      if (pausedRef.current || listeningRef.current) return;
      if (o.bargeIn !== false) stopSpeaking(); // the customer tapped or spoke over Zora — never transcribe her voice
      listeningRef.current = true;
      setInterim('');
      setListening(true);

      const Ctor = getRecognition();
      if (!Ctor) {
        if (recorderSupported) void listenWithRecorder();
        else {
          setListening(false);
          listeningRef.current = false;
        }
        return;
      }
      const rec = new Ctor();
      rec.lang = 'en-IN';
      rec.interimResults = true;
      rec.continuous = false; // ends on its own after the speaker pauses → that is our "send" trigger
      rec.maxAlternatives = 1;

      let finalText = '';
      rec.onresult = (e: any) => {
        let live = '';
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else live += r[0].transcript;
        }
        setInterim((finalText + ' ' + live).trim());
      };
      rec.onerror = (e: any) => {
        listeningRef.current = false;
        setListening(false);
        setInterim('');
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          handsFreeRef.current = false;
          setHandsFreeState(false);
        }
      };
      rec.onend = () => {
        listeningRef.current = false;
        setListening(false);
        setInterim('');
        handleTranscript(finalText.trim());
      };

      recRef.current = rec;
      try {
        rec.start();
      } catch {
        setListening(false);
        listeningRef.current = false;
      }
    },
    [stopSpeaking, recorderSupported, listenWithRecorder, handleTranscript]
  );
  startListeningRef.current = startListening;

  /* ---------------- hands-free session ---------------- */

  /**
   * Start or stop the conversation loop. With a greeting, Zora speaks first and opens the mic
   * when she is done (which also proves the speaker works).
   */
  const setHandsFree = useCallback(
    (v: boolean, o: { greeting?: string } = {}) => {
      handsFreeRef.current = v;
      setHandsFreeState(v);
      pausedRef.current = false;
      setPaused(false);
      silentTurnsRef.current = 0;
      if (v) {
        unlockAudio();
        if (!voiceRepliesRef.current) setVoiceReplies(true);
        if (o.greeting) speak(o.greeting);
        else startListeningRef.current({ bargeIn: true });
      } else {
        stopListening();
        stopSpeaking();
        setVoiceReplies(false); // Zora only talks back inside the voice session
      }
    },
    [unlockAudio, setVoiceReplies, speak, stopListening, stopSpeaking]
  );

  /** Freeze the session (mic and voice) without ending it. */
  const setPausedSession = useCallback(
    (v: boolean) => {
      pausedRef.current = v;
      setPaused(v);
      if (v) {
        stopListening();
        stopSpeaking();
      } else if (handsFreeRef.current) {
        unlockAudio();
        startListeningRef.current({ bargeIn: true });
      }
    },
    [stopListening, stopSpeaking, unlockAudio]
  );

  // When Zora finishes speaking in hands-free mode, open the mic again.
  onIdleRef.current = () => {
    if (handsFreeRef.current && !pausedRef.current && !listeningRef.current) {
      setTimeout(() => handsFreeRef.current && !pausedRef.current && !listeningRef.current && !playingRef.current && startListeningRef.current({ bargeIn: false }), 200);
    }
  };

  useEffect(
    () => () => {
      stopSpeaking();
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [stopSpeaking]
  );

  return {
    recognitionSupported: recognitionSupported || recorderSupported,
    synthesisSupported: synthesisSupported || serverTts === true,
    naturalVoice: serverTts === true,
    audioBlocked,
    listening,
    interim,
    speaking,
    transcribing,
    paused,
    voiceReplies,
    setVoiceReplies,
    handsFree,
    setHandsFree,
    setPaused: setPausedSession,
    startListening: () => startListening({ bargeIn: true }),
    stopListening,
    speak,
    beginUtterance,
    stopSpeaking,
    unlockAudio,
  };
}
