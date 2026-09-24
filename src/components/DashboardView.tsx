import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Home, Building2, CreditCard, Send, Grid } from 'lucide-react';
import { UserSession, ComplaintTicket, NavTab } from '../types';
import { SPENDING_INSIGHTS, CREDIT_SCORE } from '../data/mockData';
import { publishDashboardSnapshot } from '../data/dashboardSnapshot';
import { useBank } from '../store/BankStore';
import { NexoraHeader } from './NexoraHeader';
import { NexoraSidebar } from './NexoraSidebar';
import { NexoraDashboard } from './NexoraDashboard';
import { AccountsView } from './views/AccountsView';
import { CardsView } from './views/CardsView';
import { TransfersView } from './views/TransfersView';
import { InvestmentsView } from './views/InvestmentsView';
import { LoansView } from './views/LoansView';
import { OffersView } from './views/OffersView';
import { ServicesView } from './views/ServicesView';
import { StatementsView } from './views/StatementsView';
import { BeneficiariesView } from './views/BeneficiariesView';
import { DepositsView } from './views/DepositsView';
import { NotificationsView } from './views/NotificationsView';
import { ProfileView } from './views/ProfileView';
import { ComplaintView } from './ComplaintView';
import { QuickActionModals } from './modals/QuickActionModals';

interface DashboardViewProps {
  user: UserSession;
  onNavigateToComplaint: () => void;
  recentTickets: ComplaintTicket[];
  onLogout: () => void;
  onTicketCreated?: (ticket: ComplaintTicket) => void;
  onNavigateToLogin?: () => void;
  onOpenAssistant?: () => void;
}

const VALID_TABS: NavTab[] = [
  'home', 'accounts', 'complaints', 'cards', 'payments', 'transfers', 'investments', 'loans', 'offers', 'services',
  'statements', 'beneficiaries', 'deposits', 'notifications', 'profile',
];

const MOBILE_NAV: { id: NavTab; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'accounts', label: 'Accounts', icon: Building2 },
  { id: 'payments', label: 'Pay', icon: Send },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'services', label: 'More', icon: Grid },
];

