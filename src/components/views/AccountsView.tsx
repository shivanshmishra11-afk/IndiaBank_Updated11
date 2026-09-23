import React, { useState } from 'react';
import { Search, Download, ArrowUpRight, ArrowDownLeft, Building2, Landmark, PiggyBank, Send, Copy, Check } from 'lucide-react';
import { BankAccount, Transaction } from '../../types';
import { Page, PageHeader, Card, CardHeader, Badge, StatTile, EmptyState } from '../ui/Primitives';
import { formatINR } from '../../utils/format';

interface AccountsViewProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  onOpenActionModal: (action: string) => void;
}

const ICONS: Record<string, React.ElementType> = {
  Savings: Building2,
  Current: Landmark,
  'Fixed Deposit': PiggyBank,
  'Recurring Deposit': PiggyBank,
};

export const AccountsView: React.FC<AccountsViewProps> = ({ accounts, transactions, onOpenActionModal }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || 'acc-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Credits' | 'Debits'>('All');
  const [copied, setCopied] = useState(false);

  const active = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const filtered = transactions.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matches = t.merchant.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q);
    const type = filter === 'All' || (filter === 'Credits' ? t.type === 'credit' : t.type === 'debit');
    return matches && type;
  });

  const credits = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const debits = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  const copyAccount = () => {
    navigator.clipboard?.writeText(active.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Page>
      <PageHeader
        title="Accounts"
        subtitle="Balances, account details and your full statement history."
        actions={
          <>
            <button onClick={() => onOpenActionModal('statement')} className="ib-btn-secondary">
              <Download className="w-4 h-4 text-indigo-600" /> Statement
            </button>
            <button onClick={() => onOpenActionModal('send-money')} className="ib-btn-primary">
              <Send className="w-4 h-4" /> Transfer
            </button>
          </>
        }
      />

      {/* Account selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const Icon = ICONS[acc.type] || Building2;
          const selected = acc.id === selectedAccountId;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => setSelectedAccountId(acc.id)}
              aria-pressed={selected}
              className={`ib-card ib-card-hover p-5 text-left cursor-pointer ${selected ? 'border-indigo-500 ring-4 ring-indigo-500/10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <Badge tone="emerald">{acc.status}</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-600 mt-4">{acc.name}</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatINR(acc.balance)}</p>
              <p className="text-xs text-slate-400 font-mono mt-2">{acc.maskedNumber}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Details */}
        <Card className="lg:col-span-4 h-fit">
          <CardHeader title="Account details" description={active.name} />
          <dl className="text-sm divide-y divide-slate-100">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Account number</dt>
              <dd className="font-mono font-semibold text-slate-900 flex items-center gap-1.5">
                {active.accountNumber}
                <button onClick={copyAccount} className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer" aria-label="Copy">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">IFSC</dt>
              <dd className="font-mono font-semibold text-slate-900">{active.routingNumber}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Branch</dt>
              <dd className="font-medium text-slate-900">Nariman Point, Mumbai</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">{active.type === 'Fixed Deposit' ? 'Maturity' : 'Interest'}</dt>
              <dd className="font-medium text-slate-900">
                {active.type === 'Fixed Deposit' ? `${active.maturityDate} · ${active.interestRate}` : active.interestRate}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Nominee</dt>
              <dd className="font-medium text-slate-900">Registered</dd>
            </div>
          </dl>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <StatTile label="Money in" value={formatINR(credits, { decimals: 0 })} tone="positive" hint="This month" />
            <StatTile label="Money out" value={formatINR(debits, { decimals: 0 })} hint="This month" />
          </div>
        </Card>

        {/* Transactions */}
        <Card className="lg:col-span-8" padded={false}>
          <div className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="ib-section-title">Transactions</h3>
              <p className="text-xs text-slate-500 mt-0.5">{filtered.length} records</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="ib-input pl-9 py-2 w-44 sm:w-56"
                />
              </div>
              <div className="ib-seg" role="group" aria-label="Transaction type">
                {(['All', 'Credits', 'Debits'] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {filtered.map((t) => {
              const credit = t.type === 'credit';
              return (
                <li key={t.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/70 transition-colors">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      credit ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {credit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{t.merchant}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {t.category} · Ref {t.reference}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${credit ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {credit ? '+' : '−'}
                      {formatINR(t.amount)}
                    </p>
                    <p className="text-[11px] text-slate-400">{t.date}</p>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li>
                <EmptyState
                  title="No transactions match"
                  description={`Nothing in ${filter === 'All' ? 'your history' : filter.toLowerCase()} matches “${searchQuery}”. Try a merchant name or reference number.`}
                  action={
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilter('All');
                      }}
                      className="ib-btn-secondary text-xs py-2"
                    >
                      Clear filters
                    </button>
                  }
                />
              </li>
            )}
          </ul>
        </Card>
      </div>
    </Page>
  );
};
