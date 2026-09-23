import React, { useState } from 'react';
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
} from 'lucide-react';
import { Page, PageHeader, Card, Badge } from '../ui/Primitives';

interface ServicesViewProps {
  onOpenGrievance: () => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ onOpenGrievance }) => {
  const [done, setDone] = useState<string[]>([]);
  const mark = (id: string) => setDone((d) => [...d, id]);

  const services = [
    { id: 'cheque', icon: BookOpen, title: 'Cheque book', desc: '25-leaf personalised book delivered to your address.', cta: 'Request', doneLabel: 'Dispatch scheduled' },
    { id: 'tds', icon: FileText, title: 'Interest & TDS certificate', desc: 'Form 16A and interest certificate for FY 2025-26.', cta: 'Download', doneLabel: 'Downloaded' },
    { id: 'locker', icon: Key, title: 'Safe deposit locker', desc: 'Check availability at your nearest branch.', cta: 'Check vacancy', doneLabel: 'Request received' },
    { id: 'address', icon: MapPin, title: 'Update address', desc: 'Change your communication address with e-KYC.', cta: 'Update', doneLabel: 'Under verification' },
    { id: 'mobile', icon: Smartphone, title: 'Update mobile number', desc: 'Change the number linked for OTP and alerts.', cta: 'Update', doneLabel: 'OTP verified' },
    { id: 'nominee', icon: UserCog, title: 'Nominee details', desc: 'Add or update the nominee on your accounts.', cta: 'Manage', doneLabel: 'Updated' },
  ];

  return (
    <Page>
      <PageHeader title="Services" subtitle="Self-service requests, certificates and security settings." />

      {/* Grievance banner */}
      <div className="rounded-2xl p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <Badge tone="emerald" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              Resolution under 24 hours
            </Badge>
            <h3 className="text-lg font-bold mt-2">Grievance & dispute desk</h3>
            <p className="text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Report a failed transaction, card dispute, cheque issue or statement query. Every complaint gets a tracked ticket.
            </p>
          </div>
        </div>
        <button onClick={onOpenGrievance} className="ib-btn bg-white text-slate-900 hover:bg-slate-100 px-4 py-2.5 shrink-0">
          Raise a complaint <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((s) => {
          const Icon = s.icon;
          const isDone = done.includes(s.id);
          return (
            <Card key={s.id} className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mt-3">{s.title}</h4>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed flex-1">{s.desc}</p>
              <div className="mt-4 pt-4 border-t border-slate-100">
                {isDone ? (
                  <span className="text-sm font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {s.doneLabel}
                  </span>
                ) : (
                  <button onClick={() => mark(s.id)} className="ib-btn-ghost text-sm -ml-3">
                    {s.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <Lock className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-slate-900">Security centre</h4>
            <p className="text-sm text-slate-500 mt-1">Manage login devices, transaction limits and two-factor authentication.</p>
            <button className="ib-btn-ghost text-sm -ml-3 mt-2">
              Open security settings <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Card>
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
      </div>
    </Page>
  );
};
