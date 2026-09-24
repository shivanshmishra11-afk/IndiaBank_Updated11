import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Lightweight rich text: **bold**, bullets, numbered lines            */
/* ------------------------------------------------------------------ */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-slate-900">
          {p.slice(2, -2)}
        </strong>
      );
    }
    // Strip stray markdown symbols the model may emit mid-stream
    return <React.Fragment key={`${keyPrefix}-${i}`}>{p.replace(/\*\*/g, '')}</React.Fragment>;
  });
}

export const RichText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const lines = text.replace(/\r/g, '').split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((raw, idx) => {
    const line = raw.replace(/^#+\s*/, '').trimEnd();
    if (!line.trim()) {
      nodes.push(<div key={`sp-${idx}`} className="h-2" />);
      return;
    }
    const bullet = line.match(/^\s*(?:[•\-*]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      const isNumbered = /^\s*\d/.test(line);
      const marker = isNumbered ? line.trim().match(/^\d+/)?.[0] + '.' : '•';
      nodes.push(
        <div key={`li-${idx}`} className="flex gap-2 pl-0.5">
          <span className={`shrink-0 ${isNumbered ? 'text-indigo-600 font-semibold tabular-nums w-5' : 'text-indigo-500 w-3'}`}>
            {marker}
          </span>
          <span className="flex-1">{renderInline(bullet[1], `li-${idx}`)}</span>
        </div>
      );
      return;
    }
    nodes.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`)}</p>);
  });

  return <div className={`space-y-1 leading-relaxed ${className}`}>{nodes}</div>;
};

/* ------------------------------------------------------------------ */
/* Streaming reveal — paces the answer so it reads as being generated  */
/* ------------------------------------------------------------------ */

interface StreamingTextProps {
  text: string;
  active: boolean; // false → render fully, no animation
  onDone?: () => void;
  onTick?: () => void; // called as text grows (used to keep the list scrolled)
}

/** Per-token reveal schedule (ms from start). Human-like: slower after punctuation and line breaks. */
function buildSchedule(tokens: string[]): number[] {
  const schedule: number[] = [];
  let t = 80; // canned replies (receipts, confirmations) reveal quickly — live answers stream from the model
  tokens.forEach((tok) => {
    schedule.push(t);
    let delay = 14 + Math.random() * 12;
    if (/[.!?]\s*$/.test(tok)) delay += 90;
    else if (/[,;:]\s*$/.test(tok)) delay += 40;
    if (/\n/.test(tok)) delay += 80;
    t += delay;
  });
  return schedule;
}

export const StreamingText: React.FC<StreamingTextProps> = ({ text, active, onDone, onTick }) => {
  const tokens = useMemo(() => text.match(/\S+\s*|\s+/g) || [], [text]);
  const [count, setCount] = useState(active ? 0 : tokens.length);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setCount(tokens.length);
      return;
    }
    doneRef.current = false;
    setCount(0);
    const schedule = buildSchedule(tokens);
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout>;

    // Reveal is driven by elapsed time, not by chained timeouts, so the pace stays
    // consistent even when the browser throttles timers.
    const tick = () => {
      const elapsed = performance.now() - start;
      let n = 0;
      while (n < schedule.length && schedule[n] <= elapsed) n += 1;
      setCount(n);
      onTick?.();
      if (n >= tokens.length) {
        if (!doneRef.current) {
          doneRef.current = true;
          timer = setTimeout(() => onDone?.(), 220); // hold the cursor on the last word
        }
        return;
      }
      timer = setTimeout(tick, Math.max(16, schedule[n] - elapsed));
    };

    timer = setTimeout(tick, 260);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);

  const visible = tokens.slice(0, count).join('');
  const finished = count >= tokens.length;

  return (
    <div className={active && !finished ? 'ib-cursor' : ''}>
      <RichText text={visible} />
    </div>
  );
};

export const TypingIndicator: React.FC<{ label?: string }> = ({ label = 'Zora is thinking' }) => (
  <div className="flex items-center gap-2.5 text-xs text-slate-500">
    <span className="flex items-center gap-1 px-2.5 py-2 rounded-full bg-white border border-slate-200">
      <span className="ib-typing-dot" />
      <span className="ib-typing-dot" />
      <span className="ib-typing-dot" />
    </span>
    <span>{label}…</span>
  </div>
);
