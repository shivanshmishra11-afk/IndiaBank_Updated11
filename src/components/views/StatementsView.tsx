import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  X,
  Copy,
  Check,
  ShieldAlert,
  Filter,
  CreditCard,
  PiggyBank,
} from 'lucide-react';
import { Transaction } from '../../types';
import { Page, PageHeader, Card, CardHeader, Badge, StatTile, EmptyState } from '../ui/Primitives';
import { MotionList, MotionRow, EASE } from '../ui/Motion';
import { useBank } from '../../store/BankStore';
import { formatINR } from '../../utils/format';

type Period = 30 | 90 | 180 | 365;
type Kind = 'All' | 'Credits' | 'Debits';

const CATEGORY_TONES: Record<string, string> = {
  Salary: 'emerald',
  Investments: 'amber',
  'Card payment': 'indigo',
  Transfers: 'sky',
  'Bills & Utilities': 'slate',
  'Loan EMI': 'rose',
};

function toCsv(rows: Transaction[]): string {
  const head = ['Date', 'Description', 'Merchant', 'Category', 'Reference', 'Debit (INR)', 'Credit (INR)', 'Status'];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map((t) =>
    [t.date, t.description, t.merchant, t.category, t.reference, t.type === 'debit' ? t.amount.toFixed(2) : '', t.type === 'credit' ? t.amount.toFixed(2) : '', t.status].map(esc).join(',')
  );
  return [head.join(','), ...body].join('\n');
}

