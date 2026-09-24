/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewType, UserSession, ComplaintTicket } from './types';
import { NexoraHeader } from './components/NexoraHeader';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ComplaintView } from './components/ComplaintView';
import { NexoraAiAssistant } from './components/NexoraAiAssistant';
import { PaymentGatewayView } from './components/views/PaymentGatewayView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ShieldCheck, PhoneCall } from 'lucide-react';
import { safeStorage } from './utils/storage';
import { BankProvider, useBank } from './store/BankStore';
import { ToastHost } from './components/ui/Motion';

const Toasts: React.FC = () => {
  const { toasts, dismissToast } = useBank();
  return <ToastHost toasts={toasts} onDismiss={dismissToast} />;
};

function AppShell() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [user, setUser] = useState<UserSession | null>(null);
  const [recentTickets, setRecentTickets] = useState<ComplaintTicket[]>([]);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Check if current URL is an external payment gateway redirection
  const [isGatewayRoute, setIsGatewayRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      return (
        path.startsWith('/gateway') ||
        search.includes('view=gateway') ||
        (search.includes('txnId=') && !search.includes('view=dashboard'))
      );
    }
    return false;
  });

  // Listen to popstate and url updates
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      setIsGatewayRoute(
        path.startsWith('/gateway') ||
        search.includes('view=gateway') ||
        (search.includes('txnId=') && !search.includes('view=dashboard'))
      );
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Restore stored session on mount
  useEffect(() => {
    try {
      const storedEmail =
        safeStorage.getItem('indiabank_user_email') ||
        safeStorage.getItem('intellect_bank_user_email');

      if (storedEmail) {
        const namePart = storedEmail.split('@')[0] || 'Client';
        const formattedName = namePart
          .split(/[._-]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

        setUser({
          email: storedEmail,
          name: formattedName,
          accountNumber: 'AC1000234567',
          loginTime: new Date().toLocaleTimeString('en-IN'),
        });
        setCurrentView('dashboard');
      }
    } catch {
      // safe fallback
    }
  }, []);

  const handleLogin = (email: string) => {
    const namePart = email.split('@')[0] || 'Client';
    const formattedName = namePart
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const newSession: UserSession = {
      email: email,
      name: formattedName,
      accountNumber: 'AC1000234567',
      loginTime: new Date().toLocaleTimeString('en-IN'),
    };

    safeStorage.setItem('indiabank_user_email', email);

    setUser(newSession);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    safeStorage.removeItem('indiabank_user_email');
    safeStorage.removeItem('intellect_bank_user_email');
    setUser(null);
    setCurrentView('login');
  };

  const handleTicketCreated = (ticket: ComplaintTicket) => {
    setRecentTickets((prev) => [ticket, ...prev]);
  };

  // If the browser was redirected from a QR scan to the external Dummy Payment Gateway
  if (isGatewayRoute) {
    return (
      <ErrorBoundary>
        <PaymentGatewayView
          onClose={() => {
            window.location.href = '/';
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans">
      {/* Universal India Bank NetBanking Header (rendered on login & complaint portal) */}
      {currentView !== 'dashboard' && (
        <NexoraHeader
          user={user}
          onLogout={handleLogout}
          onNavigateToComplaints={user ? () => setCurrentView('complaint') : undefined}
          onNavigateToLogin={() => setCurrentView('login')}
          onOpenHelp={() => setIsAssistantOpen(true)}
          ticketCount={recentTickets.length}
        />
      )}

      {/* Main Single-Page View Container */}
      <main className="flex-1 flex flex-col relative">
        <ErrorBoundary>
          {/* VIEW 1: Login Page */}
          <div
            id="container-view-login"
            className={currentView === 'login' ? 'flex-1 flex flex-col' : 'hidden'}
          >
            {user && (
              <div className="bg-slate-900 text-white px-4 py-2.5 text-xs text-center flex items-center justify-center gap-3">
                <span>
                  Signed in as <strong>{user.name}</strong>
                </span>
                <button onClick={() => setCurrentView('dashboard')} className="group inline-flex items-center gap-1 px-3 py-1 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-xs active:scale-95">
                  Back to dashboard <span className="ib-arrow">→</span>
                </button>
              </div>
            )}
            <LoginView
              onLogin={handleLogin}
              savedEmail={
                safeStorage.getItem('indiabank_remember_email') ||
                safeStorage.getItem('intellect_bank_remember_email') ||
                ''
              }
            />
          </div>

          {/* VIEW 2: Customer Dashboard */}
          <div
            id="container-view-dashboard"
            className={currentView === 'dashboard' ? 'block flex-1' : 'hidden'}
          >
            {user && (
              <DashboardView
                user={user}
                onNavigateToComplaint={() => setCurrentView('complaint')}
                recentTickets={recentTickets}
                onLogout={handleLogout}
                onTicketCreated={handleTicketCreated}
                onNavigateToLogin={() => setCurrentView('login')}
                onOpenAssistant={() => setIsAssistantOpen(true)}
              />
            )}
          </div>

          {/* VIEW 3: Complaint & Grievance Redressal Portal */}
          <div
            id="container-view-complaint"
            className={currentView === 'complaint' ? 'block' : 'hidden'}
          >
            {user && (
              <ComplaintView
                user={user}
                onReturnToDashboard={() => setCurrentView('dashboard')}
                onTicketCreated={handleTicketCreated}
                recentTickets={recentTickets}
              />
            )}
          </div>
        </ErrorBoundary>
      </main>

      <Toasts />

      {/* 24x7 Dynamic Virtual Assistant Widget - Available on Every Page */}
      <NexoraAiAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onToggle={() => setIsAssistantOpen((prev) => !prev)}
        user={user}
        onOpenGrievance={() => {
          setIsAssistantOpen(false);
          setCurrentView('complaint');
        }}
      />

      {/* India Bank Institutional Footer (rendered on login & complaint portal) */}
      {currentView !== 'dashboard' && (
        <footer className="border-t border-slate-200/70 py-6 text-xs text-slate-500">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="font-bold text-slate-800">India Bank</span>
              <span>Scheduled commercial bank licensed by RBI</span>
              <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Deposits insured by DICGC up to ₹5,00,000
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <PhoneCall className="w-3.5 h-3.5 text-amber-600" /> 24x7 · <strong>1800 202 6161</strong>
              </span>
              <span>CIN L65110MH1994PLC080801</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BankProvider>
      <AppShell />
    </BankProvider>
  );
}
