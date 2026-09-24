import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  UserPlus,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  QrCode,
  Lightbulb,
  Droplets,
  Flame,
  Smartphone,
  Tv,
  Wifi,
  CreditCard,
  ChevronRight,
  Download,
  ArrowRight,
  AlertTriangle,
  Repeat,
} from 'lucide-react';
import { Transaction } from '../../types';
import { Page, PageHeader, Card, CardHeader, Badge } from '../ui/Primitives';
import { SuccessBurst, MotionList, MotionRow } from '../ui/Motion';
import { useBank } from '../../store/BankStore';
import { formatINR } from '../../utils/format';

interface TransfersViewProps {
  onOpenScanPay: () => void;
  mode?: 'transfers' | 'payments';
  preselectBeneficiaryId?: string;
}

const BILLERS = [
  { id: 'elec', name: 'Electricity', provider: 'Tata Power Mumbai', due: 1250, dueDate: '28 Sep', icon: Lightbulb, consumer: 'CA 900-221-8843' },
  { id: 'gas', name: 'Piped gas', provider: 'Mahanagar Gas', due: 640, dueDate: '02 Oct', icon: Flame, consumer: 'BP 21008877' },
  { id: 'water', name: 'Water', provider: 'BMC Water', due: 380, dueDate: '05 Oct', icon: Droplets, consumer: 'WC 118-2210' },
  { id: 'mobile', name: 'Mobile postpaid', provider: 'Jio · 98765 43210', due: 899, dueDate: '30 Sep', icon: Smartphone, consumer: '98765 43210' },
  { id: 'broadband', name: 'Broadband', provider: 'Airtel Xstream', due: 1199, dueDate: '01 Oct', icon: Wifi, consumer: 'ID 0221-99871' },
  { id: 'dth', name: 'DTH', provider: 'Tata Play', due: 450, dueDate: '04 Oct', icon: Tv, consumer: 'Sub 1002-3345-88' },
];

type Rail = 'IMPS' | 'UPI' | 'NEFT' | 'RTGS';
const RAIL_INFO: Record<Rail, { note: string; min?: number; max?: number }> = {
  IMPS: { note: 'Instant · 24x7 · up to ₹5,00,000', max: 500000 },
  UPI: { note: 'Instant · 24x7 · up to ₹1,00,000', max: 100000 },
  NEFT: { note: 'Half-hourly batches · no limit' },
  RTGS: { note: 'Real-time · minimum ₹2,00,000', min: 200000 },
};

