import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  BookOpen,
  Key,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Smartphone,
  UserCog,
  Lock,
  PhoneCall,
  Clock,
  Loader2,
  Ban,
  Bell,
  Users,
  PiggyBank,
} from 'lucide-react';
import { NavTab, ServiceRequest } from '../../types';
import { Page, PageHeader, Card, CardHeader, Badge, EmptyState } from '../ui/Primitives';
import { MotionList, MotionRow, ModalShell } from '../ui/Motion';
import { useBank, timeAgo } from '../../store/BankStore';

interface ServicesViewProps {
  onOpenGrievance: () => void;
  onNavigate?: (tab: NavTab) => void;
}

interface ServiceDef {
  id: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  cta: string;
  eta: string;
  fields?: { key: string; label: string; type?: 'text' | 'select' | 'textarea'; options?: string[]; placeholder?: string }[];
  instant?: boolean;
}

const SERVICES: ServiceDef[] = [
  { id: 'Cheque book', icon: BookOpen, title: 'Cheque book', desc: 'Personalised book delivered to your registered address.', cta: 'Request', eta: '4 working days', fields: [{ key: 'leaves', label: 'Number of leaves', type: 'select', options: ['25 leaves', '50 leaves', '100 leaves'] }, { key: 'account', label: 'Account', type: 'select', options: ['Savings AC1000231234', 'Current AC1000235678'] }] },
  { id: 'Interest & TDS certificate', icon: FileText, title: 'Interest & TDS certificate', desc: 'Form 16A and interest certificate for FY 2025-26.', cta: 'Download', eta: 'Instant', instant: true },
  { id: 'Safe deposit locker', icon: Key, title: 'Safe deposit locker', desc: 'Check availability at your nearest branch.', cta: 'Check vacancy', eta: '2 working days', fields: [{ key: 'size', label: 'Locker size', type: 'select', options: ['Small', 'Medium', 'Large'] }, { key: 'branch', label: 'Preferred branch', placeholder: 'Nariman Point' }] },
  { id: 'Address update', icon: MapPin, title: 'Update address', desc: 'Change your communication address with e-KYC.', cta: 'Update', eta: '3 working days', fields: [{ key: 'address', label: 'New address', type: 'textarea', placeholder: 'Flat, street, city, PIN' }] },
  { id: 'Mobile number update', icon: Smartphone, title: 'Update mobile number', desc: 'Change the number linked for OTP and alerts.', cta: 'Update', eta: '1 working day', fields: [{ key: 'mobile', label: 'New mobile number', placeholder: '+91' }] },
  { id: 'Nominee update', icon: UserCog, title: 'Nominee details', desc: 'Add or update the nominee on your accounts.', cta: 'Manage', eta: '2 working days', fields: [{ key: 'name', label: 'Nominee name' }, { key: 'relation', label: 'Relationship', type: 'select', options: ['Spouse', 'Parent', 'Child', 'Sibling', 'Other'] }] },
  { id: 'Stop cheque', icon: Ban, title: 'Stop cheque payment', desc: 'Block a cheque you have issued before it is presented.', cta: 'Stop cheque', eta: 'Instant', fields: [{ key: 'cheque', label: 'Cheque number', placeholder: '6 digits' }, { key: 'reason', label: 'Reason', type: 'select', options: ['Lost', 'Stolen', 'Issued in error', 'Dispute with payee'] }] },
  { id: 'Balance confirmation letter', icon: FileText, title: 'Balance confirmation letter', desc: 'Bank-attested letter for visa, tender or audit needs.', cta: 'Request', eta: '1 working day', fields: [{ key: 'purpose', label: 'Purpose', type: 'select', options: ['Visa', 'Tender / contract', 'Audit', 'Other'] }] },
];

const STATUS_TONE: Record<ServiceRequest['status'], 'amber' | 'indigo' | 'emerald'> = { Received: 'amber', 'In progress': 'indigo', Completed: 'emerald' };

