import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDashboardSnapshot } from '../data/dashboardSnapshot';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Send,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  PiggyBank,
  ArrowLeftRight,
  Coins,
  FileText,
  ShieldAlert,
  HelpCircle,
  Landmark,
  Building2,
  TrendingUp,
  Wallet,
  PhoneCall,
  RotateCcw,
  Mic,
  Square,
  Volume2,
  VolumeX,
  Headphones,
} from 'lucide-react';
import { useVoice } from './chat/useVoice';
import { UserSession, CoreCreditCard, PaymentSession, NavTab } from '../types';
import { ZORA_CATEGORIES, ZoraQuestionItem, searchZoraKnowledge } from '../data/zoraKnowledge';
import { ZoraMark } from './ui/Primitives';
import { StreamingText, TypingIndicator, RichText } from './chat/ChatText';
import { ChatPaymentFlow, PaymentReceipt } from './chat/ChatPaymentFlow';
import { MobilePhoneSimulatorModal } from './chat/MobilePhoneSimulatorModal';
import { OutcomeCard, Outcome } from './chat/OutcomeCard';
import { VoiceSession, OrbState } from './chat/VoiceSession';
import { useBank } from '../store/BankStore';
import { rateFor, fdMaturity, FD_MIN_AMOUNT } from '../data/depositRates';
import { formatINR, firstName } from '../utils/format';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ActionType = NonNullable<ZoraQuestionItem['actionType']>;

type Attachment =
  | { kind: 'pay-flow'; flowId: string }
  | { kind: 'products' }
  | { kind: 'suggestions'; items: string[] }
  | { kind: 'action'; label: string; type: ActionType };

interface ChatMsg {
  id: string;
  role: 'user' | 'zora';
  text: string;
  /** canned reply revealing word by word */
  streaming?: boolean;
  /** live answer still arriving from the model */
  live?: boolean;
  attachment?: Attachment;
  /** final result shown as a card (and in the voice session) */
  outcome?: Outcome;
}

interface ChatAction {
  type: 'OPEN_FD' | 'CHEQUE_BOOK' | 'PAY_CARD' | 'REQUEST';
  params: Record<string, string>;
}

const REQUEST_TYPES: Record<string, { label: string; eta: string }> = {
  address_update: { label: 'Address update', eta: '3 working days' },
  mobile_update: { label: 'Mobile number update', eta: '1 working day' },
  nominee_update: { label: 'Nominee update', eta: '2 working days' },
  stop_cheque: { label: 'Stop cheque', eta: 'Instant' },
  balance_letter: { label: 'Balance confirmation letter', eta: '1 working day' },
  locker: { label: 'Safe deposit locker', eta: '2 working days' },
  tds_certificate: { label: 'Interest & TDS certificate', eta: 'Instant' },
  statement: { label: 'Account statement', eta: 'Instant' },
};

const plainText = (t: string) =>
  t
    .replace(/\*\*/g, '')
    .replace(/^\s*[•\-*]\s+/gm, '')
    .replace(/\s*\n+\s*/g, ' ')
    .trim();

interface NexoraAiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  user: UserSession | null;
  onOpenGrievance?: () => void;
}

const STARTER_PROMPTS = [
  'What is my credit card due?',
  'Pay my credit card bill',
  'Any updates for me?',
  'What are the latest FD rates?',
];

