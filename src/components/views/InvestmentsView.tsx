import React, { useState } from 'react';
import { Landmark, TrendingUp, Coins, ArrowUpRight, PiggyBank } from 'lucide-react';
import { Page, PageHeader, Card, CardHeader, Badge, StatTile } from '../ui/Primitives';
import { formatINR } from '../../utils/format';
import { useBank } from '../../store/BankStore';

interface InvestmentsViewProps {
  onOpenFdModal: () => void;
}

const FUND_HOLDINGS = [
  { name: 'Nifty 50 Index Fund (Direct)', type: 'Mutual fund', value: 312400, change: '+28.4%', positive: true },
  { name: 'Flexi Cap Fund (Direct)', type: 'Mutual fund', value: 286900, change: '+22.1%', positive: true },
  { name: 'Corporate Bond Fund', type: 'Debt', value: 214900, change: '+7.9%', positive: true },
];

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({ onOpenFdModal }) => {
  const { accounts } = useBank();
  const HOLDINGS = [
    ...accounts
      .filter((a) => a.type === 'Fixed Deposit' || a.type === 'Recurring Deposit')
      .map((a) => ({ name: `${a.name} · ${a.accountNumber}`, type: 'Deposit', value: a.balance, change: `+${a.interestRate}`, positive: true })),
    ...FUND_HOLDINGS,
  ];
  const [calcAmount, setCalcAmount] = useState('200000');
  const [calcTenure, setCalcTenure] = useState(24);

  const principal = parseFloat(calcAmount) || 0;
  const rate = 0.0675;
  const maturity = Math.round(principal * Math.pow(1 + rate / 4, 4 * (calcTenure / 12)));
  const interest = maturity - principal;

  const total = HOLDINGS.reduce((s, h) => s + h.value, 0);

  return (
    <Page>
      <PageHeader
        title="Investments"
        subtitle="Deposits, mutual funds and bonds — all in one place."
        actions={
          <button onClick={onOpenFdModal} className="ib-btn-primary">
            <Landmark className="w-4 h-4" /> Book fixed deposit
          </button>
        }
      />

      {/* Portfolio summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 rounded-2xl p-6 text-white bg-gradient-to-br from-slate-900 to-slate-800">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Portfolio value</span>
          <p className="text-3xl font-bold tracking-tight mt-2">{formatINR(total)}</p>
          <p className="text-sm text-emerald-400 font-semibold mt-1 inline-flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" /> +₹1,64,200 (+25.2%) overall
          </p>
          <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/10 text-sm">
            <div>
              <span className="text-slate-400 text-xs block">Invested</span>
              <span className="font-semibold">₹6,50,000</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">Active SIPs</span>
              <span className="font-semibold">3 · ₹15,000/mo</span>
            </div>
          </div>
        </div>

        <Card className="lg:col-span-8" padded={false}>
          <div className="p-5 pb-3">
            <CardHeader title="Holdings" description="Current value and returns" />
          </div>
          <ul className="divide-y divide-slate-100">
            {HOLDINGS.map((h) => (
              <li key={h.name} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
                  {h.type === 'Deposit' ? <PiggyBank className="w-4.5 h-4.5" /> : h.type === 'Debt' ? <Coins className="w-4.5 h-4.5" /> : <TrendingUp className="w-4.5 h-4.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{h.name}</p>
                  <p className="text-xs text-slate-500">{h.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatINR(h.value, { decimals: 0 })}</p>
                  <p className={`text-xs font-semibold ${h.positive ? 'text-emerald-600' : 'text-rose-600'}`}>{h.change}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Products */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { badge: 'High yield', tone: 'indigo' as const, title: 'Fixed deposit', headline: '6.75% p.a.', desc: 'DICGC insured up to ₹5 lakh. Book instantly, no paperwork.', cta: 'Open FD', action: onOpenFdModal },
          { badge: 'Government backed', tone: 'amber' as const, title: 'Sovereign Gold Bond', headline: '2.50% + gold', desc: 'Annual coupon plus gold price appreciation. Series 2026-IV open.', cta: 'Apply' },
          { badge: 'Zero commission', tone: 'sky' as const, title: 'Direct mutual funds', headline: 'SIP from ₹500', desc: '1,200+ schemes with no upfront commission.', cta: 'Explore funds' },
        ].map((p) => (
          <Card key={p.title} className="flex flex-col">
            <Badge tone={p.tone} className="self-start">
              {p.badge}
            </Badge>
            <h3 className="text-base font-bold text-slate-900 mt-3">{p.title}</h3>
            <p className="text-2xl font-bold text-indigo-700 tracking-tight mt-1">{p.headline}</p>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed flex-1">{p.desc}</p>
            <button onClick={p.action} className="ib-btn-secondary mt-4 self-start">
              {p.cta}
            </button>
          </Card>
        ))}
      </div>

      {/* FD calculator */}
      <Card>
        <CardHeader title="FD calculator" description="See what your deposit grows to at 6.75% p.a., compounded quarterly" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Deposit amount</label>
                <span className="text-base font-bold text-indigo-700">{formatINR(principal, { decimals: 0 })}</span>
              </div>
              <input type="range" min="10000" max="1000000" step="10000" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} className="w-full accent-indigo-600 cursor-pointer" />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>₹10,000</span>
                <span>₹10,00,000</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Tenure</label>
                <span className="text-base font-bold text-indigo-700">{calcTenure} months</span>
              </div>
              <input type="range" min="6" max="60" step="6" value={calcTenure} onChange={(e) => setCalcTenure(parseInt(e.target.value))} className="w-full accent-indigo-600 cursor-pointer" />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>6 months</span>
                <span>60 months</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Interest earned" value={`+${formatINR(interest, { decimals: 0 })}`} tone="positive" />
              <StatTile label="Maturity value" value={formatINR(maturity, { decimals: 0 })} />
            </div>
            <button onClick={onOpenFdModal} className="ib-btn-primary w-full py-3">
              Book FD for {formatINR(principal, { decimals: 0 })}
            </button>
          </div>
        </div>
      </Card>
    </Page>
  );
};
