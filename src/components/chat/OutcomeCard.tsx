/**
 * Final-outcome cards Zora shows after an answer or an action: a card-due summary, an
 * account summary, a payment receipt, a live QR, a booked deposit or a raised service request.
 * Used inside the chat panel and, more prominently, in the full-screen voice session.
 */
import React, { useEffect, useState } from 'react';
import { CreditCard, Building2, Landmark, PiggyBank, CheckCircle2, Clock, Download, ArrowRight, Sparkles, LayoutList } from 'lucide-react';
import type { BankAccount, CoreCreditCard, PaymentSession, ServiceRequest } from '../../types';
import { DynamicPaymentBubble } from './DynamicPaymentBubble';
import { formatINR, formatCountdown } from '../../utils/format';

export type Outcome =
  | { type: 'card-due'; card: CoreCreditCard }
  | { type: 'summary'; accounts: BankAccount[]; card: CoreCreditCard | null }
  | { type: 'receipt'; amount: number; utr: string; method: string; card: CoreCreditCard }
  | { type: 'qr'; session: PaymentSession }
  | { type: 'fd'; account: BankAccount; ratePct: number; maturityValue: number }
  | { type: 'request'; request: ServiceRequest }
  | { type: 'facts'; sections: { title: string; rows: { label: string; value: string }[] }[] }
  | { type: 'error'; title: string; body: string };

interface OutcomeCardProps {
  outcome: Outcome;
  compact?: boolean;
  /** voice session: large centred QR with just the amount and remaining time */
  voice?: boolean;
  onPay?: () => void;
  onQrPaid?: (session: PaymentSession, card: CoreCreditCard) => void;
  onOpenSimulator?: (txnId: string) => void;
}

const Row: React.FC<{ k: string; v: React.ReactNode; strong?: boolean }> = ({ k, v, strong }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
    <span className="text-slate-500">{k}</span>
    <span className={`text-right ${strong ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>{v}</span>
  </div>
);

const Shell: React.FC<{ icon: React.ReactNode; tone: string; title: string; eyebrow?: string; children: React.ReactNode; compact?: boolean }> = ({ icon, tone, title, eyebrow, children, compact }) => (
  <div className={`ib-card overflow-hidden ${compact ? '' : 'shadow-[var(--shadow-md)]'}`}>
    <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100">
      <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${tone}`}>{icon}</span>
      <div className="min-w-0">
        {eyebrow && <span className="ib-eyebrow block">{eyebrow}</span>}
        <p className="text-sm font-bold text-slate-900 truncate">{title}</p>
      </div>
    </div>
    <div className="px-4 py-2.5">{children}</div>
  </div>
);