export const TransfersView: React.FC<TransfersViewProps> = ({ onOpenScanPay, mode = 'transfers', preselectBeneficiaryId }) => {
  const { beneficiaries, savingsAccount, accounts, transfer, transactions } = useBank();
  const activePayees = beneficiaries.filter((b) => b.status === 'Active');
  const [selectedPayeeId, setSelectedPayeeId] = useState<string>(preselectBeneficiaryId || activePayees[0]?.id || '');
  const [fromId, setFromId] = useState(savingsAccount.id);
  const [amount, setAmount] = useState('');
  const [rail, setRail] = useState<Rail>('IMPS');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'form' | 'review' | 'otp' | 'done'>('form');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [paidBill, setPaidBill] = useState<{ id: string; txn: Transaction } | null>(null);
  const [payingBill, setPayingBill] = useState<string | null>(null);

  useEffect(() => {
    if (preselectBeneficiaryId) setSelectedPayeeId(preselectBeneficiaryId);
  }, [preselectBeneficiaryId]);

  const from = accounts.find((a) => a.id === fromId) || savingsAccount;
  const payee = beneficiaries.find((p) => p.id === selectedPayeeId) || activePayees[0];
  const amt = parseFloat(amount) || 0;
  const railInfo = RAIL_INFO[rail];
  const validation = useMemo(() => {
    if (!payee) return 'Add a beneficiary to start.';
    if (payee.status !== 'Active') return 'This payee is still in the cooling period.';
    if (amt <= 0) return null;
    if (amt > from.balance) return `Insufficient balance in ${from.name}.`;
    if (railInfo.max && amt > railInfo.max) return `${rail} allows up to ${formatINR(railInfo.max, { decimals: 0 })} per transaction.`;
    if (railInfo.min && amt < railInfo.min) return `${rail} needs a minimum of ${formatINR(railInfo.min, { decimals: 0 })}.`;
    return null;
  }, [payee, amt, from, rail, railInfo]);

  const paidBillIds = useMemo(() => new Set(transactions.filter((t) => t.channel === 'BBPS' && t.rawDate === transactions[0]?.rawDate).map((t) => t.merchant)), [transactions]);

  const startReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (amt <= 0 || validation) return setError(validation || 'Enter an amount.');
    setStep('review');
  };

  const confirm = () => {
    setStep('otp');
    setOtp('4920');
  };

  const authorise = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return setError('Enter the OTP.');
    const txn = transfer({
      amount: amt,
      beneficiaryId: payee.id,
      payeeName: payee.name,
      description: note.trim() ? `${note.trim()} · ${rail} to ${payee.name}` : `${rail} transfer to ${payee.name}`,
      channel: rail,
      fromAccountId: from.id,
    });
    if (!txn) return setError('Transfer could not be completed.');
    setReceipt(txn);
    setStep('done');
  };

  const resetForm = () => {
    setStep('form');
    setAmount('');
    setNote('');
    setOtp('');
    setError(null);
    setReceipt(null);
  };

  const payBill = (id: string) => {
    const b = BILLERS.find((x) => x.id === id);
    if (!b) return;
    setPayingBill(id);
    window.setTimeout(() => {
      const txn = transfer({ amount: b.due, payeeName: b.provider, description: `${b.name} bill · ${b.consumer}`, channel: 'BBPS', category: 'Bills & Utilities' });
      setPayingBill(null);
      if (txn) setPaidBill({ id, txn });
    }, 700);
  };

  const isPayments = mode === 'payments';

  const downloadReceipt = (t: Transaction) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`INDIA BANK e-RECEIPT\n${t.date}\nTo: ${t.merchant}\nAmount: ${formatINR(t.amount)}\nChannel: ${t.channel}\nReference: ${t.reference}\nFrom: ${from.name} ${from.maskedNumber}\nStatus: ${t.status}`], { type: 'text/plain' }));
    a.download = `Receipt_${t.reference.replace(/[^\w]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Page>
      <PageHeader
        title={isPayments ? 'Payments' : 'Transfers'}
        subtitle={isPayments ? 'Pay utility bills, recharge and settle dues from your savings account.' : 'Send money to anyone in India — IMPS, UPI, NEFT and RTGS, 24x7 and free of charge.'}
        actions={
          <>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ib:navigate', { detail: { tab: 'beneficiaries' } }))} className="ib-btn-secondary">
              <UserPlus className="w-4 h-4 text-indigo-600" /> Beneficiaries
            </button>
            <button onClick={onOpenScanPay} className="ib-btn-dark">
              <QrCode className="w-4 h-4" /> Scan any QR
            </button>
          </>
        }
      />

      {isPayments && (
        <Card padded={false}>
          <div className="p-5 pb-3">
            <CardHeader title="Bills due" description={`Paid from ${savingsAccount.name} (${savingsAccount.maskedNumber}) · balance ${formatINR(savingsAccount.balance)}`} action={<Badge tone="indigo">Bharat BillPay</Badge>} />
          </div>
          <MotionList className="divide-y divide-slate-100">
            {BILLERS.map((b) => {
              const Icon = b.icon;
              const paid = paidBillIds.has(b.provider) || paidBill?.id === b.id;
              return (
                <MotionRow key={b.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {b.provider} · {b.consumer}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="ib-num text-sm font-bold text-slate-900">{formatINR(b.due, { decimals: 0 })}</p>
                    <p className="text-[11px] text-slate-400">Due {b.dueDate}</p>
                  </div>
                  {paid ? (
                    <Badge tone="emerald" className="ml-2">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </Badge>
                  ) : (
                    <button onClick={() => payBill(b.id)} disabled={payingBill === b.id} className="ib-btn-secondary py-1.5 px-3 text-xs ml-2 min-w-[92px] justify-center">
                      {payingBill === b.id ? 'Paying…' : `Pay ${formatINR(b.due, { decimals: 0 })}`}
                    </button>
                  )}
                </MotionRow>
              );
            })}
          </MotionList>
          <AnimatePresence>
            {paidBill && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-emerald-100 bg-emerald-50/60">
                <div className="px-5 py-3 flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-700 flex-1">
                    {formatINR(paidBill.txn.amount)} paid to {paidBill.txn.merchant} · Ref <span className="font-mono">{paidBill.txn.reference}</span> · Savings balance now {formatINR(savingsAccount.balance)}
                  </span>
                  <button onClick={() => downloadReceipt(paidBill.txn)} className="ib-btn-ghost text-xs py-1">
                    <Download className="w-3.5 h-3.5" /> Receipt
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
          <CardHeader title={isPayments ? 'Pay a person' : 'Send money'} description="Choose a verified beneficiary" action={<Badge tone="slate">{activePayees.length} active</Badge>} />

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {beneficiaries.map((p) => {
              const selected = p.id === selectedPayeeId;
              const cooling = p.status !== 'Active';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !cooling && setSelectedPayeeId(p.id)}
                  disabled={cooling}
                  title={cooling ? 'In cooling period' : p.name}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center disabled:opacity-50 disabled:cursor-not-allowed ${selected ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/10' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                >
                  <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm mb-2 ${selected ? 'bg-indigo-600 text-white' : cooling ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{p.avatar}</div>
                  <span className="text-xs font-semibold text-slate-900 truncate w-full">{p.nickname || p.name}</span>
                  <span className="text-[10px] text-slate-500 truncate w-full">{cooling ? 'Cooling' : p.bank}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <AnimatePresence mode="wait" initial={false}>
              {step === 'done' && receipt ? (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-6 text-center rounded-2xl bg-emerald-50 border border-emerald-100">
                  <SuccessBurst className="mx-auto" />
                  <h4 className="text-lg font-bold text-slate-900 mt-2">Transfer successful</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    {formatINR(receipt.amount)} sent to {payee.name} via {rail}.
                  </p>
                  <dl className="mt-4 text-xs text-left bg-white rounded-xl border border-emerald-100 divide-y divide-slate-100 px-4">
                    {[
                      ['Reference', receipt.reference],
                      ['From', `${from.name} ${from.maskedNumber}`],
                      ['Balance now', formatINR(accounts.find((a) => a.id === from.id)?.balance ?? from.balance)],
                      ['Date', receipt.date],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="font-semibold text-slate-900 font-mono">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button onClick={() => downloadReceipt(receipt)} className="ib-btn-secondary text-xs">
                      <Download className="w-3.5 h-3.5 text-indigo-600" /> e-Receipt
                    </button>
                    <button onClick={resetForm} className="ib-btn-primary text-xs">
                      <Repeat className="w-3.5 h-3.5" /> Another transfer
                    </button>
                  </div>
                </motion.div>
              ) : step === 'review' || step === 'otp' ? (
                <motion.form key="review" onSubmit={authorise} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                  <span className="ib-eyebrow text-indigo-600">Review & authorise</span>
                  <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 text-sm px-4">
                    {[
                      ['To', `${payee.name} · ${payee.vpa || `A/C ••••${payee.accountNumber?.slice(-4)} · ${payee.ifsc}`}`],
                      ['Amount', formatINR(amt)],
                      ['From', `${from.name} ${from.maskedNumber} (${formatINR(from.balance)})`],
                      ['Network', `${rail} · ${railInfo.note}`],
                      ['Charges', '₹0.00'],
                      ['Note', note || '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-2.5">
                        <dt className="text-slate-500 shrink-0">{k}</dt>
                        <dd className="font-medium text-slate-900 text-right">{v}</dd>
                      </div>
                    ))}
                  </div>
                  <AnimatePresence>
                    {step === 'otp' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <label className="ib-label">OTP sent to +91 98••• ••210</label>
                        <input className="ib-input font-mono tracking-[0.4em] text-center text-lg" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoFocus />
                        <p className="text-[11px] text-slate-400 mt-1">Demo OTP pre-filled: 4920 · expires in 03:00</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {error && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> {error}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setStep('form'); setError(null); }} className="ib-btn-secondary">
                      Edit
                    </button>
                    {step === 'review' ? (
                      <button type="button" onClick={confirm} className="ib-btn-primary flex-1 py-3">
                        Confirm & get OTP <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button type="submit" className="ib-btn-primary flex-1 py-3">
                        <ShieldCheck className="w-4 h-4" /> Authorise {formatINR(amt, { decimals: 0 })}
                      </button>
                    )}
                  </div>
                </motion.form>
              ) : (
                <motion.form key="form" onSubmit={startReview} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="space-y-4">
                  {payee ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                      <span className="text-slate-500">To</span>
                      <span className="font-semibold text-slate-900">
                        {payee.name} · <span className="font-mono text-slate-600">{payee.vpa || `••••${payee.accountNumber?.slice(-4)}`}</span>
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No active beneficiaries yet.</p>
                  )}

                  <div>
                    <label className="ib-label">Payment network</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['IMPS', 'UPI', 'NEFT', 'RTGS'] as Rail[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setRail(m)}
                          aria-pressed={rail === m}
                          disabled={m === 'UPI' && !payee?.vpa && !!payee?.accountNumber && false}
                          className={`py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${rail === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">{railInfo.note}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="ib-label">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="1" required className="ib-input pl-8 text-lg font-bold" aria-invalid={!!validation && amt > 0} />
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {[500, 2000, 10000].map((q) => (
                          <button key={q} type="button" onClick={() => setAmount(String(q))} className="ib-chip text-[11px] py-1">
                            {formatINR(q, { decimals: 0 })}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="ib-label">From account</label>
                      <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="ib-input">
                        {accounts
                          .filter((a) => a.type === 'Savings' || a.type === 'Current')
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} {a.maskedNumber} · {formatINR(a.balance, { decimals: 0 })}
                            </option>
                          ))}
                      </select>
                      <label className="ib-label mt-3">Note (optional)</label>
                      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rent, dinner, gift…" className="ib-input" maxLength={40} />
                    </div>
                  </div>

                  {(validation && amt > 0) || error ? (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> {error || validation}
                    </p>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Available {formatINR(from.balance)}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" /> OTP protected
                      </span>
                    </div>
                  )}

                  <button type="submit" disabled={!payee || (!!validation && amt > 0)} className="ib-btn-primary w-full py-3">
                    <Send className="w-4 h-4" /> Review {amt ? formatINR(amt, { decimals: 0 }) : 'transfer'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Card>

        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader title="Limits & protection" />
            <ul className="space-y-3">
              {[
                { icon: Zap, tone: 'bg-indigo-50 text-indigo-700', title: 'IMPS / UPI, 24x7', desc: 'Instant settlement up to ₹5,00,000 per transaction.' },
                { icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700', title: 'RBI positive pay', desc: 'Transfers above ₹50,000 are cross-verified with the beneficiary bank.' },
                { icon: Clock, tone: 'bg-amber-50 text-amber-700', title: 'Zero charges', desc: 'No processing fee on NEFT, RTGS, IMPS or UPI.' },
              ].map((i) => {
                const Icon = i.icon;
                return (
                  <li key={i.title} className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${i.tone}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{i.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{i.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-2">
              <CardHeader title="Recent transfers" description="Latest outgoing payments" />
            </div>
            <ul className="divide-y divide-slate-100">
              {transactions
                .filter((t) => t.type === 'debit' && (t.category === 'Transfers' || t.channel === 'BBPS' || t.category === 'Bills & Utilities'))
                .slice(0, 4)
                .map((t) => (
                  <li key={t.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-slate-900 truncate block">{t.merchant}</span>
                      <span className="text-xs text-slate-500">{t.date} · {t.channel || t.reference.split('/')[0].split('-')[0]}</span>
                    </span>
                    <span className="ib-num font-semibold text-slate-900">−{formatINR(t.amount, { decimals: 0 })}</span>
                  </li>
                ))}
            </ul>
          </Card>

          {!isPayments && (
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('ib:navigate', { detail: { tab: 'cards' } }))} className="w-full ib-card ib-card-hover p-4 flex items-center gap-3 text-left cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <CreditCard className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Credit card bill due</p>
                <p className="text-xs text-slate-500">Pay from savings, debit card or QR</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </Page>
  );
};
