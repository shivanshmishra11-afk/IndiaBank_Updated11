import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { CreditScoreData } from '../../types';
import { Card, Badge } from '../ui/Primitives';

interface CreditScoreGaugeProps {
  creditData: CreditScoreData;
  onViewReport: () => void;
}

export const CreditScoreGauge: React.FC<CreditScoreGaugeProps> = ({ creditData, onViewReport }) => {
  const percentage = Math.min(1, Math.max(0, (creditData.score - 300) / (creditData.maxScore - 300)));
  const angle = percentage * 180;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="ib-section-title">Credit score</h3>
        <Badge tone="emerald">{creditData.rating}</Badge>
      </div>

      <div className="flex items-center justify-between gap-4 mt-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{creditData.score}</span>
            <span className="text-sm font-medium text-slate-400">/ {creditData.maxScore}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Updated {creditData.updatedDate}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> CIBIL TransUnion
          </p>
        </div>

        <div className="relative w-32 h-[74px] shrink-0">
          <svg viewBox="0 0 120 70" className="w-32 h-[74px]">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F87171" />
                <stop offset="40%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none" stroke="#F1F5F9" strokeWidth="10" strokeLinecap="round" />
            <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round" />
            <g transform={`rotate(${angle - 90} 60 60)`}>
              <line x1="60" y1="60" x2="60" y2="24" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="60" cy="60" r="4.5" fill="#0F172A" />
              <circle cx="60" cy="60" r="2" fill="#FFFFFF" />
            </g>
          </svg>
        </div>
      </div>

      <button onClick={onViewReport} className="ib-btn-ghost text-xs mt-3 -ml-3">
        View full report <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </Card>
  );
};