const PRODUCTS: { label: string; icon: React.ElementType; prompt: string }[] = [
  { label: 'Savings', icon: Building2, prompt: 'Tell me about my savings account' },
  { label: 'Current A/C', icon: Landmark, prompt: 'Tell me about my current account' },
  { label: 'Fixed Deposit', icon: PiggyBank, prompt: 'Tell me about my fixed deposit' },
  { label: 'Credit Card', icon: CreditCard, prompt: 'Tell me about my credit card' },
  { label: 'Personal Loan', icon: Coins, prompt: 'Tell me about my personal loan and EMI' },
  { label: 'Mutual Funds', icon: TrendingUp, prompt: 'How are my mutual fund investments doing?' },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'debit-cards': Wallet,
  'credit-cards': CreditCard,
  'fixed-deposits': PiggyBank,
  transfers: ArrowLeftRight,
  loans: Coins,
  'cheque-services': FileText,
  'support-grievance': ShieldAlert,
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Lets other parts of the portal navigate / prompt Zora without prop-drilling. */
export const zoraEvents = {
  prompt: (prompt: string) => window.dispatchEvent(new CustomEvent('zora:prompt', { detail: { prompt } })),
  navigate: (tab: NavTab) => window.dispatchEvent(new CustomEvent('ib:navigate', { detail: { tab } })),
};

/* ------------------------------------------------------------------ */

export const NexoraAiAssistant: React.FC<NexoraAiAssistantProps> = ({ isOpen, onClose, onToggle, user, onOpenGrievance }) => {
  const name = firstName(user?.name || 'there');

  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: uid(),
      role: 'zora',
      text: `Hi ${name}, I'm Zora — your India Bank assistant. I can show your balances, help you pay your credit card bill, explain products, or lodge a grievance for you.`,
      attachment: { kind: 'suggestions', items: STARTER_PROMPTS },
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [card, setCard] = useState<CoreCreditCard | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guideCategory, setGuideCategory] = useState<string | null>(null);
  const [simulatorTxn, setSimulatorTxn] = useState<string | null>(null);
  const [voiceSession, setVoiceSession] = useState(false);
  const bank = useBank();
  const [externalReceipts, setExternalReceipts] = useState<Record<string, PaymentReceipt>>({});
  const activeQrFlow = useRef<{ flowId: string; session: PaymentSession } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamingSomething = messages.some((m) => m.streaming || m.live);
  const busy = thinking || streamingSomething;

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, thinking, scrollToBottom]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Pull the live card ledger once so the pay-flow has accurate defaults
  useEffect(() => {
    fetch('/api/banking/credit-card')
      .then((r) => r.json())
      .then((d) => d?.card && setCard(d.card))
      .catch(() => {});
  }, []);

  /* ---------------- sending ---------------- */

  // Voice: what the customer says is sent as a message; Zora's replies can be read aloud
  const sendRef = useRef<(t: string) => void>(() => {});
  const voice = useVoice({ onTranscript: (t) => sendRef.current(t) });
  const { speak, stopSpeaking, beginUtterance } = voice;

  useEffect(() => {
    if (!isOpen) stopSpeaking();
  }, [isOpen, stopSpeaking]);

  const pushZora = useCallback(
    (text: string, attachment?: Attachment, outcome?: Outcome) => {
      setMessages((prev) => [...prev, { id: uid(), role: 'zora', text, streaming: true, attachment, outcome }]);
      speak(text);
    },
    [speak]
  );

  const setOutcome = useCallback((msgId: string, outcome: Outcome) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, outcome } : m)));
  }, []);

  /** Executes an action Zora committed to (after the customer confirmed) and pins the result to the message. */
  const runAction = useCallback(
    async (action: ChatAction, msgId: string) => {
      const p = action.params;
      try {
        if (action.type === 'OPEN_FD') {
          const amount = Number(p.amount);
          const months = Math.max(3, Math.min(60, Number(p.months) || 12));
          if (!amount || amount < FD_MIN_AMOUNT) return setOutcome(msgId, { type: 'error', title: 'Deposit not booked', body: `The minimum fixed deposit is ₹${FD_MIN_AMOUNT.toLocaleString('en-IN')}.` });
          const ratePct = rateFor(months);
          const acct = bank.openDeposit({ kind: 'FD', amount, tenureMonths: months, ratePct });
          if (!acct) return setOutcome(msgId, { type: 'error', title: 'Deposit not booked', body: 'Insufficient balance in your savings account.' });
          return setOutcome(msgId, { type: 'fd', account: acct, ratePct, maturityValue: fdMaturity(amount, months, ratePct) });
        }
        if (action.type === 'CHEQUE_BOOK') {
          const leaves = ['25', '50', '100'].includes(p.leaves) ? p.leaves : '25';
          const account = p.account === 'current' ? 'Current AC1000235678' : 'Savings AC1000231234';
          const delivery = p.delivery === 'branch' ? 'Pickup at Nariman Point branch' : 'Registered address · 14B Marine Drive, Mumbai';
          const req = bank.createRequest('Cheque book', `${leaves} leaves · ${account} · ${delivery}`, '4 working days');
          return setOutcome(msgId, { type: 'request', request: req });
        }
        if (action.type === 'REQUEST') {
          const meta = REQUEST_TYPES[p.type] || { label: (p.type || 'Service request').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), eta: '2 working days' };
          const req = bank.createRequest(meta.label, p.note || 'Raised via Zora', meta.eta);
          return setOutcome(msgId, { type: 'request', request: req });
        }
        if (action.type === 'PAY_CARD') {
          const amount = Number(p.amount) || card?.outstandingBalance || 0;
          if (amount <= 0) return setOutcome(msgId, { type: 'error', title: 'Nothing to pay', body: 'There is no outstanding balance on the card.' });
          if (p.method === 'qr') {
            const res = await fetch('/api/payment/create-qr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, origin: window.location.origin }) });
            const data = await res.json();
            if (!data?.success || !data.session) throw new Error('qr');
            activeQrFlow.current = { flowId: msgId, session: data.session };
            return setOutcome(msgId, { type: 'qr', session: data.session });
          }
          const res = await fetch('/api/payment/direct-pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, method: 'India Bank Primary Savings (AC1000231234)', otp: '4920' }),
          });
          const data = await res.json();
          if (!data?.success || !data.card) throw new Error('pay');
          setCard(data.card);
          seenReceipts.current.add(data.utr);
          window.dispatchEvent(new CustomEvent('ib:card-updated'));
          return setOutcome(msgId, { type: 'receipt', amount: data.amount, utr: data.utr, method: 'Savings account direct debit', card: data.card });
        }
      } catch {
        setOutcome(msgId, { type: 'error', title: 'Could not complete that', body: 'The banking server did not respond. Please try again or use the Cards page.' });
      }
    },
    [bank, card, setOutcome]
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      stopSpeaking();
      setInput('');
      setShowGuide(false);
      const history = messages.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));
      setMessages((prev) => [...prev, { id: uid(), role: 'user', text }]);
      setThinking(true);

      const attachmentFor = (intent: string | null | undefined, cardState: CoreCreditCard | null): Attachment | undefined => {
        if (intent === 'PAY_CREDIT_CARD') return { kind: 'pay-flow', flowId: uid() };
        if (intent === 'ACCOUNT_SUMMARY') return { kind: 'products' };
        if (intent === 'CARD_DUE')
          return (cardState?.outstandingBalance ?? 1) > 0
            ? { kind: 'action', label: 'Pay this bill', type: 'pay_cc' }
            : { kind: 'suggestions', items: ['Show my account summary', 'Any updates for me?'] };
        if (intent === 'UPDATES')
          return { kind: 'suggestions', items: ['Pay my credit card bill', 'Tell me about my fixed deposit', 'What penalty is charged if I miss the due date?'] };
        const kb = searchZoraKnowledge(text);
        const q = kb.matchedQuestion;
        if (q?.actionType && q.actionLabel) return { kind: 'action', label: q.actionLabel, type: q.actionType };
        return undefined;
      };

      const body = JSON.stringify({ message: text, history, user, dashboard: getDashboardSnapshot(), voice: voiceSession || voice.handsFree || voice.listening });
      const msgId = uid();
      const utterance = voice.voiceReplies ? beginUtterance() : null;
      let started = false;
      let full = '';

      try {
        // Stream the answer token by token; the first words land in a few hundred milliseconds.
        const res = await fetch('/api/ai/chat/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let finished = false;
        while (!finished) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const frames = buf.split('\n\n');
          buf = frames.pop() || '';
          for (const frame of frames) {
            const line = frame.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            let evt: any;
            try {
              evt = JSON.parse(line.slice(6));
            } catch {
              continue;
            }
            if (evt.delta) {
              if (!started) {
                started = true;
                setThinking(false);
                setMessages((prev) => [...prev, { id: msgId, role: 'zora', text: '', live: true }]);
              }
              full += evt.delta;
              utterance?.push(evt.delta);
              setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: full } : m)));
              scrollToBottom();
            }
            if (evt.done) {
              finished = true;
              if (evt.card) setCard(evt.card);
              const finalText = (evt.text as string) || full || 'I could not process that right now. Please try again.';
              const action: ChatAction | null = evt.action || null;
              const attachment = action ? undefined : attachmentFor(evt.intent, evt.card || card);
              let outcome: Outcome | undefined;
              if (!action && evt.intent === 'CARD_DUE' && (evt.card || card)) outcome = { type: 'card-due', card: evt.card || card };
              if (!action && evt.intent === 'ACCOUNT_SUMMARY') outcome = { type: 'summary', accounts: bank.accounts, card: evt.card || card };
              if (!action && Array.isArray(evt.display) && evt.display.length) outcome = { type: 'facts', sections: evt.display };
              setThinking(false);
              if (!started) setMessages((prev) => [...prev, { id: msgId, role: 'zora', text: finalText, live: false, attachment, outcome }]);
              else setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: finalText, live: false, attachment, outcome } : m)));
              utterance?.end();
              if (!utterance && !started) speak(finalText);
              if (action) void runAction(action, msgId);
            }
          }
        }
        if (!finished) {
          if (!started) throw new Error('stream ended early');
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, live: false } : m)));
          utterance?.end();
        }
      } catch {
        if (started) {
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, live: false } : m)));
          utterance?.end();
          return;
        }
        utterance?.end();
        // Streaming unavailable — one plain request instead
        try {
          const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
          const data = await res.json();
          if (data?.card) setCard(data.card);
          const reply: string = data?.text || data?.reply || 'I could not process that right now. Please try again.';
          setThinking(false);
          pushZora(reply, attachmentFor(data?.intent, data?.card || card));
        } catch {
          setThinking(false);
          pushZora('I am having trouble reaching the banking servers. Please try again in a moment, or call 1800 202 6161.');
        }
      }
    },
    [busy, messages, user, card, pushZora, stopSpeaking, speak, beginUtterance, voice.voiceReplies, voice.handsFree, voice.listening, voiceSession, scrollToBottom, bank.accounts, runAction]
  );
  sendRef.current = send;

  // External prompts (e.g. "Pay now" on the dashboard)
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent).detail?.prompt;
      if (prompt) setTimeout(() => send(prompt), 250);
    };
    window.addEventListener('zora:prompt', handler);
    return () => window.removeEventListener('zora:prompt', handler);
  }, [send]);

  const finishStreaming = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, streaming: false } : m)));
  };

  const handleAction = (type: ActionType) => {
    switch (type) {
      case 'pay_cc':
        send('Pay my credit card bill');
        return;
      case 'grievance':
        onOpenGrievance?.();
        return;
      case 'call':
        window.open('tel:18002026161');
        return;
      case 'apply_debit':
      case 'apply_credit':
      case 'cards':
        zoraEvents.navigate('cards');
        break;
      case 'open_fd':
        zoraEvents.navigate('investments');
        break;
      case 'transfer':
        zoraEvents.navigate('transfers');
        break;
      case 'statement':
        zoraEvents.navigate('accounts');
        break;
    }
    onClose();
  };

  const seenReceipts = useRef<Set<string>>(new Set());
  const handlePaymentDone = (r: PaymentReceipt) => {
    // The same QR payment can be reported by SSE and by the simulator — confirm once.
    if (seenReceipts.current.has(r.utr)) return;
    seenReceipts.current.add(r.utr);
    setCard(r.card);
    window.dispatchEvent(new CustomEvent('ib:card-updated'));
    pushZora(
      `Done! I've received your payment of **${formatINR(r.amount)}** towards your ${r.card.cardName} (${r.card.maskedNumber}). Your updated outstanding is ${formatINR(r.card.outstandingBalance)}. A confirmation SMS and e-receipt are on their way. Anything else I can help with?`,
      { kind: 'suggestions', items: ['Show my account summary', 'Download my statement', 'What are the FD rates?'] },
      { type: 'receipt', amount: r.amount, utr: r.utr, method: r.method, card: r.card }
    );
  };

  const startVoiceSession = () => {
    setShowGuide(false);
    voice.unlockAudio(); // inside the tap, so the browser lets Zora speak
    setVoiceSession(true);
    voice.setHandsFree(true, { greeting: `Hi ${name}, this is Zora. I'm listening — how can I help you today?` });
  };
  const endVoiceSession = useCallback(() => {
    setVoiceSession(false);
    voice.setHandsFree(false);
  }, [voice]);

  const orbState: OrbState = voice.paused ? 'paused' : voice.listening ? 'listening' : voice.speaking ? 'speaking' : thinking || streamingSomething || voice.transcribing ? 'thinking' : 'idle';
  const lastZoraMsg = [...messages].reverse().find((m) => m.role === 'zora' && !m.live)?.text;
  // Only the outcome of the latest answer is shown; asking something new clears it.
  const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user');
  const voiceOutcomes = messages
    .slice(lastUserIdx + 1)
    .filter((m) => m.role === 'zora' && m.outcome)
    .reverse()
    .slice(0, 1)
    .map((m) => ({ id: m.id, outcome: m.outcome! }));

  const resetChat = () => {
    setMessages([
      {
        id: uid(),
        role: 'zora',
        text: `Fresh start, ${name}. What would you like to do today?`,
        attachment: { kind: 'suggestions', items: STARTER_PROMPTS },
      },
    ]);
  };

  const guideQuestions = useMemo(
    () => ZORA_CATEGORIES.find((c) => c.id === guideCategory)?.questions || [],
    [guideCategory]
  );

  /* ---------------- render ---------------- */

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="launcher"
            type="button"
            onClick={onToggle}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] lg:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-[var(--shadow-lg)] cursor-pointer"
            aria-label="Ask Zora"
          >
            <ZoraMark size={40} />
            <span className="text-left leading-tight">
              <span className="text-sm font-bold text-slate-900 block">Ask Zora</span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online · 24x7
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
      {isOpen && (
        <motion.div
          key="panel"
          role="dialog"
          aria-label="Zora assistant"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-40 sm:w-[400px] sm:h-[660px] sm:max-h-[calc(100vh-48px)] bg-white sm:rounded-3xl sm:border sm:border-slate-200 shadow-[var(--shadow-lg)] flex flex-col overflow-hidden"
          style={{ transformOrigin: 'bottom right' }}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 bg-white flex items-center gap-2.5">
            <span className={`relative rounded-full shrink-0 ${voice.speaking ? 'ring-4 ring-indigo-500/25' : ''}`}>
              <ZoraMark size={36} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">Zora</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded whitespace-nowrap">AI</span>
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${voice.listening ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                {voice.speaking ? 'Speaking…' : voice.listening ? 'Listening…' : voice.transcribing ? 'Transcribing…' : thinking ? 'Thinking…' : 'Secure session · 24x7'}
              </span>
            </div>
            {voice.recognitionSupported && voice.synthesisSupported && (
              <button
                type="button"
                onClick={startVoiceSession}
                title="Talk to Zora — hands-free voice session"
                className="h-9 pl-3 pr-3.5 rounded-full bg-slate-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 shrink-0"
              >
                <Headphones className="w-4 h-4" /> Talk
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Body */}
          <div className="relative flex-1 min-h-0">
            <div ref={listRef} className="ib-scroll h-full overflow-y-auto px-4 py-4 space-y-4 bg-[#F7F8FC]">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}
                >
                  {m.role === 'zora' && <ZoraMark size={28} className="mt-1" />}
                  <div className={`max-w-[85%] space-y-2 ${m.role === 'user' ? 'items-end' : ''}`}>
                    <div
                      className={`px-3.5 py-2.5 text-[13px] ${
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
                          : 'bg-white text-slate-700 border border-slate-200 rounded-2xl rounded-bl-md'
                      }`}
                    >
                      {m.role === 'zora' && m.live ? (
                        <span className="ib-cursor">
                          <RichText text={m.text} />
                        </span>
                      ) : m.role === 'zora' ? (
                        <StreamingText
                          text={m.text}
                          active={!!m.streaming}
                          onTick={scrollToBottom}
                          onDone={() => finishStreaming(m.id)}
                        />
                      ) : (
                        <RichText text={m.text} />
                      )}
                    </div>

                    {m.role === 'zora' && !m.live && m.outcome && (
                      <div className="ib-fade-up">
                        <OutcomeCard
                          outcome={m.outcome}
                          compact
                          onPay={() => send('Pay my credit card bill')}
                          onQrPaid={(sess, c) => handlePaymentDone({ amount: sess.amount, utr: sess.utr || 'UTR-INB-00000000', method: sess.paymentMethod || 'UPI QR', card: c })}
                          onOpenSimulator={(txn) => {
                            if (m.outcome?.type === 'qr') activeQrFlow.current = { flowId: m.id, session: m.outcome.session };
                            setSimulatorTxn(txn);
                          }}
                        />
                      </div>
                    )}

                    {/* Attachments appear once the answer has finished */}
                    {m.role === 'zora' && !m.streaming && !m.live && m.attachment && (
                      <div className="ib-fade-up">
                        {m.attachment.kind === 'suggestions' && (
                          <div className="flex flex-wrap gap-1.5">
                            {m.attachment.items.map((s) => (
                              <button
                                key={s}
                                type="button"
                                disabled={busy}
                                onClick={() => send(s)}
                                className="ib-chip bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}

                        {m.attachment.kind === 'products' && (
                          <div className="grid grid-cols-3 gap-1.5">
                            {PRODUCTS.map((p) => {
                              const Icon = p.icon;
                              return (
                                <button
                                  key={p.label}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => send(p.prompt)}
                                  className="ib-card p-2.5 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                                >
                                  <Icon className="w-4 h-4 text-indigo-600 mx-auto" />
                                  <span className="text-[11px] font-semibold text-slate-800 block mt-1 leading-tight">{p.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {m.attachment.kind === 'action' && (
                          <button
                            type="button"
                            onClick={() => handleAction((m.attachment as any).type)}
                            className="ib-btn-dark text-xs px-3.5 py-2"
                          >
                            {m.attachment.label} <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {m.attachment.kind === 'pay-flow' && (
                          <ChatPaymentFlow
                            initialCard={card}
                            cardHolder={user?.name || 'SHIVANSH MISHRA'}
                            onCompleted={handlePaymentDone}
                            externalReceipt={externalReceipts[(m.attachment as any).flowId] || null}
                            onQrSession={(s) => {
                              activeQrFlow.current = { flowId: (m.attachment as any).flowId, session: s };
                            }}
                            onOpenSimulator={(txn) => setSimulatorTxn(txn)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {thinking && (
                <div className="flex gap-2.5 ib-fade-up">
                  <ZoraMark size={28} className="mt-0.5" />
                  <TypingIndicator />
                </div>
              )}
            </div>

            {/* Questions guide drawer */}
            {showGuide && (
              <div className="absolute inset-0 bg-white flex flex-col ib-fade-up">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  {guideCategory ? (
                    <button
                      type="button"
                      onClick={() => setGuideCategory(null)}
                      className="p-1 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  ) : (
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                  )}
                  <span className="text-sm font-bold text-slate-900">
                    {guideCategory ? ZORA_CATEGORIES.find((c) => c.id === guideCategory)?.name : 'What can I ask Zora?'}
                  </span>
                </div>
                <div className="ib-scroll flex-1 overflow-y-auto p-3 space-y-1.5">
                  {!guideCategory
                    ? ZORA_CATEGORIES.map((c) => {
                        const Icon = CATEGORY_ICONS[c.id] || HelpCircle;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setGuideCategory(c.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-left cursor-pointer"
                          >
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-semibold text-slate-900 block">{c.name}</span>
                              <span className="text-xs text-slate-500">{c.questions.length} questions</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>
                        );
                      })
                    : guideQuestions.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => send(q.question)}
                          className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left cursor-pointer"
                        >
                          <span className="text-[13px] font-medium text-slate-800 block">{q.question}</span>
                          {q.badge && (
                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                              {q.badge}
                            </span>
                          )}
                        </button>
                      ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="px-3 py-3 border-t border-slate-100 bg-white"
          >
            <div
              className={`flex items-center gap-2 bg-slate-50 border rounded-2xl pl-4 pr-1.5 py-1.5 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all ${
                voice.listening ? 'border-rose-300 ring-4 ring-rose-500/10' : 'border-slate-200'
              }`}
            >
              <input
                ref={inputRef}
                value={voice.listening ? voice.interim : input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={voice.listening ? 'Listening… speak now' : busy ? 'Zora is replying…' : 'Ask or tap the mic…'}
                disabled={busy || voice.listening}
                readOnly={voice.listening}
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none py-1.5 disabled:opacity-60"
              />
              {voice.recognitionSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (voice.listening) voice.stopListening();
                    else {
                      voice.unlockAudio();
                      voice.startListening();
                    }
                  }}
                  disabled={busy}
                  aria-pressed={voice.listening}
                  aria-label={voice.listening ? 'Stop listening' : 'Speak to Zora'}
                  title={voice.listening ? 'Stop listening' : 'Speak to Zora'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 ${
                    voice.listening ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {voice.listening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 cursor-pointer transition-colors"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
              <div className="flex items-center gap-0.5 -ml-1">
                <button type="button" onClick={() => setShowGuide((v) => !v)} title="Questions guide" aria-pressed={showGuide} className={`h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors ${showGuide ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                  <BookOpen className="w-3.5 h-3.5" /> Guide
                </button>
                <button type="button" onClick={resetChat} title="New conversation" className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> New
                </button>
              </div>
              <span className="inline-flex items-center gap-1 pr-1">
                <PhoneCall className="w-3 h-3" /> 1800 202 6161
              </span>
            </div>
          </form>
        </motion.div>
      )}
      </AnimatePresence>

      <VoiceSession
        open={voiceSession}
        state={orbState}
        caption={voiceSession && lastZoraMsg && lastUserIdx >= 0 && messages.findIndex((m) => m.text === lastZoraMsg) > lastUserIdx ? plainText(lastZoraMsg).slice(0, 220) : undefined}
        outcomes={voiceOutcomes}
        micAvailable={voice.recognitionSupported}
        audioBlocked={voice.audioBlocked}
        onTapOrb={() => {
          if (voice.paused) voice.setPaused(false);
          else if (voice.listening) voice.stopListening();
          else {
            voice.unlockAudio();
            voice.startListening();
          }
        }}
        onTogglePause={() => voice.setPaused(!voice.paused)}
        onEnableAudio={() => {
          voice.unlockAudio();
          voice.speak('Sound is on. How can I help?');
        }}
        onEnd={endVoiceSession}
        onPay={() => send('Pay my credit card bill')}
        onQrPaid={(sess, c) => handlePaymentDone({ amount: sess.amount, utr: sess.utr || 'UTR-INB-00000000', method: sess.paymentMethod || 'UPI QR', card: c })}
        onOpenSimulator={(txn) => setSimulatorTxn(txn)}
      />

      {/* Phone simulator for QR scans started inside the chat */}
      <MobilePhoneSimulatorModal
        isOpen={Boolean(simulatorTxn)}
        onClose={() => setSimulatorTxn(null)}
        txnId={simulatorTxn || ''}
        onPaymentSuccess={(session, c) => {
          setSimulatorTxn(null);
          const flow = activeQrFlow.current;
          if (flow && c) {
            setExternalReceipts((prev) => ({
              ...prev,
              [flow.flowId]: {
                amount: session.amount,
                utr: session.utr || 'UTR-INB-00000000',
                method: session.paymentMethod || 'UPI QR (phone scan)',
                card: c,
              },
            }));
            handlePaymentDone({
              amount: session.amount,
              utr: session.utr || 'UTR-INB-00000000',
              method: session.paymentMethod || 'UPI QR (phone scan)',
              card: c,
            });
          }
        }}
      />
    </>
  );
};