export const ServicesView: React.FC<ServicesViewProps> = ({ onOpenGrievance, onNavigate }) => {
  const { requests, createRequest, pushNotification } = useBank();
  const [active, setActive] = useState<ServiceDef | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [justRaised, setJustRaised] = useState<ServiceRequest | null>(null);

  const open = (s: ServiceDef) => {
    if (s.instant && !s.fields) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([`INDIA BANK\nInterest certificate & Form 16A · FY 2025-26\nCustomer CUST-INB-7729104\nInterest paid: ₹33,750.00 (FD) + ₹4,982.42 (Savings)\nTDS deducted: ₹3,375.00\nDigitally signed ${new Date().toLocaleDateString('en-IN')}`], { type: 'text/plain' }));
      a.download = 'IndiaBank_Interest_TDS_FY2025-26.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      pushNotification({ title: 'Interest & TDS certificate downloaded', body: 'FY 2025-26 certificate generated and available in your documents.', kind: 'service', tab: 'services' });
      return;
    }
    setValues(Object.fromEntries((s.fields || []).map((f) => [f.key, f.type === 'select' ? f.options?.[0] || '' : ''])));
    setActive(s);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    const details = (active.fields || []).map((f) => `${f.label}: ${values[f.key] || '—'}`).join(' · ');
    const r = createRequest(active.id, details || active.desc, active.eta);
    setActive(null);
    setJustRaised(r);
  };

  return (
    <Page>
      <PageHeader title="Services & requests" subtitle="Self-service requests with a tracked reference number, plus certificates and security settings." />

      {/* Grievance banner */}
      <div className="rounded-2xl p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="ib-drift absolute -right-20 -top-20 w-64 h-64 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="flex items-start gap-4 relative">
          <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <Badge tone="emerald" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              Resolution under 24 hours
            </Badge>
            <h3 className="text-lg font-bold mt-2">Grievance & dispute desk</h3>
            <p className="text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">Report a failed transaction, card dispute, cheque issue or statement query. Every complaint gets a tracked ticket.</p>
          </div>
        </div>
        <button onClick={onOpenGrievance} className="ib-btn-secondary bg-white text-slate-900 hover:bg-slate-100 shrink-0 relative">
          Raise a complaint <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Request tracker */}
      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader title="Your requests" description={requests.length ? `${requests.filter((r) => r.status !== 'Completed').length} open · ${requests.filter((r) => r.status === 'Completed').length} completed` : 'Requests you raise appear here with live status'} />
        </div>
        <MotionList className="divide-y divide-slate-100">
          {requests.map((r) => (
            <MotionRow key={r.id} highlight className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${r.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : r.status === 'In progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                  {r.status === 'Completed' ? <CheckCircle2 className="w-4 h-4" /> : r.status === 'In progress' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{r.type}</p>
                    <span className="font-mono text-xs text-slate-400">{r.id}</span>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{r.details}</p>
                  {/* Timeline */}
                  <ol className="mt-3 flex items-center gap-0">
                    {r.steps.map((s, i) => {
                      const done = !!s.at;
                      const current = !done && (i === 0 || !!r.steps[i - 1].at);
                      return (
                        <li key={s.label} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center min-w-0">
                            <motion.span layout className={`w-3 h-3 rounded-full border-2 ${done ? 'bg-indigo-600 border-indigo-600' : current ? 'bg-white border-indigo-400 ring-4 ring-indigo-100' : 'bg-white border-slate-300'}`} />
                            <span className={`text-[10px] mt-1 whitespace-nowrap ${done ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{s.label}</span>
                          </div>
                          {i < r.steps.length - 1 && <div className="flex-1 h-0.5 mx-1.5 -mt-4 bg-slate-200 relative overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: done ? '100%' : '0%' }} transition={{ duration: 0.6 }} className="absolute inset-y-0 left-0 bg-indigo-600" /></div>}
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-slate-500">Raised {timeAgo(r.createdAt)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">ETA {r.eta}</p>
                </div>
              </div>
            </MotionRow>
          ))}
        </MotionList>
        {requests.length === 0 && <EmptyState icon={<Clock className="w-5 h-5" />} title="No service requests yet" description="Pick a service below. You'll get a reference number and can track it here." />}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          const openReq = requests.find((r) => r.type === s.id && r.status !== 'Completed');
          return (
            <Card key={s.id} className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mt-3">{s.title}</h4>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed flex-1">{s.desc}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                {openReq ? (
                  <span className="text-xs font-semibold text-indigo-700 inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {openReq.status} · {openReq.id}
                  </span>
                ) : (
                  <button onClick={() => open(s)} className="ib-btn-ghost text-sm -ml-3">
                    {s.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <span className="text-[11px] text-slate-400">{s.eta}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Lock, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', title: 'Security centre', desc: 'Login devices, transaction limits and two-factor authentication.', cta: 'Open settings', tab: 'profile' as NavTab },
          { icon: Users, tone: 'bg-indigo-50 text-indigo-700 border-indigo-100', title: 'Beneficiaries', desc: 'Add, verify or remove the people and businesses you pay.', cta: 'Manage payees', tab: 'beneficiaries' as NavTab },
          { icon: PiggyBank, tone: 'bg-amber-50 text-amber-700 border-amber-100', title: 'Deposits', desc: 'Open a fixed or recurring deposit at up to 6.75% p.a.', cta: 'View rates', tab: 'deposits' as NavTab },
        ].map((i) => {
          const Icon = i.icon;
          return (
            <Card key={i.title} className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${i.tone}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-900">{i.title}</h4>
                <p className="text-sm text-slate-500 mt-1">{i.desc}</p>
                <button onClick={() => onNavigate?.(i.tab)} className="ib-btn-ghost text-sm -ml-3 mt-2">
                  {i.cta} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
          <PhoneCall className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1">
          <h4 className="text-base font-bold text-slate-900">Talk to us</h4>
          <p className="text-sm text-slate-500 mt-1">
            24x7 helpline <strong className="text-slate-800">1800 202 6161</strong> · Lost card hotline <strong className="text-slate-800">1800 425 3800</strong>
          </p>
          <p className="text-xs text-slate-400 mt-2">Or ask Zora from the button at the bottom right.</p>
        </div>
      </Card>

      {/* Request form */}
      <ModalShell open={!!active} onClose={() => setActive(null)} labelledBy="svc-title">
        {active && (
          <form onSubmit={submit} className="p-6 space-y-4">
            <div>
              <span className="ib-eyebrow text-indigo-600">Service request</span>
              <h3 id="svc-title" className="text-lg font-bold text-slate-900 mt-1">{active.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{active.desc} Expected completion: {active.eta}.</p>
            </div>
            {(active.fields || []).map((f) => (
              <div key={f.key}>
                <label className="ib-label">{f.label}</label>
                {f.type === 'select' ? (
                  <select className="ib-input" value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>
                    {f.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="ib-input min-h-24" value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} placeholder={f.placeholder} required />
                ) : (
                  <input className="ib-input" value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} placeholder={f.placeholder} required />
                )}
              </div>
            ))}
            <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> You'll be notified at each stage by SMS, email and here.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setActive(null)} className="ib-btn-secondary">Cancel</button>
              <button type="submit" className="ib-btn-primary">Submit request</button>
            </div>
          </form>
        )}
      </ModalShell>

      <ModalShell open={!!justRaised} onClose={() => setJustRaised(null)} maxWidth="max-w-sm">
        {justRaised && (
          <div className="p-8 text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }} className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </motion.div>
            <h3 className="text-lg font-bold text-slate-900 mt-3">Request raised</h3>
            <p className="text-sm text-slate-500 mt-1">
              {justRaised.type} · reference <span className="font-mono font-semibold text-indigo-700">{justRaised.id}</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">Expected completion in {justRaised.eta}. Track it above.</p>
            <button onClick={() => setJustRaised(null)} className="ib-btn-primary w-full mt-5">Done</button>
          </div>
        )}
      </ModalShell>
    </Page>
  );
};
