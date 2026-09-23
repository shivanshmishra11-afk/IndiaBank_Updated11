import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Mail,
  HelpCircle,
  ChevronDown,
  LogOut,
  ShieldCheck,
  User,
  Settings,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  KeyRound,
  FileText,
} from 'lucide-react';
import { UserSession } from '../types';

interface NexoraHeaderProps {
  user: UserSession | null;
  onLogout?: () => void;
  onOpenHelp?: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onNavigateToComplaints?: () => void;
  onNavigateToLogin?: () => void;
  ticketCount?: number;
}

export const BankMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg viewBox="0 0 36 36" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M18 2L32 10.5V25.5L18 34L4 25.5V10.5L18 2Z" fill="url(#ibGrad)" />
    <path d="M18 2L32 10.5L18 19L4 10.5L18 2Z" fill="#7C3AED" fillOpacity="0.85" />
    <path d="M18 19L32 10.5V25.5L18 34V19Z" fill="#4F46E5" />
    <path d="M18 19L4 10.5V25.5L18 34V19Z" fill="#6366F1" fillOpacity="0.9" />
    <defs>
      <linearGradient id="ibGrad" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="0.5" stopColor="#4F46E5" />
        <stop offset="1" stopColor="#312E81" />
      </linearGradient>
    </defs>
  </svg>
);

const IconButton: React.FC<{
  onClick?: () => void;
  label: string;
  active?: boolean;
  dot?: boolean;
  children: React.ReactNode;
}> = ({ onClick, label, active, dot, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
      active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
    }`}
  >
    {children}
    {dot && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />}
  </button>
);

export const NexoraHeader: React.FC<NexoraHeaderProps> = ({
  user,
  onLogout,
  onOpenHelp,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onNavigateToComplaints,
  onNavigateToLogin,
  ticketCount = 0,
}) => {
  const [open, setOpen] = useState<'profile' | 'notifications' | 'messages' | null>(null);
  const [unread, setUnread] = useState(2);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggle = (k: typeof open) => setOpen((o) => (o === k ? null : k));

  const notifications = [
    { id: 'n1', title: 'Salary credited', desc: '₹75,000.00 received via NEFT from ABC Corp', time: '15 May', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
    { id: 'n2', title: 'FD maturing soon', desc: 'FD •••• 9101 matures on 12 Sep 2026. Reinvest at 6.75%.', time: '12 May', icon: AlertCircle, tone: 'text-amber-600 bg-amber-50' },
    { id: 'n3', title: 'New sign-in verified', desc: 'NetBanking login from a trusted browser.', time: 'Today', icon: ShieldCheck, tone: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden w-10 h-10 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5 select-none">
          <BankMark />
          <div className="leading-none">
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-bold tracking-tight text-slate-900 whitespace-nowrap">India Bank</span>
              <span className="hidden sm:inline text-[10px] tracking-[0.12em] font-bold uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                NetBanking
              </span>
            </div>
            <span className="hidden sm:block text-[11px] text-slate-500 mt-1">Digital banking & grievance portal</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div ref={wrapRef} className="flex items-center gap-1 sm:gap-1.5">
        {onNavigateToComplaints && (
          <button
            onClick={onNavigateToComplaints}
            className="group hidden sm:inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 transition-colors cursor-pointer active:scale-95 mr-1"
          >
            <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
            Grievance & dispute
            {ticketCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-bold leading-none">{ticketCount}</span>}
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <IconButton
            label="Notifications"
            active={open === 'notifications'}
            dot={unread > 0}
            onClick={() => {
              toggle('notifications');
              setUnread(0);
            }}
          >
            <Bell className="w-5 h-5" />
          </IconButton>
          {open === 'notifications' && (
            <div className="ib-popover absolute right-0 mt-2 w-[340px] sm:w-[380px] p-2 z-50">
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                <button className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer">Mark all read</button>
              </div>
              <ul className="max-h-80 overflow-y-auto ib-scroll">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <li key={n.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.tone}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                          <span className="text-[11px] text-slate-400 shrink-0">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Messages */}
        {user && (
          <div className="relative">
            <IconButton label="Messages" active={open === 'messages'} onClick={() => toggle('messages')}>
              <Mail className="w-5 h-5" />
            </IconButton>
            {open === 'messages' && (
              <div className="ib-popover absolute right-0 mt-2 w-[320px] p-2 z-50 text-left">
                <div className="flex items-center justify-between px-3 py-2">
                  <h3 className="text-sm font-bold text-slate-900">Messages</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">1 new</span>
                </div>
                <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
                  <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">E-statement · Q1 FY26-27</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">Your digitally signed statement is ready to download.</p>
                    <span className="text-xs text-indigo-600 font-semibold mt-1.5 inline-block hover:underline">Download PDF →</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!user && (
          <div className="hidden md:flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs text-slate-600 border border-slate-200 bg-white mr-1">
            <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
            24x7 · <strong className="text-slate-800">1800 202 6161</strong>
          </div>
        )}

        <IconButton label="Help & Zora" onClick={onOpenHelp}>
          <HelpCircle className="w-5 h-5" />
        </IconButton>

        {/* Profile */}
        {user ? (
          <div className="relative ml-1">
            <button
              onClick={() => toggle('profile')}
              className={`flex items-center gap-2.5 h-10 pl-1 pr-2 sm:pr-3 rounded-xl transition-colors cursor-pointer active:scale-[0.98] ${open === 'profile' ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
              aria-haspopup="menu"
              aria-expanded={open === 'profile'}
            >
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-bold text-xs flex items-center justify-center">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </span>
              <span className="hidden md:inline text-sm font-semibold text-slate-800">{user.name}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 hidden sm:inline transition-transform ${open === 'profile' ? 'rotate-180' : ''}`} />
            </button>

            {open === 'profile' && (
              <div className="ib-popover absolute right-0 mt-2 w-64 p-2 z-50 text-left" role="menu">
                <div className="px-3 py-2.5">
                  <p className="text-sm font-bold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> KYC verified
                  </span>
                </div>
                <div className="h-px bg-slate-100 my-1" />
                {[
                  { icon: User, label: 'Profile & KYC' },
                  { icon: Settings, label: 'Security & 2FA' },
                  { icon: ShieldCheck, label: 'Limits & biometric lock' },
                ].map((i) => {
                  const Icon = i.icon;
                  return (
                    <button key={i.label} role="menuitem" onClick={() => setOpen(null)} className="w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2.5 cursor-pointer">
                      <Icon className="w-4 h-4 text-slate-400" /> {i.label}
                    </button>
                  );
                })}
                <div className="h-px bg-slate-100 my-1" />
                {onNavigateToLogin && (
                  <button role="menuitem" onClick={() => { setOpen(null); onNavigateToLogin(); }} className="w-full px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2.5 font-medium cursor-pointer">
                    <KeyRound className="w-4 h-4" /> Switch user
                  </button>
                )}
                {onLogout && (
                  <button role="menuitem" onClick={() => { setOpen(null); onLogout(); }} className="w-full px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2.5 font-medium cursor-pointer">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          onNavigateToLogin && (
            <button onClick={onNavigateToLogin} className="ib-btn-primary h-10 py-0 ml-1">
              Sign in
            </button>
          )
        )}
      </div>
    </header>
  );
};
