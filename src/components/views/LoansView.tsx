import React, { useState } from 'react';
import { Coins, ShieldCheck, Zap, Calculator, Home, Car, GraduationCap, CheckCircle2 } from 'lucide-react';
import { UserSession } from '../../types';
import { Page, PageHeader, Card, CardHeader, Badge, StatTile } from '../ui/Primitives';
import { formatINR, firstName } from '../../utils/format';

interface LoansViewProps {
  user?: UserSession | null;
}

export const LoansView: React.FC<LoansViewProps> = ({ user }) => {
  const [loanAmount, setLoanAmount] = useState('500000');
  const [tenureYears, setTenureYears] = useState(3);
  const [applied, setApplied] = useState(false);
  const annualRate = 0.105;

  const principal = parseFloat(loanAmount) || 0;
  const r = annualRate / 12;
  const n = tenureYears * 12;
  const emi = Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  const totalPayable = emi * n;
  const totalInterest = totalPayable - principal;

  // Existing loan (matches Zora's core banking context)
  const outstanding = 342100;
  const sanctioned = 800000;
  const progress = Math.round(((sanctioned - outstanding) / sanctioned) * 100);

  return (
    <Page>
      <PageHeader title="Loans" subtitle="Track your existing loan and explore pre-approved offers." />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Active loan */}
        <Card className="lg:col-span-7">
          <CardHeader title="Smart Personal Loan" description="Loan account PL882910 · 10.50% p.a." action={<Badge tone="emerald">Regular</Badge>} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Outstanding" value={formatINR(outstanding, { decimals: 0 })} />
            <StatTile label="Monthly EMI" value="₹18,450" hint="Due 1st of month" />
            <StatTile label="EMIs left" value="22" hint="of 48" />
            <StatTile label="Next debit" value="01 Oct" hint="Auto-debit on" />
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Repaid {formatINR(sanctioned - outstanding, { decimals: 0 })} of {formatINR(sanctioned, { decimals: 0 })}</span>
              <span className="font-semibold text-slate-700">{progress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-5">
            <button className="ib-btn-secondary">Repayment schedule</button>
            <button className="ib-btn-secondary">Pre-pay / foreclose</button>
          </div>
        </Card>

        {/* Pre-approved */}
        <div className="lg:col-span-5 rounded-2xl p-6 text-white bg-gradient-to-br from-indigo-700 to-violet-800 flex flex-col">
          <Badge tone="indigo" className="self-start bg-white/15 text-white border-white/20">
            Pre-approved for {firstName(user?.name || 'you')}
          </Badge>
          <h3 className="text-2xl font-bold tracking-tight mt-3">Personal loan up to ₹10,00,000</h3>
          <p className="text-sm text-indigo-100 mt-2 leading-relaxed flex-1">
            No documents, no branch visit. Money in your savings account within minutes of accepting the offer.
          </p>
          <div className="flex items-center gap-4 mt-4 text-xs text-indigo-100">
            <span className="inline-flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> 10.50% p.a.
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Zero processing fee
            </span>
          </div>
          {applied ? (
            <div className="mt-5 p-3 rounded-xl bg-white/10 text-sm inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Offer accepted. Our team will call you shortly.
            </div>
          ) : (
            <button onClick={() => setApplied(true)} className="ib-btn mt-5 bg-white text-indigo-800 hover:bg-indigo-50 px-4 py-2.5 self-start">
              Accept offer
            </button>
          )}
        </div>
      </div>

      {/* EMI calculator */}
      <Card>
        <CardHeader title="EMI calculator" description="Personal loan at 10.50% p.a. reducing balance" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Loan amount</label>
                <span className="text-base font-bold text-indigo-700">{formatINR(principal, { decimals: 0 })}</span>
              </div>
              <input type="range" min="50000" max="1500000" step="25000" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="w-full accent-indigo-600 cursor-pointer" />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>₹50,000</span>
                <span>₹15,00,000</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Tenure</label>
                <span className="text-base font-bold text-indigo-700">
                  {tenureYears} {tenureYears === 1 ? 'year' : 'years'}
                </span>
              </div>
              <input type="range" min="1" max="5" step="1" value={tenureYears} onChange={(e) => setTenureYears(parseInt(e.target.value))} className="w-full accent-indigo-600 cursor-pointer" />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1 year</span>
                <span>5 years</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Monthly EMI</span>
              <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1">{formatINR(emi, { decimals: 0 })}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Total interest" value={formatINR(totalInterest, { decimals: 0 })} />
              <StatTile label="Total payable" value={formatINR(totalPayable, { decimals: 0 })} />
            </div>
            <button className="ib-btn-primary w-full py-3">
              <Calculator className="w-4 h-4" /> Apply for {formatINR(principal, { decimals: 0 })}
            </button>
          </div>
        </div>
      </Card>

      {/* Other products */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Home, title: 'Home loan', rate: 'from 8.35% p.a.', desc: 'Up to ₹5 Cr with 30-year tenure and doorstep documentation.' },
          { icon: Car, title: 'Car loan', rate: 'from 8.90% p.a.', desc: '100% on-road funding for new cars, approval in 30 minutes.' },
          { icon: GraduationCap, title: 'Education loan', rate: 'from 9.25% p.a.', desc: 'Collateral-free up to ₹40 lakh for studies in India and abroad.' },
        ].map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title} className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-3">{p.title}</h3>
              <p className="text-sm font-semibold text-indigo-700">{p.rate}</p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed flex-1">{p.desc}</p>
              <button className="ib-btn-ghost text-xs mt-3 -ml-3 self-start">
                Check eligibility <Coins className="w-3.5 h-3.5" />
              </button>
            </Card>
          );
        })}
      </div>
    </Page>
  );
};
