import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck, Wallet, ArrowDownLeft, ShieldCheck, AlertCircle, Tag, Wrench, ChevronRight } from 'lucide-react';
import { BankNotification, NavTab } from '../../types';
import { Page, PageHeader, Card, Badge, EmptyState } from '../ui/Primitives';
import { MotionList, MotionRow } from '../ui/Motion';
import { useBank, timeAgo } from '../../store/BankStore';

interface NotificationsViewProps {
  onNavigate: (tab: NavTab) => void;
}

type Filter = 'All' | 'Unread' | BankNotification['kind'];

const KIND_META: Record<BankNotification['kind'], { icon: React.ElementType; tone: string; label: string }> = {
  payment: { icon: Wallet, tone: 'text-indigo-600 bg-indigo-50 border-indigo-100', label: 'Payments' },
  credit: { icon: ArrowDownLeft, tone: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: 'Credits' },
  security: { icon: ShieldCheck, tone: 'text-sky-600 bg-sky-50 border-sky-100', label: 'Security' },
  reminder: { icon: AlertCircle, tone: 'text-amber-600 bg-amber-50 border-amber-100', label: 'Reminders' },
  offer: { icon: Tag, tone: 'text-rose-600 bg-rose-50 border-rose-100', label: 'Offers' },
  service: { icon: Wrench, tone: 'text-violet-600 bg-violet-50 border-violet-100', label: 'Service' },
};

function dayLabel(at: number): string {
  const d = new Date(at);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' });
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAllRead, markRead } = useBank();
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = useMemo(
    () => notifications.filter((n) => (filter === 'All' ? true : filter === 'Unread' ? !n.read : n.kind === filter)),
    [notifications, filter]
  );

  const groups = useMemo(() => {
    const map = new Map<string, BankNotification[]>();
    for (const n of filtered) {
      const k = dayLabel(n.at);
      map.set(k, [...(map.get(k) || []), n]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <Page>
      <PageHeader
        title="Notifications"
        subtitle="Alerts for every debit, credit, sign-in and service update — the same feed your SMS and email alerts use."
        actions={
          <button onClick={markAllRead} disabled={unreadCount === 0} className="ib-btn-secondary">
            <CheckCheck className="w-4 h-4 text-indigo-600" /> Mark all read {unreadCount > 0 && `(${unreadCount})`}
          </button>
        }
      />

      <div className="flex items-center gap-2 overflow-x-auto ib-scroll -mx-1 px-1 pb-1">
        {(['All', 'Unread', 'payment', 'credit', 'security', 'reminder', 'service', 'offer'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`ib-chip shrink-0 ${filter === f ? 'bg-indigo-600 text-white border-indigo-600' : ''}`}>
            {f === 'All' || f === 'Unread' ? f : KIND_META[f].label}
            {f === 'Unread' && unreadCount > 0 && <span className={`ml-1.5 text-[10px] px-1.5 rounded-md ${filter === f ? 'bg-white/20' : 'bg-indigo-600 text-white'}`}>{unreadCount}</span>}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState icon={<Bell className="w-5 h-5" />} title="Nothing here" description={filter === 'Unread' ? "You're all caught up." : 'No notifications match this filter yet.'} />
        </Card>
      ) : (
        groups.map(([day, items]) => (
          <div key={day}>
            <span className="ib-eyebrow px-1">{day}</span>
            <Card padded={false} className="mt-2">
              <MotionList className="divide-y divide-slate-100">
                {items.map((n) => {
                  const { icon: Icon, tone } = KIND_META[n.kind];
                  return (
                    <MotionRow key={n.id} highlight={!n.read} className={`${n.read ? '' : 'bg-indigo-50/30'}`}>
                      <button
                        type="button"
                        onClick={() => {
                          markRead(n.id);
                          if (n.tab) onNavigate(n.tab);
                        }}
                        className="w-full px-5 py-4 flex items-start gap-3.5 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${tone}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className={`text-sm ${n.read ? 'font-medium text-slate-800' : 'font-semibold text-slate-900'}`}>{n.title}</span>
                            {!n.read && <Badge tone="indigo">New</Badge>}
                          </span>
                          <span className="text-sm text-slate-500 block mt-0.5 leading-relaxed">{n.body}</span>
                          <span className="text-[11px] text-slate-400 block mt-1">{timeAgo(n.at)} · {new Date(n.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        {n.tab && <ChevronRight className="w-4 h-4 text-slate-300 mt-3 shrink-0" />}
                      </button>
                    </MotionRow>
                  );
                })}
              </MotionList>
            </Card>
          </div>
        ))
      )}
    </Page>
  );
};
