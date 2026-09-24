/**
 * Full-screen voice session with Zora.
 * The page softens behind a light frosted layer; a living orb sits in the upper third (it drifts
 * like a water drop while listening, turns slowly while thinking, and holds still while Zora
 * speaks). Only final outcomes — a due summary, a receipt, a QR, a booked FD, a raised request,
 * or the details behind a spoken headline — stack beneath it. Nothing the customer says is echoed.
 */
import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mic, MicOff, Pause, Play, PhoneOff, Volume2, VolumeX, Sparkles } from 'lucide-react';
import type { CoreCreditCard, PaymentSession } from '../../types';
import { OutcomeCard, Outcome } from './OutcomeCard';

export type OrbState = 'listening' | 'speaking' | 'thinking' | 'idle' | 'paused';

interface VoiceSessionProps {
  open: boolean;
  state: OrbState;
  caption?: string;
  outcomes: { id: string; outcome: Outcome }[];
  micAvailable: boolean;
  audioBlocked: boolean;
  onTapOrb: () => void;
  onTogglePause: () => void;
  onEnableAudio: () => void;
  onEnd: () => void;
  onPay?: () => void;
  onQrPaid?: (session: PaymentSession, card: CoreCreditCard) => void;
  onOpenSimulator?: (txnId: string) => void;
}

const STATUS: Record<OrbState, string> = {
  listening: 'Listening',
  speaking: 'Zora is speaking',
  thinking: 'Thinking',
  idle: 'Tap the orb to talk',
  paused: 'Paused',
};

export const VoiceSession: React.FC<VoiceSessionProps> = ({ open, state, caption, outcomes, micAvailable, audioBlocked, onTapOrb, onTogglePause, onEnableAudio, onEnd, onPay, onQrPaid, onOpenSimulator }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEnd();
      if (e.key === ' ' && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        onTogglePause();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onEnd, onTogglePause]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [outcomes.length]);

  const paused = state === 'paused';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[80] flex flex-col text-slate-900"
          style={{ background: 'rgba(246, 247, 251, 0.78)', backdropFilter: 'blur(14px) saturate(1.05)', WebkitBackdropFilter: 'blur(14px) saturate(1.05)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Voice session with Zora"
        >
          {/* soft light behind the orb */}
          <div className="pointer-events-none absolute left-1/2 top-[6%] -translate-x-1/2 w-[520px] h-[520px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.14), rgba(99,102,241,0) 62%)' }} />

          {/* top bar */}
          <div className="relative w-full max-w-3xl mx-auto px-5 pt-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Zora · voice session
            </span>
            <button onClick={onEnd} className="ib-btn-secondary h-10 py-0 text-sm">
              <PhoneOff className="w-4 h-4 text-rose-600" /> End session
            </button>
          </div>

          {/* orb + status */}
          <div className="relative flex flex-col items-center mt-4 sm:mt-8 shrink-0">
            <button
              type="button"
              onClick={onTapOrb}
              aria-label={state === 'listening' ? 'Stop listening' : 'Speak to Zora'}
              className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 rounded-full"
            >
              {state === 'speaking' && (
                <>
                  <span className="ib-orb-ring" />
                  <span className="ib-orb-ring" style={{ animationDelay: '0.9s' }} />
                </>
              )}
              <span className={`ib-orb ib-orb--${state}`} aria-hidden="true">
                <span className="ib-orb-core" />
                <span className="ib-orb-shine" />
              </span>
              {!micAvailable && (
                <span className="absolute -bottom-1 right-1 w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg" title="Microphone not available">
                  <MicOff className="w-4 h-4" />
                </span>
              )}
            </button>

            <motion.div key={state} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-5 inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-white/80 border border-slate-200/80 text-[13px] font-semibold text-slate-700 shadow-sm">
              {state === 'listening' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              {state === 'speaking' && <Volume2 className="w-3.5 h-3.5 text-indigo-600" />}
              {state === 'thinking' && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
              {paused && <Pause className="w-3.5 h-3.5 text-slate-500" />}
              {STATUS[state]}
            </motion.div>

            {audioBlocked && (
              <button onClick={onEnableAudio} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg cursor-pointer">
                <VolumeX className="w-3.5 h-3.5" /> Your browser blocked sound — tap to enable Zora's voice
              </button>
            )}
          </div>

          {/* spoken line + outcomes */}
          <div ref={listRef} className="relative w-full max-w-xl mx-auto flex-1 min-h-0 overflow-y-auto ib-scroll px-5 pt-5 pb-36 space-y-3">
            <AnimatePresence initial={false}>
              {caption && (
                <motion.p key={caption.slice(0, 48)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center text-[15px] leading-relaxed text-slate-600 px-2">
                  {caption}
                </motion.p>
              )}
              {outcomes.map((o, i) => (
                <motion.div
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1 - Math.min(i, 3) * 0.14, y: 0, scale: 1 - i * 0.012 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="text-left"
                >
                  <OutcomeCard outcome={o.outcome} voice onPay={onPay} onQrPaid={onQrPaid} onOpenSimulator={onOpenSimulator} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* bottom controls */}
          <div className="absolute inset-x-0 bottom-0 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 flex items-center justify-center gap-3 bg-gradient-to-t from-white/90 to-transparent">
            <button onClick={onTogglePause} className={`h-12 px-5 rounded-full inline-flex items-center gap-2 text-sm font-semibold border transition-colors cursor-pointer active:scale-95 shadow-sm ${paused ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'}`}>
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={onTapOrb}
              disabled={paused}
              aria-pressed={state === 'listening'}
              className={`w-14 h-14 rounded-full inline-flex items-center justify-center border transition-colors cursor-pointer active:scale-95 shadow-md disabled:opacity-40 ${state === 'listening' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'}`}
              title={state === 'listening' ? 'Stop listening' : 'Talk'}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button onClick={onEnd} className="h-12 px-5 rounded-full inline-flex items-center gap-2 text-sm font-semibold bg-white text-rose-700 border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer active:scale-95 shadow-sm">
              <PhoneOff className="w-4 h-4" /> End
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
