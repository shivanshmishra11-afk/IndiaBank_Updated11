import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  CreditCard,
  Send,
  Receipt,
  Building2,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { UserSession, BankAccount, Transaction, SpendingCategory, CreditScoreData, NavTab } from '../types';
import { BANK_OFFERS } from '../data/mockData';
import { Card, CardHeader, Badge, ZoraMark, AnimatedNumber, Skeleton, useSpotlight } from './ui/Primitives';
import { QuickActionsGrid, QuickActionType } from './dashboard/QuickActionsGrid';
import { SpendingDonutChart } from './dashboard/SpendingDonutChart';
import { CreditScoreGauge } from './dashboard/CreditScoreGauge';
import { formatINR, greetingForNow, firstName } from '../utils/format';
import { zoraEvents } from './NexoraAiAssistant';
import { useBank } from '../store/BankStore';

interface NexoraDashboardProps {
  user: UserSession;
  accounts: BankAccount[];
  transactions: Transaction[];
  spendingCategories: SpendingCategory[];
  creditData: CreditScoreData;
  onOpenActionModal: (action: string) => void;
  onSelectNavTab: (tab: NavTab) => void;
  onOpenAssistant: () => void;
}

const ACCOUNT_ICON: Record<BankAccount['type'], React.ElementType> = {
  Savings: Building2,
  Current: Landmark,
  'Fixed Deposit': PiggyBank,
  'Recurring Deposit': PiggyBank,
};

