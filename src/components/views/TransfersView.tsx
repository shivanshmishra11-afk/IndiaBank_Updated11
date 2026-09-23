import React, { useState } from 'react';
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
} from 'lucide-react';
import { BankAccount, QuickPayee } from '../../types';
import { QUICK_PAYEES } from '../../data/mockData';
import { Page, PageHeader, Card, CardHeader, Badge } from '../ui/Primitives';
import { formatINR } from '../../utils/format';

interface TransfersViewProps {
  accounts: BankAccount[];
  onTransferCompleted?: (amount: number, desc: string, payee: string) => void;
  onOpenScanPay: () => void;
  mode?: 'transfers' | 'payments';
}

const BILLERS = [
  { id: 'elec', name: 'Electricity', provider: 'Tata Power Mumbai', due: 1250, dueDate: '28 Sep', icon: Lightbulb },
  { id: 'gas', name: 'Piped gas', provider: 'Mahanagar Gas', due: 640, dueDate: '02 Oct', icon: Flame },
  { id: 'water', name: 'Water', provider: 'BMC Water', due: 380, dueDate: '05 Oct', icon: Droplets },
  { id: 'mobile', name: 'Mobile postpaid', provider: 'Jio · 98765 43210', due: 899, dueDate: '30 Sep', icon: Smartphone },
  { id: 'broadband', name: 'Broadband', provider: 'Airtel Xstream', due: 1199, dueDate: '01 Oct', icon: Wifi },
  { id: 'dth', name: 'DTH', provider: 'Tata Play', due: 450, dueDate: '04 Oct', icon: Tv },
];

