import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, SearchX } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches;

/** Tracks the cursor inside an element and exposes it as --mx/--my for `.ib-spotlight`. Off on touch. */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isTouch() || prefersReducedMotion()) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    el.addEventListener('mousemove', move);
    return () => el.removeEventListener('mousemove', move);
  }, []);
  return ref;
}

/** Counts a number up when it first scrolls into view. */
export const AnimatedNumber: React.FC<{ value: number; format: (n: number) => string; duration?: number; className?: string }> = ({
  value,
  format,
  duration = 900,
  className = '',
}) => {
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const from = fromRef.current;
      const step = (t: number) => {
        // rAF timestamps can precede performance.now() taken at start — clamp so p ∈ [0, 1]
        const p = Math.min(1, Math.max(0, (t - start) / duration));
        const eased = 1 - Math.pow(1 - p, 4);
        setShown(from + (value - from) * eased);
        if (p < 1) raf = requestAnimationFrame(step);
        else fromRef.current = value;
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={`ib-num ${className}`}>
      {format(shown)}
    </span>
  );
};

/** Splits a headline into words that blur-in one after another. */
export const WordReveal: React.FC<{ text: string; className?: string; startDelay?: number }> = ({ text, className = '', startDelay = 0 }) => (
  <span className={className} aria-label={text}>
    {text.split(' ').map((w, i) => (
      <span key={i} className="ib-word" style={{ ['--i' as any]: i + startDelay }} aria-hidden="true">
        {w}
        {i < text.split(' ').length - 1 ? ' ' : ''}
      </span>
    ))}
  </span>
);

/* ------------------------------------------------------------------ */
/* Page scaffolding                                                    */
/* ------------------------------------------------------------------ */

interface PageProps {
  children: React.ReactNode;
  className?: string;
}

/** Consistent page container used by every dashboard tab; children stagger in. */
export const Page: React.FC<PageProps> = ({ children, className = '' }) => (
  <div className={`ib-page flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-9 max-w-[1240px] mx-auto w-full text-left space-y-6 ${className}`}>
    {children}
  </div>
);

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, eyebrow, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div>
      {eyebrow && <span className="ib-eyebrow text-indigo-600">{eyebrow}</span>}
      <h1 className="ib-h1 text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  onClick?: () => void;
  interactive?: boolean;
  id?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', padded = true, onClick, interactive, id }) => (
  <div id={id} onClick={onClick} className={`ib-card ${interactive || onClick ? 'ib-card-hover cursor-pointer' : ''} ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>
    {children}
  </div>
);

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, description, action }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div>
      <h3 className="ib-section-title">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
    {action}
  </div>
);

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

type Tone = 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';

const toneClasses: Record<Tone, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-800 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-100',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({ tone = 'slate', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${toneClasses[tone]} ${className}`}>{children}</span>
);

export const IconTile: React.FC<{ tone?: Tone; children: React.ReactNode; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  tone = 'indigo',
  children,
  size = 'md',
  className = '',
}) => {
  const dims = size === 'sm' ? 'w-8 h-8 rounded-lg' : size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl';
  return <div className={`${dims} flex items-center justify-center shrink-0 border ${toneClasses[tone]} ${className}`}>{children}</div>;
};

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative';
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, hint, tone = 'default' }) => (
  <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5">
    <span className="ib-eyebrow block">{label}</span>
    <span className={`ib-num text-lg font-bold block mt-1 ${tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : 'text-slate-900'}`}>{value}</span>
    {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
  </div>
);

/** Zora's avatar — the sparkle mark used everywhere the assistant appears. */
export const ZoraMark: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => (
  <div
    style={{ width: size, height: size }}
    className={`rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0 ${className}`}
  >
    <Sparkles style={{ width: size * 0.5, height: size * 0.5 }} className="text-amber-300" />
  </div>
);

export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`h-px bg-slate-100 ${className}`} />;

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`ib-skeleton ${className}`} aria-hidden="true" />;

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="py-12 px-6 text-center flex flex-col items-center">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center">
      {icon || <SearchX className="w-5 h-5" />}
    </div>
    <p className="text-sm font-semibold text-slate-900 mt-3">{title}</p>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
