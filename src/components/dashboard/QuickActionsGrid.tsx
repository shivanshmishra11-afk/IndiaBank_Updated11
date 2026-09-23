import React from 'react';
import {
  Send,
  Receipt,
  Smartphone,
  FileText,
  UserPlus,
  QrCode,
  Landmark,
  MoreHorizontal,
} from 'lucide-react';

export type QuickActionType =
  | 'send-money'
  | 'pay-bills'
  | 'recharge'
  | 'statement'
  | 'add-payee'
  | 'scan-pay'
  | 'open-fd'
  | 'more';

interface QuickActionsGridProps {
  onActionClick: (action: QuickActionType) => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ onActionClick }) => {
  const actions: { id: QuickActionType; label: string; icon: React.ElementType }[] = [
    { id: 'send-money', label: 'Send money', icon: Send },
    { id: 'pay-bills', label: 'Pay bills', icon: Receipt },
    { id: 'recharge', label: 'Recharge', icon: Smartphone },
    { id: 'scan-pay', label: 'Scan & pay', icon: QrCode },
    { id: 'statement', label: 'Statement', icon: FileText },
    { id: 'add-payee', label: 'Add payee', icon: UserPlus },
    { id: 'open-fd', label: 'Open FD', icon: Landmark },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <div className="ib-card p-4 sm:p-5">
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => onActionClick(act.id)}
              className="group flex flex-col items-center justify-center py-3 px-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-2 text-center leading-tight">{act.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
