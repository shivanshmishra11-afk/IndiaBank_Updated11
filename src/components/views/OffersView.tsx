import React, { useState } from 'react';
import { Copy, Check, Tag } from 'lucide-react';
import { BANK_OFFERS } from '../../data/mockData';
import { Page, PageHeader, Badge } from '../ui/Primitives';

export const OffersView: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(BANK_OFFERS.map((o) => o.category)))];
  const visible = BANK_OFFERS.filter((o) => category === 'All' || o.category === category);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Page>
      <PageHeader title="Offers" subtitle="Deals on shopping, dining and travel, curated for India Bank customers." />

      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`ib-chip ${category === c ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((offer) => {
          const code = offer.code || 'CLAIMNOW';
          return (
            <div key={offer.id} className="ib-card overflow-hidden flex flex-col">
              <div className={`h-28 bg-gradient-to-br ${offer.color} p-5 text-white flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                  <Badge tone="slate" className="bg-white/15 text-white border-white/20">
                    {offer.category}
                  </Badge>
                  <Tag className="w-4 h-4 text-white/70" />
                </div>
                <p className="text-2xl font-bold tracking-tight">{offer.discount}</p>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-bold text-slate-900">{offer.title}</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed flex-1">{offer.description}</p>
                <p className="text-xs text-slate-400 mt-3">{offer.expiry}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="font-mono text-sm font-semibold text-slate-800 bg-slate-50 border border-dashed border-slate-300 px-3 py-1.5 rounded-lg">
                    {code}
                  </span>
                  <button onClick={() => handleCopy(code)} className="ib-btn-primary py-2 text-xs">
                    {copiedCode === code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode === code ? 'Copied' : 'Copy code'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
};
