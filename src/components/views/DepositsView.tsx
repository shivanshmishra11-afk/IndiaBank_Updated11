import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { PiggyBank, Landmark, CalendarClock, ShieldCheck, TrendingUp, ArrowRight, Download, Info } from 'lucide-react';
import { BankAccount } from '../../types';
import { Page, PageHeader, Card, CardHeader, Badge, StatTile, EmptyState } from '../ui/Primitives';
import { MotionList, MotionRow, ModalShell, SuccessBurst, ProgressRing, Reveal } from '../ui/Motion';
import { useBank } from '../../store/BankStore';
import { formatINR } from '../../utils/format';

import { FD_RATES, RD_RATE, rateFor, fdMaturity, rdMaturity } from '../../data/depositRates';

function monthsUntil(dateLabel?: string): number | null {
  if (!dateLabel) return null;
  const d = new Date(dateLabel);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, (d.getTime() - Date.now()) / (30.44 * 86_400_000));
}

export const DepositsView: React.FC = () => {
  const { accounts, savingsAccount, openDeposit } = useBank();
  const deposits = accounts.filter((a) => a.type === 'Fixed Deposit' || a.type === 'Recurring Deposit');
  const total = deposits.reduce((s, a) => s + a.balance, 0);

  const [kind, setKind] = useState<'FD' | 'RD'>('FD');
  const [amount, setAmount] = useState('100000');
  const [months, setMonths] = useState(18);
  const [senior, setSenior] = useState(false);
  const [payout, setPayout] = useState<'maturity' | 'quarterly'>('maturity');
  const [confirming, setConfirming] = useState(false);
  const [booked, setBooked] = useState<BankAccount | null>(null);

  const principal = Math.max(0, parseFloat(amount) || 0);
  const rate = (kind === 'FD' ? rateFor(months) : RD_RATE) + (senior ? 0.5 : 0);
  const maturity = kind === 'FD' ? fdMaturity(principal, months, rate) : rdMaturity(principal, months, rate);
  const invested = kind === 'FD' ? principal : principal * months;
  const interest = maturity - invested;
  const minAmount = kind === 'FD' ? 10000 : 500;
  const valid = principal >= minAmount && principal <= savingsAccount.balance && months >= 3;

  const maturityDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [months]);

  const book = () => {
    const acct = openDeposit({ kind, amount: principal, tenureMonths: months, ratePct: rate });
    setConfirming(false);
    if (acct) setBooked(acct);
  };

  return (
    <Page>
      <PageHeader
        title="Deposits"
        subtitle="Fixed and recurring deposits — guaranteed returns, insured by DICGC up to ₹5,00,000."
        actions={
          <button onClick={() => document.getElementById('open-deposit')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="ib-btn-primary">
            <Landmark className="w-4 h-4" /> Open a deposit
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total in deposits" value={formatINR(total, { decimals: 0 })} />
        <StatTile label="Active deposits" value={String(deposits.length)} />
        <StatTile label="Best FD rate" value="6.75% p.a." tone="positive" hint="18 – 35 months" />
        <StatTile label="Insured" value="₹5,00,000" hint="DICGC cover" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Holdings */}
        <Card className="lg:col-span-7" padded={false}>
          <div className="p-5 pb-3">
            <CardHeader title="Your deposits" description="Interest accrues quarterly and is credited to your savings account" />
          </div>
          <MotionList className="divide-y divide-slate-100">
            {deposits.map((d) => {
              const left = monthsUntil(d.maturityDate);
              const tenureGuess = left !== null ? Math.max(left + 1, 12) : 12;
              const progress = left === null ? 0 : 1 - left / tenureGuess;
              const r = parseFloat(d.interestRate || '6.5') || 6.5;
              return (
                <MotionRow key={d.id} highlight={d.id.startsWith('acc-') && d.id.length > 8} className="px-5 py-4 flex items-center gap-4">
                  <ProgressRing value={progress} size={56} stroke={5} color={d.type === 'Fixed Deposit' ? '#4F46E5' : '#059669'}>
                    <PiggyBank className={`w-4.5 h-4.5 ${d.type === 'Fixed Deposit' ? 'text-indigo-600' : 'text-emerald-600'}`} />
                  </ProgressRing>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                      <Badge tone={d.type === 'Fixed Deposit' ? 'indigo' : 'emerald'}>{d.interestRate}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{d.accountNumber}</p>
                    <p className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" /> Matures {d.maturityDate}
                      {left !== null && ` · ${Math.ceil(left)} month${Math.ceil(left) === 1 ? '' : 's'} left`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="ib-num text-base font-bold text-slate-900">{formatINR(d.balance)}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold">≈ {formatINR(fdMaturity(d.balance, left !== null ? Math.ceil(left) : 12, r), { decimals: 0 })} at maturity</p>
                  </div>
                </MotionRow>
              );
            })}
          </MotionList>
          {deposits.length === 0 && <EmptyState icon={<PiggyBank className="w-5 h-5" />} title="No deposits yet" description="Open a fixed or recurring deposit below — it takes under a minute." />}
        </Card>

        {/* Rate card */}
        <Card className="lg:col-span-5">
          <CardHeader title="Interest rates" description="Per annum · compounded quarterly" action={<Badge tone="amber">w.e.f. 01 Sep 2026</Badge>} />
          <ul className="divide-y divide-slate-100 text-sm">
            {FD_RATES.map((r) => (
              <li key={r.label} className={`flex items-center justify-between py-2.5 ${months >= r.minMonths && (FD_RATES[FD_RATES.indexOf(r) + 1]?.minMonths ?? 999) > months && kind === 'FD' ? 'text-indigo-700 font-semibold' : 'text-slate-700'}`}>
                <span>Fixed deposit · {r.label}</span>
                <span className="ib-num">{r.rate.toFixed(2)}%</span>
              </li>
            ))}
            <li className={`flex items-center justify-between py-2.5 ${kind === 'RD' ? 'text-emerald-700 font-semibold' : 'text-slate-700'}`}>
              <span>Recurring deposit · any tenure</span>
              <span className="ib-num">{RD_RATE.toFixed(2)}%</span>
            </li>
          </ul>
          <p className="text-xs text-slate-500 mt-3 inline-flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Senior citizens earn an extra 0.50%. Premature withdrawal attracts a 1% penalty on the applicable rate.
          </p>
        </Card>
      </div>

      {/* Open deposit */}
      <Reveal>
        <Card id="open-deposit" className="scroll-mt-24">
          <CardHeader title="Open a new deposit" description={`Funded from ${savingsAccount.name} ${savingsAccount.maskedNumber} · available ${formatINR(savingsAccount.balance)}`} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <div className="ib-seg w-full grid grid-cols-2">
                <button type="button" onClick={() => { setKind('FD'); setAmount('100000'); }} aria-pressed={kind === 'FD'}>
                  Fixed deposit
                </button>
                <button type="button" onClick={() => { setKind('RD'); setAmount('5000'); }} aria-pressed={kind === 'RD'}>
                  Recurring deposit
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ib-label">{kind === 'FD' ? 'Deposit amount' : 'Monthly instalment'}</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                    <input type="number" min={minAmount} step={kind === 'FD' ? 5000 : 500} value={amount} onChange={(e) => setAmount(e.target.value)} className="ib-input pl-8 text-lg font-bold" aria-invalid={principal > 0 && principal < minAmount} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Minimum {formatINR(minAmount, { decimals: 0 })}</p>
                </div>
                <div>
                  <label className="ib-label">Payout</label>
                  <div className="ib-seg w-full grid grid-cols-2">
                    <button type="button" onClick={() => setPayout('maturity')} aria-pressed={payout === 'maturity'}>
                      At maturity
                    </button>
                    <button type="button" onClick={() => setPayout('quarterly')} aria-pressed={payout === 'quarterly'} disabled={kind === 'RD'}>
                      Quarterly
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="ib-label mb-0">Tenure · {months} months</label>
                  <Badge tone="indigo">{rate.toFixed(2)}% p.a.</Badge>
                </div>
                <input type="range" min={3} max={60} step={3} value={months} onChange={(e) => setMonths(parseInt(e.target.value))} className="w-full accent-indigo-600 cursor-pointer" aria-label="Tenure in months" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  {[3, 12, 24, 36, 48, 60].map((m) => (
                    <span key={m}>{m}m</span>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer select-none">
                <button type="button" role="switch" aria-checked={senior} onClick={() => setSenior((v) => !v)} className="ib-switch" />
                Senior citizen (+0.50%)
              </label>
            </div>

            {/* Projection */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl p-5 bg-slate-900 text-white h-full flex flex-col">
                <span className="ib-eyebrow text-indigo-200/80">Projection</span>
                <motion.p key={maturity} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="ib-num text-3xl font-bold mt-2">
                  {formatINR(maturity, { decimals: 0 })}
                </motion.p>
                <p className="text-sm text-indigo-200/80 mt-1">on {maturityDate}</p>
                <dl className="mt-5 pt-4 border-t border-white/10 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-400">{kind === 'FD' ? 'Principal' : `Total invested (${months} × ${formatINR(principal, { decimals: 0 })})`}</dt><dd className="ib-num">{formatINR(invested, { decimals: 0 })}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Interest earned</dt><dd className="ib-num text-emerald-400 font-semibold">+{formatINR(Math.max(0, interest), { decimals: 0 })}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Rate</dt><dd className="ib-num">{rate.toFixed(2)}% p.a.</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">TDS</dt><dd>Applicable above ₹40,000 interest/yr</dd></div>
                </dl>
                <button onClick={() => setConfirming(true)} disabled={!valid} className="ib-btn-primary w-full mt-auto pt-3 py-3">
                  <TrendingUp className="w-4 h-4" /> Review & book {kind}
                </button>
                {principal > savingsAccount.balance && <p className="text-[11px] text-amber-300 mt-2">Amount exceeds your savings balance.</p>}
              </div>
            </div>
          </div>
        </Card>
      </Reveal>

      {/* Confirm */}
      <ModalShell open={confirming} onClose={() => setConfirming(false)} labelledBy="confirm-dep">
        <div className="p-6">
          <span className="ib-eyebrow text-indigo-600">Confirm</span>
          <h3 id="confirm-dep" className="text-lg font-bold text-slate-900 mt-1">Book {kind === 'FD' ? 'fixed' : 'recurring'} deposit</h3>
          <dl className="mt-4 text-sm divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">
            {[
              [kind === 'FD' ? 'Amount' : 'Monthly instalment', formatINR(principal)],
              ['Tenure', `${months} months · matures ${maturityDate}`],
              ['Interest rate', `${rate.toFixed(2)}% p.a.${senior ? ' (senior citizen)' : ''}`],
              ['Maturity value', formatINR(maturity, { decimals: 0 })],
              ['Debit from', `${savingsAccount.name} ${savingsAccount.maskedNumber}`],
              ['Nominee', 'As registered on savings account'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-900 text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500 mt-3 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Authorised with your NetBanking session · e-certificate issued instantly
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setConfirming(false)} className="ib-btn-secondary">Back</button>
            <button onClick={book} className="ib-btn-primary">
              Confirm & debit {formatINR(principal, { decimals: 0 })} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Booked */}
      <ModalShell open={!!booked} onClose={() => setBooked(null)} maxWidth="max-w-sm">
        {booked && (
          <div className="p-8 text-center">
            <SuccessBurst className="mx-auto" />
            <h3 className="text-lg font-bold text-slate-900 mt-3">{booked.name} opened</h3>
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-mono font-semibold text-indigo-700">{booked.accountNumber}</span> · {formatINR(booked.balance)} · matures {booked.maturityDate}
            </p>
            <p className="text-xs text-slate-400 mt-2">Debited from your savings account. It now appears under Accounts, Statements and in Zora's summary.</p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(new Blob([`INDIA BANK — DEPOSIT ADVICE\n${booked.name} ${booked.accountNumber}\nAmount ${formatINR(booked.balance)} · ${booked.interestRate} · matures ${booked.maturityDate}\nIssued ${new Date().toLocaleString('en-IN')}`], { type: 'text/plain' }));
                  a.download = `${booked.accountNumber}_advice.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="ib-btn-secondary text-xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" /> e-Certificate
              </button>
              <button onClick={() => setBooked(null)} className="ib-btn-primary text-xs">Done</button>
            </div>
          </div>
        )}
      </ModalShell>
    </Page>
  );
};
