import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Send, Trash2, ShieldCheck, Clock, Building2, AtSign, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Beneficiary } from '../../types';
import { Page, PageHeader, Card, CardHeader, Badge, StatTile, EmptyState } from '../ui/Primitives';
import { MotionList, MotionRow, ModalShell, SuccessBurst } from '../ui/Motion';
import { useBank, timeAgo } from '../../store/BankStore';

interface BeneficiariesViewProps {
  onSendMoney: (beneficiaryId: string) => void;
}

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'India Bank', 'Paytm Payments Bank', 'Yes Bank'];

/** Live countdown until a cooling beneficiary becomes active. */
const Cooldown: React.FC<{ until: number }> = ({ until }) => {
  const [left, setLeft] = useState(Math.max(0, until - Date.now()));
  useEffect(() => {
    const t = window.setInterval(() => setLeft(Math.max(0, until - Date.now())), 1000);
    return () => window.clearInterval(t);
  }, [until]);
  const s = Math.ceil(left / 1000);
  return (
    <Badge tone="amber">
      <Clock className="w-3 h-3" /> Activates in {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </Badge>
  );
};

export const BeneficiariesView: React.FC<BeneficiariesViewProps> = ({ onSendMoney }) => {
  const { beneficiaries, addBeneficiary, removeBeneficiary } = useBank();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Beneficiary | null>(null);
  const [added, setAdded] = useState<Beneficiary | null>(null);

  // Add form
  const [mode, setMode] = useState<'account' | 'upi'>('account');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bank, setBank] = useState(BANKS[0]);
  const [acc, setAcc] = useState('');
  const [acc2, setAcc2] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [vpa, setVpa] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName(''); setNickname(''); setBank(BANKS[0]); setAcc(''); setAcc2(''); setIfsc(''); setVpa(''); setOtp(''); setOtpSent(false); setError(null); setMode('account');
  };

  const filtered = beneficiaries.filter((b) => `${b.name} ${b.nickname || ''} ${b.bank} ${b.vpa || ''} ${b.accountNumber || ''}`.toLowerCase().includes(query.toLowerCase()));
  const active = beneficiaries.filter((b) => b.status === 'Active').length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 3) return setError('Enter the beneficiary name as it appears on their bank account.');
    if (mode === 'account') {
      if (!/^\d{9,18}$/.test(acc)) return setError('Account number must be 9–18 digits.');
      if (acc !== acc2) return setError('Account numbers do not match.');
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc)) return setError('IFSC looks wrong — it is 11 characters, e.g. HDFC0000240.');
    } else if (!/^[\w.\-]{2,}@[a-z]{2,}$/i.test(vpa)) {
      return setError('Enter a valid UPI ID, e.g. name@okhdfcbank.');
    }
    if (!otpSent) {
      setOtpSent(true);
      setOtp('4920');
      return;
    }
    if (otp.length < 4) return setError('Enter the 4-digit OTP sent to your registered mobile.');
    const b = addBeneficiary({
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      bank: mode === 'upi' ? 'UPI' : bank,
      accountNumber: mode === 'account' ? acc : undefined,
      ifsc: mode === 'account' ? ifsc.toUpperCase() : undefined,
      vpa: mode === 'upi' ? vpa.toLowerCase() : undefined,
    });
    setAdded(b);
    setAdding(false);
    reset();
  };

  return (
    <Page>
      <PageHeader
        title="Beneficiaries"
        subtitle="People and businesses you pay. New payees go through a short security cooling period before the first transfer."
        actions={
          <button onClick={() => setAdding(true)} className="ib-btn-primary">
            <UserPlus className="w-4 h-4" /> Add beneficiary
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Saved payees" value={String(beneficiaries.length)} />
        <StatTile label="Active" value={String(active)} tone="positive" />
        <StatTile label="In cooling" value={String(beneficiaries.length - active)} hint="security hold" />
        <StatTile label="Daily limit" value="₹5,00,000" hint="IMPS / UPI per day" />
      </div>

      <Card padded={false}>
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <CardHeader title="Saved beneficiaries" description="Tap a payee to send money" />
          <div className="relative -mt-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="ib-input pl-9 py-2 w-40 sm:w-56" />
          </div>
        </div>
        <MotionList className="divide-y divide-slate-100">
          {filtered.map((b) => (
            <MotionRow key={b.id} highlight={b.status === 'Cooling'} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/70 transition-colors">
              <span className={`w-11 h-11 rounded-full font-bold flex items-center justify-center text-sm shrink-0 ${b.status === 'Active' ? 'bg-indigo-600 text-white' : 'bg-amber-100 text-amber-800'}`}>{b.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                  {b.nickname && <span className="text-xs text-slate-400">“{b.nickname}”</span>}
                  {b.status === 'Active' ? (
                    <Badge tone="emerald">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </Badge>
                  ) : (
                    b.activatesAt && <Cooldown until={b.activatesAt} />
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {b.bank}
                  {b.vpa ? ` · ${b.vpa}` : b.accountNumber ? ` · A/C ••••${b.accountNumber.slice(-4)} · ${b.ifsc}` : ''}
                  {b.transferCount > 0 && ` · ${b.transferCount} transfer${b.transferCount === 1 ? '' : 's'}`}
                  {b.lastPaidAt && ` · last paid ${timeAgo(b.lastPaidAt)}`}
                </p>
              </div>
              <button onClick={() => onSendMoney(b.id)} disabled={b.status !== 'Active'} className="ib-btn-secondary py-1.5 px-3 text-xs" title={b.status !== 'Active' ? 'Available after the cooling period' : 'Send money'}>
                <Send className="w-3.5 h-3.5 text-indigo-600" /> <span className="hidden sm:inline">Send</span>
              </button>
              <button onClick={() => setConfirmDelete(b)} className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer" aria-label={`Remove ${b.name}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </MotionRow>
          ))}
        </MotionList>
        {filtered.length === 0 && <EmptyState title="No beneficiaries found" description={query ? 'Try a different name, bank or UPI ID.' : 'Add a payee to start sending money.'} action={<button onClick={() => setAdding(true)} className="ib-btn-primary text-xs py-2">Add beneficiary</button>} />}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Clock, tone: 'bg-amber-50 text-amber-700 border-amber-100', title: 'Cooling period', desc: 'A newly added payee can receive money only after a security hold (24 hours at the branch; shortened here for the demo).' },
          { icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', title: 'Name verification', desc: 'For account transfers we confirm the name with the beneficiary bank before the first payment goes out.' },
          { icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700 border-rose-100', title: 'Stay safe', desc: 'India Bank never asks you to add a beneficiary over a call. Report suspicious requests on 1800 202 6161.' },
        ].map((i) => {
          const Icon = i.icon;
          return (
            <Card key={i.title} className="flex items-start gap-3.5">
              <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${i.tone}`}>
                <Icon className="w-4.5 h-4.5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{i.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{i.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add beneficiary */}
      <ModalShell open={adding} onClose={() => { setAdding(false); reset(); }} labelledBy="add-ben-title">
        <form onSubmit={submit} className="p-6 space-y-5">
          <div>
            <span className="ib-eyebrow text-indigo-600">New payee</span>
            <h3 id="add-ben-title" className="text-lg font-bold text-slate-900 mt-1">Add a beneficiary</h3>
          </div>
          <div className="ib-seg w-full grid grid-cols-2">
            <button type="button" onClick={() => setMode('account')} aria-pressed={mode === 'account'} className="inline-flex items-center justify-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Bank account
            </button>
            <button type="button" onClick={() => setMode('upi')} aria-pressed={mode === 'upi'} className="inline-flex items-center justify-center gap-1.5">
              <AtSign className="w-3.5 h-3.5" /> UPI ID
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="ib-label">Beneficiary name</label>
              <input className="ib-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="As on their bank account" autoFocus />
            </div>
            {mode === 'account' ? (
              <>
                <div>
                  <label className="ib-label">Bank</label>
                  <select className="ib-input" value={bank} onChange={(e) => setBank(e.target.value)}>
                    {BANKS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ib-label">IFSC</label>
                  <input className="ib-input font-mono uppercase" value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="HDFC0000240" maxLength={11} />
                </div>
                <div>
                  <label className="ib-label">Account number</label>
                  <input className="ib-input font-mono" inputMode="numeric" value={acc} onChange={(e) => setAcc(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div>
                  <label className="ib-label">Confirm account number</label>
                  <input className="ib-input font-mono" inputMode="numeric" value={acc2} onChange={(e) => setAcc2(e.target.value.replace(/\D/g, ''))} onPaste={(e) => e.preventDefault()} />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="ib-label">UPI ID</label>
                <input className="ib-input font-mono" value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="name@okhdfcbank" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="ib-label">Nickname (optional)</label>
              <input className="ib-input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Landlord, Mom, Office rent…" />
            </div>
            <AnimatePresence>
              {otpSent && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="sm:col-span-2">
                  <label className="ib-label">OTP sent to +91 98••• ••210</label>
                  <input className="ib-input font-mono tracking-[0.4em] text-center text-lg" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" />
                  <p className="text-[11px] text-slate-400 mt-1">Demo OTP pre-filled: 4920</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setAdding(false); reset(); }} className="ib-btn-secondary">
              Cancel
            </button>
            <button type="submit" className="ib-btn-primary">
              {otpSent ? 'Verify & add' : 'Send OTP'}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Added confirmation */}
      <ModalShell open={!!added} onClose={() => setAdded(null)} maxWidth="max-w-sm">
        {added && (
          <div className="p-8 text-center">
            <SuccessBurst tone="indigo" className="mx-auto" />
            <h3 className="text-lg font-bold text-slate-900 mt-3">{added.name} added</h3>
            <p className="text-sm text-slate-500 mt-1">They'll be ready for transfers once the security cooling period ends. We'll notify you.</p>
            <button onClick={() => setAdded(null)} className="ib-btn-primary mt-5 w-full">
              <CheckCircle2 className="w-4 h-4" /> Done
            </button>
          </div>
        )}
      </ModalShell>

      {/* Delete confirmation */}
      <ModalShell open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
        {confirmDelete && (
          <div className="p-6">
            <h3 className="text-base font-bold text-slate-900">Remove {confirmDelete.name}?</h3>
            <p className="text-sm text-slate-500 mt-1">You'll need to add them again (with a fresh cooling period) to send money later.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="ib-btn-secondary">Keep</button>
              <button onClick={() => { removeBeneficiary(confirmDelete.id); setConfirmDelete(null); }} className="ib-btn-primary bg-rose-600 hover:bg-rose-700">
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </Page>
  );
};
