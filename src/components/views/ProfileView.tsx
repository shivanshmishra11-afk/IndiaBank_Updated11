import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, KeyRound, Smartphone, Laptop, Bell, SlidersHorizontal, LogOut, RotateCcw, CheckCircle2, Mail, MapPin, Phone, Fingerprint, Globe, AlertTriangle } from 'lucide-react';
import { UserSession } from '../../types';
import { Page, PageHeader, Card, CardHeader, Badge, Divider } from '../ui/Primitives';
import { ModalShell } from '../ui/Motion';
import { useBank } from '../../store/BankStore';
import { safeStorage } from '../../utils/storage';
import { formatINR } from '../../utils/format';

interface ProfileViewProps {
  user: UserSession;
  onLogout: () => void;
}

const PREFS_KEY = 'indiabank_prefs_v1';

interface Prefs {
  limits: { upi: number; imps: number; card: number };
  alerts: { sms: boolean; email: boolean; push: boolean; whatsapp: boolean; debitsAbove: number };
  security: { biometric: boolean; intlCard: boolean; loginOtp: boolean };
}

const DEFAULT_PREFS: Prefs = {
  limits: { upi: 100000, imps: 500000, card: 250000 },
  alerts: { sms: true, email: true, push: true, whatsapp: false, debitsAbove: 500 },
  security: { biometric: true, intlCard: true, loginOtp: true },
};

