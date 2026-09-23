import React from 'react';
import { motion } from 'motion/react';
import {
  Home,
  Building2,
  CreditCard,
  Send,
  ArrowLeftRight,
  TrendingUp,
  Coins,
  Tag,
  Grid,
  ArrowUpRight,
  PhoneCall,
  X,
} from 'lucide-react';
import { NavTab } from '../types';

interface NexoraSidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenReferEarn?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'accounts', label: 'Accounts', icon: Building2 },
      { id: 'cards', label: 'Cards', icon: CreditCard },
    ],
  },
  {
    title: 'Money',
    items: [
      { id: 'payments', label: 'Payments', icon: Send },
      { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Grow',
    items: [
      { id: 'investments', label: 'Investments', icon: TrendingUp },
      { id: 'loans', label: 'Loans', icon: Coins },
    ],
  },
  {
    title: 'More',
    items: [
      { id: 'offers', label: 'Offers', icon: Tag, badge: 'New' },
      { id: 'services', label: 'Services', icon: Grid },
      { id: 'complaints', label: 'Grievance & dispute', icon: PhoneCall },
    ],
  },
];

export const NexoraSidebar: React.FC<NexoraSidebarProps> = ({ activeTab, onSelectTab, onOpenReferEarn, isMobile, onCloseMobile }) => {
  const handleNavClick = (tabId: NavTab) => {
    onSelectTab(tabId);
    if (isMobile && onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-[248px] shrink-0 flex flex-col bg-white/70 backdrop-blur-xl border-r border-slate-200/70 h-full select-none">
      {isMobile && (
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-900">Menu</span>
          <button onClick={onCloseMobile} className="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer" aria-label="Close menu">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto ib-scroll px-3 py-5 space-y-6" aria-label="Primary">
        {NAV_GROUPS.map((g) => (
          <div key={g.title}>
            <span className="ib-eyebrow px-3">{g.title}</span>
            <ul className="mt-2 space-y-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id} className="relative">
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-indigo-50 border border-indigo-100/70"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}
                    <button
                      onClick={() => handleNavClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative w-full flex items-center justify-between px-3 h-10 rounded-xl text-[13.5px] transition-colors cursor-pointer active:scale-[0.98] ${
                        isActive ? 'text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={isActive ? 2.25 : 2} />
                        {item.label}
                      </span>
                      {item.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900">{item.badge}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onOpenReferEarn}
          className="group w-full text-left rounded-2xl p-4 bg-gradient-to-br from-indigo-50 to-violet-50/70 border border-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="ib-eyebrow text-indigo-700">Refer & earn</span>
              <p className="text-sm font-bold text-slate-900 mt-1">₹500 per friend</p>
              <p className="text-xs text-slate-500 mt-0.5">Share your referral link</p>
            </div>
            <img src="./assets/gift_box.jpg" alt="" className="w-10 h-10 object-contain rounded-lg" onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">
            Get referral code <ArrowUpRight className="w-3.5 h-3.5 ib-arrow" />
          </span>
        </button>
      </div>
    </aside>
  );
};