export const TransfersView: React.FC<TransfersViewProps> = ({ accounts, onTransferCompleted, onOpenScanPay, mode = 'transfers' }) => {
  const [payees, setPayees] = useState<QuickPayee[]>(QUICK_PAYEES);
  const [selectedPayeeId, setSelectedPayeeId] = useState<string>(payees[0]?.id || 'p1');
  const [amount, setAmount] = useState('');
  const [transferMode, setTransferMode] = useState<'IMPS' | 'NEFT' | 'RTGS' | 'UPI'>('IMPS');
  const [note, setNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showAddPayee, setShowAddPayee] = useState(false);
  const [newPayeeName, setNewPayeeName] = useState('');
  const [newPayeeAcc, setNewPayeeAcc] = useState('');
  const [paidBills, setPaidBills] = useState<string[]>([]);

  const savings = accounts.find((a) => a.type === 'Savings') || accounts[0];
  const selectedPayee = payees.find((p) => p.id === selectedPayeeId) || payees[0];

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    onTransferCompleted?.(val, note || `Transfer to ${selectedPayee.name}`, selectedPayee.name);
    setIsSuccess(true);
  };

  const handleAddPayee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayeeName.trim()) return;
    const newP: QuickPayee = {
      id: `p-${Date.now()}`,
      name: newPayeeName,
      accountNumber: newPayeeAcc || 'XXXX 8899',
      bankName: 'India Bank',
      avatar: newPayeeName.charAt(0).toUpperCase(),
    };
    setPayees((prev) => [...prev, newP]);
    setSelectedPayeeId(newP.id);
    setShowAddPayee(false);
    setNewPayeeName('');
    setNewPayeeAcc('');
  };

  const payBill = (id: string) => {
    const b = BILLERS.find((x) => x.id === id);
    if (!b) return;
    onTransferCompleted?.(b.due, `${b.name} bill · ${b.provider}`, b.provider);
    setPaidBills((p) => [...p, id]);
  };

  const isPayments = mode === 'payments';

  return (
    <Page>
      <PageHeader
        title={isPayments ? 'Payments' : 'Transfers'}
        subtitle={
          isPayments
            ? 'Pay utility bills, recharge, and settle dues from your savings account.'
            : 'Send money to anyone in India — IMPS, UPI, NEFT and RTGS, 24x7 and free of charge.'
        }
        actions={
          <button onClick={onOpenScanPay} className="ib-btn-dark">
            <QrCode className="w-4 h-4" /> Scan any QR
          </button>
        }
      />

      {isPayments && (
        <Card padded={false}>
          <div className="p-5 pb-3">
            <CardHeader title="Bills due" description={`Paid from ${savings.name} (${savings.maskedNumber}) · Balance ${formatINR(savings.balance)}`} />
          </div>
          <ul className="divide-y divide-slate-100">
            {BILLERS.map((b) => {
              const Icon = b.icon;
              const paid = paidBills.includes(b.id);
              return (
                <li key={b.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500 truncate">{b.provider}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-900">{formatINR(b.due, { decimals: 0 })}</p>
                    <p className="text-[11px] text-slate-400">Due {b.dueDate}</p>
                  </div>
                  {paid ? (
                    <Badge tone="emerald" className="ml-2">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </Badge>
                  ) : (
                    <button onClick={() => payBill(b.id)} className="ib-btn-secondary py-1.5 px-3 text-xs ml-2">
                      Pay {formatINR(b.due, { decimals: 0 })}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
          <CardHeader
            title={isPayments ? 'Pay a person' : 'Send money'}
            description="Choose a saved beneficiary or add a new one"
            action={
              <button onClick={() => setShowAddPayee(!showAddPayee)} className="ib-btn-ghost text-xs py-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Add payee
              </button>
            }
          />

          {showAddPayee && (
            <form onSubmit={handleAddPayee} className="p-4 bg-slate-50 rounded-xl mb-4 space-y-3 border border-slate-200 ib-fade-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ib-label">Full name</label>
                  <input className="ib-input" value={newPayeeName} onChange={(e) => setNewPayeeName(e.target.value)} required />
                </div>
                <div>
                  <label className="ib-label">Account / UPI ID</label>
                  <input className="ib-input" value={newPayeeAcc} onChange={(e) => setNewPayeeAcc(e.target.value)} required />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddPayee(false)} className="ib-btn-secondary py-2 text-xs">
                  Cancel
                </button>
                <button type="submit" className="ib-btn-primary py-2 text-xs">
                  Save payee
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {payees.map((p) => {
              const selected = p.id === selectedPayeeId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPayeeId(p.id)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center ${
                    selected ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/10' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm mb-2 ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {p.avatar}
                  </div>
                  <span className="text-xs font-semibold text-slate-900 truncate w-full">{p.name}</span>
                  <span className="text-[10px] text-slate-500 truncate w-full">{p.bank || p.bankName}</span>
                </button>
              );
            })}
          </div>

          {isSuccess ? (
            <div className="mt-5 p-6 text-center rounded-2xl bg-emerald-50 border border-emerald-100 ib-pop">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-bold text-slate-900 mt-2">Transfer successful</h4>
              <p className="text-sm text-slate-600 mt-1">
                {formatINR(parseFloat(amount))} sent to {selectedPayee.name} via {transferMode}.
              </p>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setAmount('');
                  setNote('');
                }}
                className="ib-btn-primary mt-4"
              >
                Make another transfer
              </button>
            </div>
          ) : (
            <form onSubmit={handleTransfer} className="mt-5 pt-5 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                <span className="text-slate-500">To</span>
                <span className="font-semibold text-slate-900">
                  {selectedPayee.name} · <span className="font-mono text-slate-600">{selectedPayee.vpa || selectedPayee.accountNumber}</span>
                </span>
              </div>

              <div>
                <label className="ib-label">Payment network</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['IMPS', 'UPI', 'NEFT', 'RTGS'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTransferMode(m)}
                      className={`py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                        transferMode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ib-label">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      min="1"
                      required
                      className="ib-input pl-8 text-lg font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="ib-label">Note (optional)</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rent, dinner, gift…" className="ib-input" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  From {savings.name} · {formatINR(savings.balance)}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> OTP protected
                </span>
              </div>

              <button type="submit" className="ib-btn-primary w-full py-3">
                <Send className="w-4 h-4" /> Send {amount ? formatINR(parseFloat(amount) || 0, { decimals: 0 }) : 'money'}
              </button>
            </form>
          )}
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

          {!isPayments && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('ib:navigate', { detail: { tab: 'cards' } }))}
              className="w-full ib-card p-4 flex items-center gap-3 text-left hover:border-indigo-300 transition-colors cursor-pointer"
            >
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