function loadPrefs(): Prefs {
  try {
    const raw = safeStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFS;
}

const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <label className="flex items-center justify-between gap-4 py-2.5 cursor-pointer select-none">
    <span>
      <span className="text-sm font-medium text-slate-800 block">{label}</span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </span>
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="ib-switch" aria-label={label} />
  </label>
);

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onLogout }) => {
  const { pushNotification, resetDemo, createRequest } = useBank();
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [modal, setModal] = useState<'password' | 'mpin' | 'reset' | null>(null);
  const [saved, setSaved] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    try {
      safeStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const update = <K extends keyof Prefs>(k: K, v: Partial<Prefs[K]>) => {
    setPrefs((p) => ({ ...p, [k]: { ...p[k], ...v } }));
    flashSaved();
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pw.next.length < 8 || !/[A-Z]/.test(pw.next) || !/\d/.test(pw.next)) return setPwError('Use at least 8 characters with an uppercase letter and a number.');
    if (pw.next !== pw.confirm) return setPwError('New password and confirmation do not match.');
    pushNotification({ title: modal === 'mpin' ? 'MPIN changed' : 'Password changed', body: `Your NetBanking ${modal === 'mpin' ? 'MPIN' : 'password'} was updated from a trusted browser. Not you? Call 1800 202 6161.`, kind: 'security', tab: 'profile' });
    setModal(null);
    setPw({ current: '', next: '', confirm: '' });
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <Page>
      <PageHeader
        title="Profile & settings"
        subtitle="Your details, security controls, transaction limits and alert preferences."
        actions={
          <AnimatePresence>
            {saved && (
              <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </motion.span>
            )}
          </AnimatePresence>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Identity */}
        <Card className="lg:col-span-5">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-indigo-600/25">{initials}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate">{user.name}</h2>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge tone="emerald">
                  <ShieldCheck className="w-3 h-3" /> KYC verified
                </Badge>
                <Badge tone="indigo">Privilege banking</Badge>
              </div>
            </div>
          </div>
          <Divider className="my-5" />
          <dl className="text-sm space-y-3">
            {[
              { icon: User, k: 'Customer ID', v: 'CUST-INB-7729104' },
              { icon: Phone, k: 'Registered mobile', v: '+91 98••• ••210' },
              { icon: Mail, k: 'Email', v: user.email },
              { icon: MapPin, k: 'Communication address', v: '14B, Marine Drive, Nariman Point, Mumbai 400021' },
              { icon: Globe, k: 'Home branch', v: 'Nariman Point · IFSC INBA0001042' },
              { icon: Fingerprint, k: 'PAN / Aadhaar', v: 'ABCPM••••K · ••••-••••-4471' },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.k} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <dt className="text-xs text-slate-500">{r.k}</dt>
                    <dd className="font-medium text-slate-900 break-words">{r.v}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <button onClick={() => createRequest('Address update', 'Change of communication address via e-KYC', '3 working days')} className="ib-btn-secondary text-xs">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Update address
            </button>
            <button onClick={() => createRequest('Mobile number update', 'Change registered mobile number (OTP verified)', '1 working day')} className="ib-btn-secondary text-xs">
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> Update mobile
            </button>
          </div>
        </Card>

        {/* Security */}
        <Card className="lg:col-span-7">
          <CardHeader title="Security" description="Login, authentication and device controls" action={<Badge tone="emerald">Last login today · Mumbai</Badge>} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={() => setModal('password')} className="ib-card ib-card-hover p-4 text-left cursor-pointer flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </span>
              <span>
                <span className="text-sm font-semibold text-slate-900 block">Change password</span>
                <span className="text-xs text-slate-500">Last changed 42 days ago</span>
              </span>
            </button>
            <button onClick={() => setModal('mpin')} className="ib-card ib-card-hover p-4 text-left cursor-pointer flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </span>
              <span>
                <span className="text-sm font-semibold text-slate-900 block">Change MPIN</span>
                <span className="text-xs text-slate-500">Used for the mobile app & UPI</span>
              </span>
            </button>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            <Switch checked={prefs.security.loginOtp} onChange={(v) => update('security', { loginOtp: v })} label="OTP on every login" hint="Two-factor authentication for NetBanking" />
            <Switch checked={prefs.security.biometric} onChange={(v) => update('security', { biometric: v })} label="Biometric lock on mobile app" hint="Face ID / fingerprint" />
            <Switch checked={prefs.security.intlCard} onChange={(v) => update('security', { intlCard: v })} label="International card usage" hint="Applies to Nexora Royale Infinite •••• 8842" />
          </div>
          <Divider className="my-4" />
          <span className="ib-eyebrow">Trusted devices</span>
          <ul className="mt-2 space-y-2">
            {[
              { icon: Laptop, name: 'This browser · macOS', meta: 'Mumbai · active now', current: true },
              { icon: Smartphone, name: 'iPhone 15 · India Bank app', meta: 'Mumbai · 2 hours ago', current: false },
            ].map((d) => {
              const Icon = d.icon;
              return (
                <li key={d.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-900 block">{d.name}</span>
                    <span className="text-xs text-slate-500">{d.meta}</span>
                  </span>
                  {d.current ? <Badge tone="emerald">Current</Badge> : <button onClick={() => pushNotification({ title: 'Device signed out', body: 'iPhone 15 was removed from trusted devices.', kind: 'security', tab: 'profile' })} className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer">Sign out</button>}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Limits */}
        <Card className="lg:col-span-7">
          <CardHeader title="Transaction limits" description="Per-day caps · changes take effect after a 30-minute security delay" action={<SlidersHorizontal className="w-4 h-4 text-slate-400" />} />
          <div className="space-y-5">
            {(
              [
                { key: 'upi', label: 'UPI', max: 100000, step: 5000 },
                { key: 'imps', label: 'IMPS / NEFT / RTGS', max: 2000000, step: 50000 },
                { key: 'card', label: 'Debit card · POS & online', max: 500000, step: 10000 },
              ] as const
            ).map((l) => (
              <div key={l.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-800">{l.label}</span>
                  <span className="ib-num text-sm font-bold text-indigo-700">{formatINR(prefs.limits[l.key], { decimals: 0 })}</span>
                </div>
                <input type="range" min={l.step} max={l.max} step={l.step} value={prefs.limits[l.key]} onChange={(e) => update('limits', { [l.key]: parseInt(e.target.value) } as any)} className="w-full accent-indigo-600 cursor-pointer" aria-label={`${l.label} daily limit`} />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>{formatINR(l.step, { decimals: 0 })}</span>
                  <span>{formatINR(l.max, { decimals: 0 })}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts */}
        <Card className="lg:col-span-5">
          <CardHeader title="Alerts" description="How we reach you about account activity" action={<Bell className="w-4 h-4 text-slate-400" />} />
          <div className="divide-y divide-slate-100">
            <Switch checked={prefs.alerts.sms} onChange={(v) => update('alerts', { sms: v })} label="SMS" hint="+91 98••• ••210" />
            <Switch checked={prefs.alerts.email} onChange={(v) => update('alerts', { email: v })} label="Email" hint={user.email} />
            <Switch checked={prefs.alerts.push} onChange={(v) => update('alerts', { push: v })} label="App push notifications" />
            <Switch checked={prefs.alerts.whatsapp} onChange={(v) => update('alerts', { whatsapp: v })} label="WhatsApp" hint="Statements and reminders" />
          </div>
          <div className="mt-3">
            <label className="ib-label">Alert me for debits above</label>
            <select value={prefs.alerts.debitsAbove} onChange={(e) => update('alerts', { debitsAbove: parseInt(e.target.value) })} className="ib-input py-2">
              {[1, 100, 500, 1000, 5000].map((v) => (
                <option key={v} value={v}>
                  {v === 1 ? 'Every debit' : formatINR(v, { decimals: 0 })}
                </option>
              ))}
            </select>
          </div>
        </Card>
      </div>

      {/* Session */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-900">Session & demo data</p>
          <p className="text-xs text-slate-500 mt-0.5">Signed in {user.loginTime}. Reset restores the opening balances, statement, beneficiaries and the credit card ledger.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal('reset')} className="ib-btn-secondary">
            <RotateCcw className="w-4 h-4 text-slate-500" /> Reset demo data
          </button>
          <button onClick={onLogout} className="ib-btn-dark">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </Card>

      {/* Password / MPIN modal */}
      <ModalShell open={modal === 'password' || modal === 'mpin'} onClose={() => setModal(null)} maxWidth="max-w-md" labelledBy="pw-title">
        <form onSubmit={submitPassword} className="p-6 space-y-4">
          <h3 id="pw-title" className="text-lg font-bold text-slate-900">{modal === 'mpin' ? 'Change MPIN' : 'Change password'}</h3>
          <div>
            <label className="ib-label">Current {modal === 'mpin' ? 'MPIN' : 'password'}</label>
            <input type="password" className="ib-input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
          </div>
          <div>
            <label className="ib-label">New {modal === 'mpin' ? 'MPIN' : 'password'}</label>
            <input type="password" className="ib-input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
          </div>
          <div>
            <label className="ib-label">Confirm</label>
            <input type="password" className="ib-input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
          </div>
          {pwError && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {pwError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setModal(null)} className="ib-btn-secondary">Cancel</button>
            <button type="submit" className="ib-btn-primary">Update</button>
          </div>
        </form>
      </ModalShell>

      {/* Reset confirm */}
      <ModalShell open={modal === 'reset'} onClose={() => setModal(null)} maxWidth="max-w-sm">
        <div className="p-6">
          <h3 className="text-base font-bold text-slate-900">Reset demo data?</h3>
          <p className="text-sm text-slate-500 mt-1">Balances return to the opening position, the statement is re-seeded and the card outstanding goes back to ₹87,500.</p>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setModal(null)} className="ib-btn-secondary">Cancel</button>
            <button onClick={() => { setModal(null); resetDemo(); }} className="ib-btn-primary">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      </ModalShell>
    </Page>
  );
};