export const NexoraDashboard: React.FC<NexoraDashboardProps> = ({ user, accounts, transactions, spendingCategories, creditData, onOpenActionModal, onSelectNavTab, onOpenAssistant }) => {
  const [hideBalances, setHideBalances] = useState(false);
  const heroRef = useSpotlight<HTMLDivElement>();

  // Live credit-card ledger from the shared store (same feed the Cards page, Statements and Zora use)
  const { card: coreCard, ready, unreadCount } = useBank();
  const cardLoading = !ready && !coreCard;

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const money = (v: number) => (hideBalances ? '₹ ••••••' : formatINR(v));
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleQuickAction = (action: QuickActionType) => {
    if (action === 'pay-bills' || action === 'recharge') onSelectNavTab('payments');
    else if (action === 'add-payee') onSelectNavTab('transfers');
    else if (action === 'more') onSelectNavTab('services');
    else onOpenActionModal(action);
  };

  const payViaZora = () => {
    onOpenAssistant();
    zoraEvents.prompt('Pay my credit card bill');
  };

  const outstanding = coreCard?.outstandingBalance ?? 0;

  return (
    <div className="ib-page flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-9 max-w-[1240px] mx-auto w-full text-left space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="ib-eyebrow">{today}</p>
          <h1 className="ib-h1 text-slate-900 mt-1.5">
            {greetingForNow()}, {firstName(user.name)}
          </h1>
          {unreadCount > 0 && (
            <button onClick={() => onSelectNavTab('notifications')} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> {unreadCount} new notification{unreadCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onOpenActionModal('send-money')} className="ib-btn-primary group">
            <Send className="w-4 h-4" /> Send money
          </button>
          <button onClick={() => onSelectNavTab('payments')} className="ib-btn-secondary">
            <Receipt className="w-4 h-4 text-indigo-600" /> Pay bills
          </button>
        </div>
      </div>

      {/* Bento: balance hero + accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div
          ref={heroRef}
          className="ib-spotlight ib-grain lg:col-span-5 rounded-[22px] p-6 sm:p-7 text-white relative overflow-hidden bg-[#141a3a] shadow-lg shadow-indigo-950/20"
        >
          {/* ambient lighting */}
          <div className="ib-drift absolute -right-16 -top-24 w-72 h-72 rounded-full bg-indigo-500/40 blur-3xl" />
          <div className="absolute -left-10 bottom-0 w-56 h-56 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="ib-eyebrow text-indigo-200/80">Total balance</span>
              <button
                onClick={() => setHideBalances((v) => !v)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                aria-label={hideBalances ? 'Show balances' : 'Hide balances'}
              >
                {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[clamp(2rem,1.5rem+1.6vw,2.6rem)] font-bold tracking-[-0.03em] mt-3 leading-none">
              {hideBalances ? '₹ ••••••' : <AnimatedNumber value={totalBalance} format={(n) => formatINR(n)} />}
            </p>
            <p className="text-sm text-indigo-200/80 mt-2">Across {accounts.length} accounts · updated just now</p>

            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-indigo-200/70 ib-num">CUST-INB-7729104</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> KYC verified
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const Icon = ACCOUNT_ICON[acc.type] || Building2;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => onSelectNavTab('accounts')}
                className="ib-card ib-card-hover group p-5 text-left cursor-pointer flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <span className="text-sm font-medium text-slate-500 mt-5">{acc.name}</span>
                <span className="ib-num text-[22px] font-bold text-slate-900 mt-0.5">{money(acc.balance)}</span>
                <span className="text-xs text-slate-400 mt-auto pt-3">
                  {acc.maskedNumber} · {acc.type === 'Fixed Deposit' ? `matures ${acc.maturityDate}` : acc.interestRate}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <QuickActionsGrid onActionClick={handleQuickAction} />

      {/* Activity + right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7" padded={false}>
          <div className="p-5 sm:p-6 pb-2 sm:pb-3">
            <CardHeader
              title="Recent activity"
              description="Latest debits and credits across your accounts"
              action={
                <button onClick={() => onSelectNavTab('statements')} className="ib-btn-ghost text-xs py-1.5 group">
                  View all <ChevronRight className="w-3.5 h-3.5 ib-arrow" />
                </button>
              }
            />
          </div>
          <ul>
            {transactions.slice(0, 6).map((t) => {
              const credit = t.type === 'credit';
              return (
                <li key={t.id} className="px-5 sm:px-6 py-3 flex items-center gap-3.5 hover:bg-slate-50/80 transition-colors border-t border-slate-100/80">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${credit ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {credit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{t.merchant}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {t.category} · {t.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`ib-num text-sm font-bold ${credit ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {credit ? '+' : '−'}
                      {money(t.amount)}
                    </p>
                    <p className="text-[11px] text-slate-400">{t.status}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="lg:col-span-5 space-y-4">
          <Card className="relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <CreditCard className="w-[18px] h-[18px]" />
                </span>
                <div>
                  <h3 className="ib-section-title">Credit card bill</h3>
                  <p className="text-xs text-slate-500">
                    {coreCard?.cardName || 'Nexora Royale Infinite'} · {coreCard?.maskedNumber || '•••• 8842'}
                  </p>
                </div>
              </div>
              {cardLoading ? <Skeleton className="w-24 h-5" /> : outstanding > 0 ? <Badge tone="amber">Due {coreCard?.dueDate}</Badge> : <Badge tone="emerald">All paid</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              {cardLoading ? (
                <>
                  <Skeleton className="h-[74px] rounded-xl" />
                  <Skeleton className="h-[74px] rounded-xl" />
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5">
                    <span className="ib-eyebrow block">Total due</span>
                    <span className="ib-num text-xl font-bold text-slate-900 mt-1 block">{money(outstanding)}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5">
                    <span className="ib-eyebrow block">Minimum due</span>
                    <span className="ib-num text-xl font-bold text-slate-900 mt-1 block">{money(coreCard?.minimumDue ?? 0)}</span>
                  </div>
                </>
              )}
            </div>

            {!cardLoading &&
              (outstanding > 0 ? (
                <div className="flex items-center gap-2 mt-5">
                  <button onClick={payViaZora} className="ib-btn-primary flex-1">
                    <Sparkles className="w-4 h-4 text-amber-300" /> Pay with Zora
                  </button>
                  <button onClick={() => onSelectNavTab('cards')} className="ib-btn-secondary">
                    Card details
                  </button>
                </div>
              ) : (
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-3 mt-5">
                  Last payment of {formatINR(coreCard?.lastPaymentAmount || 0)} received · UTR {coreCard?.lastUtr}
                </p>
              ))}
          </Card>

          <CreditScoreGauge creditData={creditData} onViewReport={() => onOpenActionModal('credit-report')} />
        </div>
      </div>

      {/* Insights + offers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <SpendingDonutChart categories={spendingCategories} />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader
              title="Offers for you"
              action={
                <button onClick={() => onSelectNavTab('offers')} className="ib-btn-ghost text-xs py-1.5 group">
                  See all <ChevronRight className="w-3.5 h-3.5 ib-arrow" />
                </button>
              }
            />
            <ul className="space-y-1.5">
              {BANK_OFFERS.slice(0, 3).map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => onSelectNavTab('offers')} className="group w-full flex items-center gap-3 p-2.5 -mx-1 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer">
                    <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${o.color} text-white flex items-center justify-center text-[11px] font-bold shrink-0`}>{o.tag.split(' ')[0]}</span>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-slate-900 truncate block">{o.title}</span>
                      <span className="text-xs text-slate-500 truncate block">{o.expiry}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 ib-arrow" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <button type="button" onClick={onOpenAssistant} className="group w-full ib-card ib-card-hover p-4 flex items-center gap-3.5 text-left cursor-pointer">
            <ZoraMark size={44} />
            <span className="flex-1">
              <span className="text-sm font-bold text-slate-900 block">Need a hand? Ask Zora</span>
              <span className="text-xs text-slate-500 block">Balances, bill payments, FD rates, card blocking — 24x7.</span>
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400 ib-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
};
