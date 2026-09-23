import React, { useState } from 'react';
import { SpendingCategory } from '../../types';
import { Card, CardHeader } from '../ui/Primitives';
import { formatINR } from '../../utils/format';

interface SpendingDonutChartProps {
  categories: SpendingCategory[];
}

type Range = 'This month' | 'Last month' | 'This year';

export const SpendingDonutChart: React.FC<SpendingDonutChartProps> = ({ categories }) => {
  const [timeRange, setTimeRange] = useState<Range>('This month');
  const [hovered, setHovered] = useState<SpendingCategory | null>(null);

  const multiplier = timeRange === 'This month' ? 1 : timeRange === 'Last month' ? 0.92 : 4.8;
  const current = categories.map((c) => ({ ...c, amount: Math.round(c.amount * multiplier) }));
  const total = current.reduce((acc, c) => acc + c.amount, 0);

  const radius = 64;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;

  return (
    <Card className="h-full">
      <CardHeader
        title="Spending insights"
        description="Where your money went"
        action={
          <div className="ib-seg" role="group" aria-label="Time range">
            {(['This month', 'Last month', 'This year'] as Range[]).map((r) => (
              <button key={r} onClick={() => setTimeRange(r)} aria-pressed={timeRange === r}>
                {r}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-44 h-44 shrink-0">
          <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#F1F5F9" strokeWidth={strokeWidth} />
            {current.map((cat) => {
              const pct = cat.amount / total;
              const dash = `${pct * circumference} ${circumference}`;
              const offset = -acc * circumference;
              acc += pct;
              const isHovered = hovered?.id === cat.id;
              return (
                <circle
                  key={cat.id}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHovered(cat)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {formatINR(hovered ? hovered.amount : total, { decimals: 0 })}
            </span>
            <span className="text-xs text-slate-500">{hovered ? hovered.name : 'Total spent'}</span>
          </div>
        </div>

        <ul className="flex-1 w-full space-y-1">
          {current.map((cat) => {
            const isHovered = hovered?.id === cat.id;
            return (
              <li
                key={cat.id}
                onMouseEnter={() => setHovered(cat)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center justify-between text-sm py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${
                  isHovered ? 'bg-slate-50' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-700">{cat.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900">{formatINR(cat.amount, { decimals: 0 })}</span>
                  <span className="text-xs text-slate-400 ml-2 tabular-nums">{cat.percentage.toFixed(0)}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
};