const MORE_TABS: NavTab[] = ['offers', 'loans', 'investments', 'complaints', 'deposits', 'beneficiaries', 'statements', 'notifications', 'profile'];

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onNavigateToComplaint, recentTickets, onLogout, onTicketCreated, onNavigateToLogin, onOpenAssistant }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [preselectPayee, setPreselectPayee] = useState<string | undefined>(undefined);
  const bank = useBank();
  const { accounts, transactions, transfer, openDeposit } = bank;

  // Zora (and other widgets) can ask the shell to switch tabs
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab as NavTab;
      if (tab && VALID_TABS.includes(tab)) setActiveTab(tab);
    };
    window.addEventListener('ib:navigate', handler);
    return () => window.removeEventListener('ib:navigate', handler);
  }, []);

  useEffect(() => {
    document.getElementById('ib-main')?.scrollTo({ top: 0 });
    publishDashboardSnapshot({ activeTab });
  }, [activeTab]);

  // Quick-action modals and legacy callers still speak this simple shape
  const handleTransferCompleted = (amount: number, description: string, payee: string) => {
    transfer({ amount, description, payeeName: payee, channel: 'IMPS' });
  };

  const view = (() => {
    switch (activeTab) {
      case 'home':
        return (
          <NexoraDashboard
            user={user}
            accounts={accounts}
            transactions={transactions}
            spendingCategories={SPENDING_INSIGHTS}
            creditData={CREDIT_SCORE}
            onOpenActionModal={setActiveModal}
            onSelectNavTab={setActiveTab}
            onOpenAssistant={() => onOpenAssistant && onOpenAssistant()}
          />
        );
      case 'accounts':
        return <AccountsView accounts={accounts} transactions={transactions} onOpenActionModal={setActiveModal} />;
      case 'statements':
        return <StatementsView />;
      case 'complaints':
        return (
          <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-9 max-w-[1240px] mx-auto w-full">
            <ComplaintView user={user} onReturnToDashboard={() => setActiveTab('home')} onTicketCreated={(t) => onTicketCreated?.(t)} recentTickets={recentTickets} />
          </div>
        );
      case 'cards':
        return <CardsView user={user} onOpenAssistantForPayment={() => onOpenAssistant && onOpenAssistant()} />;
      case 'transfers':
      case 'payments':
        return <TransfersView onOpenScanPay={() => setActiveModal('scan-pay')} mode={activeTab} preselectBeneficiaryId={preselectPayee} />;
      case 'beneficiaries':
        return (
          <BeneficiariesView
            onSendMoney={(id) => {
              setPreselectPayee(id);
              setActiveTab('transfers');
            }}
          />
        );
      case 'deposits':
        return <DepositsView />;
      case 'investments':
        return <InvestmentsView onOpenFdModal={() => setActiveTab('deposits')} />;
      case 'loans':
        return <LoansView user={user} />;
      case 'offers':
        return <OffersView />;
      case 'notifications':
        return <NotificationsView onNavigate={setActiveTab} />;
      case 'profile':
        return <ProfileView user={user} onLogout={onLogout} />;
      case 'services':
        return <ServicesView onOpenGrievance={() => setActiveTab('complaints')} onNavigate={setActiveTab} />;
    }
  })();

  return (
    <div className="h-screen h-[100dvh] flex flex-col font-sans">
      <NexoraHeader
        user={user}
        onLogout={onLogout}
        onOpenHelp={() => onOpenAssistant && onOpenAssistant()}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        onNavigateToComplaints={() => setActiveTab('complaints')}
        onNavigateToLogin={onNavigateToLogin}
        onNavigate={setActiveTab}
        ticketCount={recentTickets.length}
      />

      <div className="flex-1 flex min-h-0 relative">
        <div className="hidden lg:block h-full">
          <NexoraSidebar activeTab={activeTab} onSelectTab={setActiveTab} onOpenReferEarn={() => setActiveModal('refer-earn')} />
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
              <motion.div
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                className="relative z-10 h-full shadow-2xl bg-white"
              >
                <NexoraSidebar
                  activeTab={activeTab}
                  onSelectTab={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false);
                  }}
                  onOpenReferEarn={() => {
                    setActiveModal('refer-earn');
                    setIsMobileMenuOpen(false);
                  }}
                  isMobile
                  onCloseMobile={() => setIsMobileMenuOpen(false)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Active view with a light page transition */}
        <main id="ib-main" className="flex-1 overflow-y-auto flex flex-col pb-20 lg:pb-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col"
            >
              {view}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-xl border-t border-slate-200/70 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5" aria-label="Primary mobile">
        <ul className="grid grid-cols-5">
          {MOBILE_NAV.map((n) => {
            const Icon = n.icon;
            const active = activeTab === n.id || (n.id === 'services' && MORE_TABS.includes(activeTab)) || (n.id === 'payments' && activeTab === 'transfers');
            return (
              <li key={n.id}>
                <button
                  onClick={() => setActiveTab(n.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex flex-col items-center gap-1 py-1.5 rounded-xl text-[11px] font-semibold transition-colors active:scale-95 cursor-pointer ${active ? 'text-indigo-700' : 'text-slate-500'}`}
                >
                  <span className={`w-11 h-7 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-indigo-50' : ''}`}>
                    <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.25 : 2} />
                  </span>
                  {n.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <QuickActionModals
        modalType={activeModal}
        onClose={() => setActiveModal(null)}
        accounts={accounts}
        creditData={CREDIT_SCORE}
        onTransferSuccess={handleTransferCompleted}
        onDepositBooked={(amount, tenureMonths) => openDeposit({ kind: 'FD', amount, tenureMonths, ratePct: 6.75 })}
        onOpenGrievance={onNavigateToComplaint}
      />
    </div>
  );
};
