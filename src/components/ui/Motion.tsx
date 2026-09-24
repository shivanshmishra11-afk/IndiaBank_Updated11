/**
 * Motion kit — the handful of animated pieces the portal reuses.
 * All of it respects prefers-reduced-motion and stays off on touch where pointer effects would be noise.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform, useMotionValue } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import type { Toast } from '../../store/BankStore';

export const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/* Success burst — check mark that pops with a ring and confetti        */
/* ------------------------------------------------------------------ */

const CONFETTI = ['#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9', '#F43F5E'];

export const SuccessBurst: React.FC<{ size?: number; className?: string; tone?: 'emerald' | 'indigo' }> = ({ size = 72, className = '', tone = 'emerald' }) => {
  const reduce = useReducedMotion();
  const color = tone === 'emerald' ? '#059669' : '#4F46E5';
  const bg = tone === 'emerald' ? 'bg-emerald-50' : 'bg-indigo-50';
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {!reduce && (
        <>
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${color}` }}
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
          {CONFETTI.map((c, i) => {
            const angle = (i / CONFETTI.length) * Math.PI * 2;
            const r = size * 0.9;
            return (
              <motion.span
                key={c}
                className="absolute w-2 h-2 rounded-sm"
                style={{ background: c, left: '50%', top: '50%', marginLeft: -4, marginTop: -4 }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
                animate={{ x: Math.cos(angle) * r, y: Math.sin(angle) * r, opacity: 0, scale: 1, rotate: 180 }}
                transition={{ duration: 0.85, ease: 'easeOut', delay: 0.05 }}
              />
            );
          })}
        </>
      )}
      <motion.span
        className={`relative rounded-full ${bg} flex items-center justify-center`}
        style={{ width: size * 0.8, height: size * 0.8, color }}
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      >
        <motion.svg viewBox="0 0 24 24" width={size * 0.42} height={size * 0.42} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.2 4.2L19 7" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }} />
        </motion.svg>
      </motion.span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Reveal — fade/rise when it scrolls into view                        */
/* ------------------------------------------------------------------ */

export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; y?: number }> = ({ children, delay = 0, className = '', y = 14 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* Animated list rows                                                  */
/* ------------------------------------------------------------------ */

export const MotionList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <ul className={className}>
    <AnimatePresence initial={false}>{children}</AnimatePresence>
  </ul>
);

export const MotionRow: React.FC<{ children: React.ReactNode; className?: string; layoutId?: string; onClick?: () => void; highlight?: boolean }> = ({
  children,
  className = '',
  onClick,
  highlight,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: -8, backgroundColor: highlight ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0)' }}
      animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(99,102,241,0)' }}
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.35, ease: EASE, backgroundColor: { duration: 1.6 } }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.li>
  );
};

/* ------------------------------------------------------------------ */
/* Tilt — gentle 3D tilt for hero cards (pointer devices only)          */
/* ------------------------------------------------------------------ */

export const Tilt: React.FC<{ children: React.ReactNode; className?: string; max?: number }> = ({ children, className = '', max = 6 }) => {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(!reduce && !window.matchMedia?.('(hover: none)').matches);
  }, [reduce]);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 220, damping: 24 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 220, damping: 24 });
  const ref = useRef<HTMLDivElement>(null);
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* Progress ring                                                       */
/* ------------------------------------------------------------------ */

export const ProgressRing: React.FC<{ value: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode }> = ({
  value,
  size = 64,
  stroke = 6,
  color = '#4F46E5',
  track = '#E2E8F0',
  children,
}) => {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={reduce ? { strokeDashoffset: c * (1 - v) } : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 1, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

const TOAST_ICON = { success: CheckCircle2, info: Info, warning: AlertTriangle } as const;
const TOAST_TONE = {
  success: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  info: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  warning: 'text-amber-600 bg-amber-50 border-amber-100',
} as const;

export const ToastHost: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => (
  <div className="fixed top-20 right-4 sm:right-6 z-[70] flex flex-col gap-2 w-[min(92vw,360px)] pointer-events-none" aria-live="polite">
    <AnimatePresence initial={false}>
      {toasts.map((t) => {
        const Icon = TOAST_ICON[t.tone];
        return (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-auto ib-popover p-3.5 flex items-start gap-3"
            role="status"
          >
            <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${TOAST_TONE[t.tone]}`}>
              <Icon className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.body && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t.body}</p>}
            </div>
            <button onClick={() => onDismiss(t.id)} className="w-7 h-7 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);

/* ------------------------------------------------------------------ */
/* Modal shell                                                         */
/* ------------------------------------------------------------------ */

export const ModalShell: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: string; labelledBy?: string }> = ({
  open,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  labelledBy,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`relative w-full ${maxWidth} bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/70 max-h-[92vh] overflow-y-auto ib-scroll`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