function download(name: string, content: string, mime: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const StatementsView: React.FC = () => {
  const { accounts, transactions, savingsAccount } = useBank();
  const [accountId, setAccountId] = useState<string>('all');
  const [period, setPeriod] = useState<Period>(90);
  const [kind, setKind] = useState<Kind>('All');
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);

  const categories = useMemo(() => ['All', ...Array.from(new Set(transactions.map((t) => t.category)))], [transactions]);

  const filtered = useMemo(() => {
    const since = Date.now() - period * 86_400_000;
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (accountId !== 'all' && (t.accountId || 'acc-1') !== accountId) return false;
      if (t.rawDate && new Date(t.rawDate).getTime() < since) return false;
      if (kind !== 'All' && (kind === 'Credits' ? t.type !== 'credit' : t.type !== 'debit')) return false;
      if (category !== 'All' && t.category !== category) return false;
      if (q && !`${t.merchant} ${t.description} ${t.reference} ${t.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, accountId, period, kind, category, query]);

  const credits = filtered.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const debits = filtered.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  // Running balance (newest first): start from current balance and add back as we walk down
  const running = useMemo(() => {
    const base = accountId === 'all' ? accounts.filter((a) => a.type === 'Savings' || a.type === 'Current').reduce((s, a) => s + a.balance, 0) : (accounts.find((a) => a.id === accountId)?.balance ?? savingsAccount.balance);
    const map = new Map<string, number>();
    let bal = base;
    for (const t of filtered) {
      map.set(t.id, bal);
      bal = t.type === 'debit' ? bal + t.amount : bal - t.amount;
    }
    return map;
  }, [filtered, accounts, accountId, savingsAccount.balance]);

  const activeAccount = accounts.find((a) => a.id === accountId);
  const label = activeAccount ? `${activeAccount.name} ${activeAccount.maskedNumber}` : 'All accounts';

  const exportCsv = () => {
    setDownloading('csv');
    window.setTimeout(() => {
      download(`IndiaBank_Statement_${period}d.csv`, toCsv(filtered), 'text/csv');
      setDownloading(null);
    }, 500);
  };

  const exportPdf = () => {
    setDownloading('pdf');
    window.setTimeout(() => {
      const lines = [
        'INDIA BANK — ACCOUNT STATEMENT',
        `Account: ${label}`,
        `Period: last ${period} days · generated ${new Date().toLocaleString('en-IN')}`,
        `Money in: ${formatINR(credits)}   Money out: ${formatINR(debits)}`,
        'Digitally signed · RBI compliant e-statement',
        '',
        ...filtered.map((t) => `${t.date}  ${t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2).padStart(12)}  ${t.merchant}  [${t.reference}]`),
      ];
      download(`IndiaBank_Statement_${period}d.txt`, lines.join('\n'), 'text/plain');
      setDownloading(null);
    }, 700);
  };

  const copyRef = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Page>
      <PageHeader
        title="Statements"
        subtitle="Every debit and credit across your accounts, with running balance, filters and downloadable e-statements."
        actions={
          <>
            <button onClick={exportCsv} disabled={!!downloading || filtered.length === 0} className="ib-btn-secondary">
              <Download className="w-4 h-4 text-indigo-600" /> {downloading === 'csv' ? 'Preparing…' : 'CSV'}
            </button>
            <button onClick={exportPdf} disabled={!!downloading || filtered.length === 0} className="ib-btn-primary">
              <FileText className="w-4 h-4" /> {downloading === 'pdf' ? 'Generating…' : 'E-statement'}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Money in" value={formatINR(credits, { decimals: 0 })} tone="positive" hint={`last ${period} days`} />
        <StatTile label="Money out" value={formatINR(debits, { decimals: 0 })} hint={`last ${period} days`} />
        <StatTile label="Net flow" value={`${credits - debits >= 0 ? '+' : '−'}${formatINR(Math.abs(credits - debits), { decimals: 0 })}`} tone={credits - debits >= 0 ? 'positive' : 'negative'} />
        <StatTile label="Transactions" value={String(filtered.length)} hint={label} />
      </div>

      <Card padded={false}>
        {/* Filter bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search merchant, reference or note" className="ib-input pl-9 py-2" />
            </div>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="ib-input py-2 md:w-56" aria-label="Account">
              <option value="all">All accounts</option>
              {accounts
                .filter((a) => a.type === 'Savings' || a.type === 'Current')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.maskedNumber}
                  </option>
                ))}
            </select>
            <div className="ib-seg" role="group" aria-label="Period">
              {([30, 90, 180, 365] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p}>
                  {p === 365 ? '1 yr' : `${p}d`}
                </button>
              ))}
            </div>
            <div className="ib-seg" role="group" aria-label="Type">
              {(['All', 'Credits', 'Debits'] as Kind[]).map((k) => (
                <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}>
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto ib-scroll -mx-1 px-1 pb-0.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`ib-chip shrink-0 ${category === c ? 'bg-indigo-600 text-white border-indigo-600' : ''}`} aria-pressed={category === c}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="hidden md:grid grid-cols-[1fr_140px_140px_150px] px-5 py-2 text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-400 border-b border-slate-100">
          <span>Transaction</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Date</span>
        </div>
        <MotionList className="divide-y divide-slate-100">
          {filtered.map((t) => {
            const credit = t.type === 'credit';
            const isCard = t.iconType === 'card';
            const isDeposit = t.iconType === 'deposit';
            return (
              <MotionRow key={t.id} highlight={t.date === transactions[0]?.date && t === transactions[0]} onClick={() => setSelected(t)} className="px-5 py-3.5 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px_140px_150px] items-center gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      credit ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : isCard ? 'bg-slate-900 text-white border-slate-900' : isDeposit ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {isCard ? <CreditCard className="w-4 h-4" /> : isDeposit ? <PiggyBank className="w-4 h-4" /> : credit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{t.merchant}</p>
                    <p className="text-xs text-slate-500 truncate">
                      <span className="md:hidden">{t.date} · </span>
                      {t.category} · {t.reference}
                    </p>
                  </div>
                </div>
                <p className={`ib-num text-sm font-bold text-right ${credit ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {credit ? '+' : '−'}
                  {formatINR(t.amount)}
                </p>
                <p className="ib-num text-sm text-slate-600 text-right hidden md:block">{formatINR(running.get(t.id) ?? 0)}</p>
                <p className="text-xs text-slate-500 text-right hidden md:block">{t.date}</p>
              </MotionRow>
            );
          })}
        </MotionList>
        {filtered.length === 0 && (
          <EmptyState
            title="No transactions in this view"
            description="Try a longer period, another account, or clear the search and category filters."
            action={
              <button
                onClick={() => {
                  setQuery('');
                  setKind('All');
                  setCategory('All');
                  setPeriod(365);
                  setAccountId('all');
                }}
                className="ib-btn-secondary text-xs py-2"
              >
                Reset filters
              </button>
            }
          />
        )}
      </Card>

      {/* Transaction detail drawer */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.aside
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="relative w-full max-w-[420px] h-full bg-white shadow-2xl border-l border-slate-200/70 flex flex-col"
              role="dialog"
              aria-label="Transaction details"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Transaction details</h3>
                <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-5 overflow-y-auto ib-scroll">
                <div className="text-center py-3">
                  <motion.p initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, ease: EASE }} className={`ib-num text-3xl font-bold ${selected.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {selected.type === 'credit' ? '+' : '−'}
                    {formatINR(selected.amount)}
                  </motion.p>
                  <p className="text-sm text-slate-500 mt-1">{selected.merchant}</p>
                  <Badge tone={(CATEGORY_TONES[selected.category] as any) || 'slate'} className="mt-3">
                    {selected.category}
                  </Badge>
                </div>
                <dl className="text-sm divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">
                  {[
                    ['Status', selected.status],
                    ['Date', selected.date],
                    ['Description', selected.description],
                    ['Channel', selected.channel || (selected.reference.startsWith('UPI') ? 'UPI' : selected.reference.startsWith('NEFT') ? 'NEFT' : selected.reference.startsWith('BBPS') ? 'Bharat BillPay' : selected.reference.startsWith('CARD') ? 'Card' : 'Internal')],
                    ['Account', accounts.find((a) => a.id === (selected.accountId || 'acc-1'))?.name + ' · ' + (accounts.find((a) => a.id === (selected.accountId || 'acc-1'))?.maskedNumber ?? '')],
                    ['Balance after', formatINR(running.get(selected.id) ?? 0)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 py-2.5">
                      <dt className="text-slate-500 shrink-0">{k}</dt>
                      <dd className="font-medium text-slate-900 text-right">{v}</dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">Reference</dt>
                    <dd className="font-mono font-semibold text-indigo-700 flex items-center gap-1.5">
                      {selected.reference}
                      <button onClick={() => copyRef(selected.reference)} className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer" aria-label="Copy reference">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </dd>
                  </div>
                </dl>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => download(`Receipt_${selected.reference}.txt`, `INDIA BANK e-RECEIPT\n${selected.date}\n${selected.merchant}\n${selected.type === 'credit' ? '+' : '-'}${formatINR(selected.amount)}\nRef ${selected.reference}\nStatus ${selected.status}`, 'text/plain')} className="ib-btn-secondary text-xs">
                    <Download className="w-3.5 h-3.5 text-indigo-600" /> e-Receipt
                  </button>
                  <button onClick={() => { setSelected(null); window.dispatchEvent(new CustomEvent('ib:navigate', { detail: { tab: 'complaints' } })); }} className="ib-btn-secondary text-xs text-rose-700">
                    <ShieldAlert className="w-3.5 h-3.5" /> Raise dispute
                  </button>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </Page>
  );
};