/** Voice-session QR: nothing but the code, the amount and the time left; completes live. */
const VoiceQr: React.FC<{ session: PaymentSession; onPaid?: (s: PaymentSession, c: CoreCreditCard) => void; onOpenSimulator?: (txnId: string) => void }> = ({ session, onPaid, onOpenSimulator }) => {
  const [status, setStatus] = useState<'PENDING' | 'COMPLETED' | 'EXPIRED'>(session.status || 'PENDING');
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)) || 120);

  useEffect(() => {
    if (status !== 'PENDING') return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          setStatus('EXPIRED');
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (status !== 'PENDING') return;
    let alive = true;
    let sse: EventSource | null = null;
    const complete = (data: any) => {
      if (!alive || data?.session?.status !== 'COMPLETED') return;
      alive = false;
      setStatus('COMPLETED');
      onPaid?.(data.session, data.card);
      sse?.close();
      clearInterval(poll);
    };
    try {
      sse = new EventSource(`/api/payment/stream/${session.txnId}`);
      sse.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.event === 'payment_complete') complete({ session: { ...d.session, status: 'COMPLETED' }, card: d.card });
        } catch {
          /* ignore */
        }
      };
      sse.onerror = () => sse?.close();
    } catch {
      /* polling covers it */
    }
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/payment/session/${session.txnId}`);
        if (r.ok) complete(await r.json());
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => {
      alive = false;
      sse?.close();
      clearInterval(poll);
    };
  }, [session.txnId, status, onPaid]);

  return (
    <div className="ib-card p-6 flex flex-col items-center text-center shadow-[var(--shadow-md)]">
      <span className="ib-eyebrow">Scan to pay</span>
      <p className="ib-num text-2xl font-bold text-slate-900 mt-1">{formatINR(session.amount)}</p>
      <p className="text-xs text-slate-500">towards {session.cardName} {session.cardMasked}</p>
      <div className={`relative mt-4 p-3 rounded-2xl border border-slate-200 bg-white ${status !== 'PENDING' ? 'opacity-40' : ''}`}>
        {session.qrDataUrl ? <img src={session.qrDataUrl} alt="Payment QR code" className="w-52 h-52 sm:w-56 sm:h-56" /> : <div className="w-56 h-56 ib-skeleton rounded-xl" />}
      </div>
      {status === 'PENDING' && (
        <p className="mt-4 text-sm font-semibold text-slate-800 inline-flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" /> Expires in <span className="ib-num text-indigo-700">{formatCountdown(left)}</span>
        </p>
      )}
      {status === 'COMPLETED' && (
        <p className="mt-4 text-sm font-semibold text-emerald-700 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Payment received
        </p>
      )}
      {status === 'EXPIRED' && <p className="mt-4 text-sm font-semibold text-rose-600">This QR has expired — ask me for a new one.</p>}
      {status === 'PENDING' && onOpenSimulator && (
        <button onClick={() => onOpenSimulator(session.txnId)} className="mt-3 text-[11px] text-slate-400 hover:text-indigo-600 underline underline-offset-2 cursor-pointer">
          Demo: simulate a phone scan
        </button>
      )}
    </div>
  );
};

export const OutcomeCard: React.FC<OutcomeCardProps> = ({ outcome, compact, voice, onPay, onQrPaid, onOpenSimulator }) => {
  switch (outcome.type) {
    case 'card-due': {
      const c = outcome.card;
      const paid = c.outstandingBalance <= 0;
      return (
        <Shell icon={<CreditCard className="w-4 h-4" />} tone="bg-slate-900 text-white border-slate-900" title={`${c.cardName} ${c.maskedNumber}`} eyebrow="Credit card">
          <div className="grid grid-cols-2 gap-2 mb-1">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
              <span className="ib-eyebrow block">Total due</span>
              <span className="ib-num text-lg font-bold text-slate-900">{formatINR(c.outstandingBalance)}</span>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
              <span className="ib-eyebrow block">Minimum due</span>
              <span className="ib-num text-lg font-bold text-slate-900">{formatINR(c.minimumDue)}</span>
            </div>
          </div>
          <Row k="Due date" v={c.dueDate} />
          <Row k="Available credit" v={`${formatINR(c.availableCredit, { decimals: 0 })} of ${formatINR(c.creditLimit, { decimals: 0 })}`} />
          {c.lastUtr && <Row k="Last payment" v={`${formatINR(c.lastPaymentAmount || 0)} · ${c.lastUtr}`} />}
          {!paid && onPay && (
            <button onClick={onPay} className="ib-btn-primary w-full mt-2 text-xs py-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Pay this bill
            </button>
          )}
          {paid && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 mt-2 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fully paid — nothing due
            </p>
          )}
        </Shell>
      );
    }
    case 'summary': {
      const icons: Record<string, React.ElementType> = { Savings: Building2, Current: Landmark, 'Fixed Deposit': PiggyBank, 'Recurring Deposit': PiggyBank };
      const total = outcome.accounts.reduce((s, a) => s + a.balance, 0);
      return (
        <Shell icon={<Building2 className="w-4 h-4" />} tone="bg-indigo-50 text-indigo-700 border-indigo-100" title={formatINR(total)} eyebrow="Total balance">
          {outcome.accounts.map((a) => {
            const Icon = icons[a.type] || Building2;
            return (
              <div key={a.id} className="flex items-center gap-2.5 py-1.5 text-[13px]">
                <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="flex-1 text-slate-700 truncate">
                  {a.name} <span className="text-slate-400 font-mono text-xs">{a.maskedNumber}</span>
                </span>
                <span className="ib-num font-semibold text-slate-900">{formatINR(a.balance)}</span>
              </div>
            );
          })}
          {outcome.card && (
            <div className="flex items-center gap-2.5 py-1.5 text-[13px] border-t border-slate-100 mt-1 pt-2">
              <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="flex-1 text-slate-700 truncate">Credit card due · {outcome.card.dueDate}</span>
              <span className="ib-num font-semibold text-rose-600">{formatINR(outcome.card.outstandingBalance)}</span>
            </div>
          )}
        </Shell>
      );
    }
    case 'receipt':
      return (
        <Shell icon={<CheckCircle2 className="w-4 h-4" />} tone="bg-emerald-50 text-emerald-700 border-emerald-100" title={`${formatINR(outcome.amount)} paid`} eyebrow="Payment successful">
          <Row k="Towards" v={`${outcome.card.cardName} ${outcome.card.maskedNumber}`} />
          <Row k="Method" v={outcome.method} />
          <Row k="UTR" v={<span className="font-mono text-indigo-700">{outcome.utr}</span>} />
          <Row k="New outstanding" v={formatINR(outcome.card.outstandingBalance)} strong />
          <Row k="Available credit" v={formatINR(outcome.card.availableCredit, { decimals: 0 })} />
        </Shell>
      );
    case 'qr':
      return voice ? <VoiceQr session={outcome.session} onPaid={onQrPaid} onOpenSimulator={onOpenSimulator} /> : <DynamicPaymentBubble session={outcome.session} onPaymentSuccess={onQrPaid} onOpenSimulator={onOpenSimulator} />;
    case 'fd': {
      const a = outcome.account;
      return (
        <Shell icon={<PiggyBank className="w-4 h-4" />} tone="bg-amber-50 text-amber-700 border-amber-100" title={`${a.name} opened`} eyebrow="Confirmed">
          <Row k="Deposit number" v={<span className="font-mono">{a.accountNumber}</span>} />
          <Row k="Amount" v={formatINR(a.balance)} strong />
          <Row k="Rate" v={`${outcome.ratePct.toFixed(2)}% p.a.`} />
          <Row k="Matures" v={a.maturityDate} />
          <Row k="Maturity value" v={<span className="text-emerald-700 font-bold">{formatINR(outcome.maturityValue, { decimals: 0 })}</span>} />
          <p className="text-[11px] text-slate-400 mt-1.5 inline-flex items-center gap-1">
            <Download className="w-3 h-3" /> Debited from Savings · e-certificate in Statements & documents
          </p>
        </Shell>
      );
    }
    case 'request': {
      const r = outcome.request;
      return (
        <Shell icon={<Clock className="w-4 h-4" />} tone="bg-violet-50 text-violet-700 border-violet-100" title={r.type} eyebrow="Request raised">
          <Row k="Reference" v={<span className="font-mono text-indigo-700">{r.id}</span>} />
          <Row k="Details" v={r.details} />
          <Row k="Status" v={r.status} />
          <Row k="Expected" v={r.eta} />
          <button onClick={() => window.dispatchEvent(new CustomEvent('ib:navigate', { detail: { tab: 'services' } }))} className="ib-btn-ghost text-xs -ml-3 mt-1">
            Track request <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Shell>
      );
    }
    case 'facts':
      return (
        <div className="space-y-2">
          {outcome.sections.map((sec, i) => (
            <Shell key={i} icon={<LayoutList className="w-4 h-4" />} tone="bg-indigo-50 text-indigo-700 border-indigo-100" title={sec.title} compact={compact}>
              {sec.rows.map((r, j) => (
                <div key={j} className="flex items-start justify-between gap-4 py-1.5 text-[13px] border-b border-slate-50 last:border-0">
                  {r.label ? <span className="text-slate-500 shrink-0">{r.label}</span> : null}
                  <span className={`text-right ${r.label ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{r.value}</span>
                </div>
              ))}
            </Shell>
          ))}
        </div>
      );
    case 'error':
      return (
        <Shell icon={<Clock className="w-4 h-4" />} tone="bg-rose-50 text-rose-700 border-rose-100" title={outcome.title}>
          <p className="text-[13px] text-slate-600">{outcome.body}</p>
        </Shell>
      );
  }
};
