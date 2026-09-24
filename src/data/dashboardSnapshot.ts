/**
 * Tiny in-memory store of what the dashboard currently shows.
 *
 * DashboardView publishes its live state (accounts after transfers, new transactions,
 * the active tab); the Zora assistant, which is mounted outside the dashboard shell,
 * reads it when sending a message so the AI answers from the screen the customer sees.
 */
import type { DashboardSnapshot } from './bankingContext';

let snapshot: DashboardSnapshot = {};

export function publishDashboardSnapshot(next: Omit<DashboardSnapshot, 'capturedAt'>) {
  snapshot = { ...snapshot, ...next, capturedAt: Date.now() };
}

/** Returns a trimmed copy safe to send with a chat request. */
export function getDashboardSnapshot(): DashboardSnapshot {
  return {
    accounts: snapshot.accounts?.map(({ id, name, type, accountNumber, maskedNumber, routingNumber, balance, currency, status, maturityDate, interestRate }) => ({
      id, name, type, accountNumber, maskedNumber, routingNumber, balance, currency, status, maturityDate, interestRate,
    })),
    transactions: snapshot.transactions?.slice(0, 15),
    activeTab: snapshot.activeTab,
    beneficiaries: snapshot.beneficiaries,
    requests: snapshot.requests,
    unreadNotifications: snapshot.unreadNotifications,
    capturedAt: snapshot.capturedAt,
  };
}
