/**
 * One ledger for the whole portal.
 *
 * Every screen reads from here and every money movement writes here, so a credit-card
 * payment made in Zora, on the Cards page or from a phone that scanned the QR shows up in
 * the Savings balance, the statement, the notification bell and the home dashboard at once.
 *
 * - The credit card ledger lives on the server (`/api/banking/credit-card`). The store polls
 *   it and reconciles every settled payment it has not seen yet into the local ledger.
 * - Accounts, transactions, beneficiaries, notifications and service requests are kept here
 *   and persisted in the browser, so a refresh does not wipe the session's activity.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BankAccount,
  Transaction,
  BankNotification,
  Beneficiary,
  ServiceRequest,
  CoreCreditCard,
  CardPaymentRecord,
  NavTab,
} from '../types';
import { INITIAL_ACCOUNTS, seedTransactions, QUICK_PAYEES, dateDaysAgo } from '../data/mockData';
import { safeStorage } from '../utils/storage';
import { publishDashboardSnapshot } from '../data/dashboardSnapshot';
import { formatINR } from '../utils/format';

const STORAGE_KEY = 'indiabank_ledger_v2';
const SAVINGS_FLOOR = 100000; // demo: Savings is kept at about ₹1 lakh so every walkthrough can book, pay and transfer
const BENEFICIARY_COOLING_MS = 45_000; // real banks use 24h; shortened so the demo can be walked end-to-end

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: 'success' | 'info' | 'warning';
}

interface PersistedLedger {
  accounts: BankAccount[];
  transactions: Transaction[];
  notifications: BankNotification[];
  beneficiaries: Beneficiary[];
  requests: ServiceRequest[];
  seenUtrs: string[];
  savedAt: number;
}

export interface TransferInput {
  amount: number;
  beneficiaryId?: string;
  payeeName: string;
  description: string;
  channel: 'IMPS' | 'UPI' | 'NEFT' | 'RTGS' | 'BBPS' | 'QR';
  category?: string;
  fromAccountId?: string;
}

export interface DepositInput {
  kind: 'FD' | 'RD';
  amount: number;
  tenureMonths: number;
  ratePct: number;
  fromAccountId?: string;
}

export interface BankStoreValue {
  ready: boolean;
  accounts: BankAccount[];
  transactions: Transaction[];
  notifications: BankNotification[];
  unreadCount: number;
  beneficiaries: Beneficiary[];
  requests: ServiceRequest[];
  card: CoreCreditCard | null;
  cardPayments: CardPaymentRecord[];
  toasts: Toast[];

  savingsAccount: BankAccount;
  transfer: (input: TransferInput) => Transaction | null;
  openDeposit: (input: DepositInput) => BankAccount | null;
  addBeneficiary: (b: Omit<Beneficiary, 'id' | 'status' | 'addedAt' | 'activatesAt' | 'transferCount' | 'avatar'>) => Beneficiary;
  removeBeneficiary: (id: string) => void;
  createRequest: (type: string, details: string, eta?: string) => ServiceRequest;
  markAllRead: () => void;
  markRead: (id: string) => void;
  pushNotification: (n: Omit<BankNotification, 'id' | 'at' | 'read'>) => void;
  dismissToast: (id: string) => void;
  refreshCard: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Seeds                                                               */
/* ------------------------------------------------------------------ */

const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const daysAgoMs = (d: number) => Date.now() - d * 86_400_000;

function seedBeneficiaries(): Beneficiary[] {
  const extras: Record<string, { accountNumber: string; ifsc: string }> = {
    p1: { accountNumber: '50100234512233', ifsc: 'HDFC0000240' },
    p2: { accountNumber: '002301567788', ifsc: 'ICIC0000023' },
    p3: { accountNumber: '30419988201', ifsc: 'SBIN0011455' },
    p4: { accountNumber: '917010056642811', ifsc: 'UTIB0000210' },
    p5: { accountNumber: '919876501234', ifsc: 'PYTM0123456' },
  };
  return QUICK_PAYEES.map((p, i) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    bank: p.bank,
    vpa: p.vpa,
    accountNumber: extras[p.id]?.accountNumber,
    ifsc: extras[p.id]?.ifsc,
    status: 'Active' as const,
    addedAt: daysAgoMs(120 + i * 40),
    lastPaidAt: i < 2 ? daysAgoMs(12 + i * 9) : undefined,
    transferCount: [14, 6, 3, 9, 2][i] ?? 1,
  }));
}

function seedNotifications(): BankNotification[] {
  return [
    { id: 'n-signin', title: 'New sign-in verified', body: 'NetBanking login from a trusted browser in Mumbai.', kind: 'security', at: Date.now() - 60_000, read: false, tab: 'profile' },
    { id: 'n-stmt', title: 'Credit card statement generated', body: 'Nexora Royale Infinite •••• 8842 — total due ₹87,500.00, minimum ₹4,500.00.', kind: 'reminder', at: daysAgoMs(1), read: false, tab: 'cards' },
    { id: 'n-salary', title: 'Salary credited', body: '₹75,000.00 received via NEFT from ABC Corp.', kind: 'credit', at: daysAgoMs(2), read: true, tab: 'statements' },
    { id: 'n-fd', title: 'FD maturing in 6 months', body: 'FD •••• 9101 (₹5,00,000) — reinvest at 6.75% p.a. to keep the high-yield rate.', kind: 'reminder', at: daysAgoMs(4), read: true, tab: 'deposits' },
    { id: 'n-offer', title: 'Amazon Prime Shopping Days', body: '10% instant discount on electronics with your Nexora Infinite card this weekend.', kind: 'offer', at: daysAgoMs(6), read: true, tab: 'offers' },
  ];
}

function seedLedger(): PersistedLedger {
  return {
    accounts: INITIAL_ACCOUNTS.map((a) => ({ ...a })),
    transactions: seedTransactions(),
    notifications: seedNotifications(),
    beneficiaries: seedBeneficiaries(),
    requests: [],
    seenUtrs: [],
    savedAt: Date.now(),
  };
}

/**
 * If earlier demos have drained Savings below ₹1 lakh, a salary credit lands on load — the way
 * a real month-end would — so the balance stays around ₹1 lakh for the next walkthrough.
 */
function topUpSavings(ledger: PersistedLedger): PersistedLedger {
  const savings = ledger.accounts.find((a) => a.type === 'Savings');
  if (!savings || savings.balance >= SAVINGS_FLOOR) return ledger;
  const amount = Math.ceil((SAVINGS_FLOOR + 24560.5 - savings.balance) / 500) * 500;
  const txn: Transaction = {
    id: uid('txn'),
    ...dateDaysAgo(0),
    description: 'Salary Credit from ABC Corp - Monthly Salary',
    merchant: 'Salary Credit from ABC Corp',
    category: 'Salary',
    amount,
    type: 'credit',
    status: 'Completed',
    reference: `NEFT-SAL${Date.now().toString().slice(-7)}`,
    iconType: 'salary',
    accountId: savings.id,
    channel: 'NEFT',
  };
  return {
    ...ledger,
    accounts: ledger.accounts.map((a) => (a.id === savings.id ? { ...a, balance: +(a.balance + amount).toFixed(2) } : a)),
    transactions: [txn, ...ledger.transactions],
    notifications: [
      { id: uid('n'), title: 'Salary credited', body: `${formatINR(amount)} received via NEFT from ABC Corp.`, kind: 'credit' as const, at: Date.now(), read: false, tab: 'statements' as NavTab },
      ...ledger.notifications,
    ].slice(0, 60),
  };
}

function loadLedger(): PersistedLedger {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedLedger;
      if (parsed && Array.isArray(parsed.accounts) && Array.isArray(parsed.transactions)) return topUpSavings(parsed);
    }
  } catch {
    /* corrupt or blocked storage — start fresh */
  }
  return seedLedger();
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const todayLabel = () => dateDaysAgo(0).date;

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Does this card-payment method pull money from the customer's own India Bank account? */
const debitsSavings = (method: string) => /savings|debit card|imps|a\/c|ac1000231234/i.test(method) && !/upi|qr|bharat/i.test(method);

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const BankContext = createContext<BankStoreValue | null>(null);

export const BankProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ledger, setLedger] = useState<PersistedLedger>(() => loadLedger());
  const [card, setCard] = useState<CoreCreditCard | null>(null);
  const [cardPayments, setCardPayments] = useState<CardPaymentRecord[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(false);
  const ledgerRef = useRef(ledger);
  ledgerRef.current = ledger;

  /* ---- persistence ---- */
  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify({ ...ledger, savedAt: Date.now() }));
    } catch {
      /* ignore */
    }
  }, [ledger]);

  /* ---- toasts ---- */
  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = uid('toast');
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5200);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);

  /* ---- notifications ---- */
  const pushNotification = useCallback((n: Omit<BankNotification, 'id' | 'at' | 'read'>) => {
    setLedger((prev) => ({
      ...prev,
      notifications: [{ ...n, id: uid('n'), at: Date.now(), read: false }, ...prev.notifications].slice(0, 60),
    }));
  }, []);

  const markAllRead = useCallback(() => {
    setLedger((prev) => ({ ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) }));
  }, []);
  const markRead = useCallback((id: string) => {
    setLedger((prev) => ({ ...prev, notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }, []);

  /* ---- money movement ---- */
  const debitAccount = (accounts: BankAccount[], accountId: string | undefined, amount: number) => {
    const id = accountId || accounts.find((a) => a.type === 'Savings')?.id;
    return accounts.map((a) => (a.id === id ? { ...a, balance: Math.max(0, +(a.balance - amount).toFixed(2)) } : a));
  };

  const transfer = useCallback(
    (input: TransferInput): Transaction | null => {
      const amt = Number(input.amount);
      if (!amt || amt <= 0) return null;
      const from = ledgerRef.current.accounts.find((a) => a.id === (input.fromAccountId || 'acc-1')) || ledgerRef.current.accounts[0];
      if (from.balance < amt) {
        pushToast({ tone: 'warning', title: 'Insufficient balance', body: `${from.name} has ${formatINR(from.balance)} available.` });
        return null;
      }
      const ref =
        input.channel === 'BBPS'
          ? `BBPS-${Date.now().toString().slice(-8)}`
          : input.channel === 'UPI' || input.channel === 'QR'
            ? `UPI/INB/${Date.now().toString().slice(-6)}`
            : `${input.channel}-INB-${Date.now().toString().slice(-8)}`;
      const txn: Transaction = {
        id: uid('txn'),
        ...dateDaysAgo(0),
        description: input.description,
        merchant: input.payeeName,
        category: input.category || (input.channel === 'BBPS' ? 'Bills & Utilities' : 'Transfers'),
        amount: amt,
        type: 'debit',
        status: 'Completed',
        reference: ref,
        iconType: input.channel === 'BBPS' ? 'bills' : 'transfer',
        accountId: from.id,
        channel: input.channel,
      };
      setLedger((prev) => ({
        ...prev,
        accounts: debitAccount(prev.accounts, from.id, amt),
        transactions: [txn, ...prev.transactions],
        beneficiaries: prev.beneficiaries.map((b) =>
          b.id === input.beneficiaryId ? { ...b, lastPaidAt: Date.now(), transferCount: b.transferCount + 1 } : b
        ),
        notifications: [
          {
            id: uid('n'),
            title: input.channel === 'BBPS' ? 'Bill paid' : 'Money sent',
            body: `${formatINR(amt)} to ${input.payeeName} via ${input.channel} · Ref ${ref}`,
            kind: 'payment' as const,
            at: Date.now(),
            read: false,
            tab: 'statements' as NavTab,
          },
          ...prev.notifications,
        ],
      }));
      pushToast({ tone: 'success', title: input.channel === 'BBPS' ? 'Bill paid' : 'Transfer successful', body: `${formatINR(amt)} debited from ${from.name}` });
      return txn;
    },
    [pushToast]
  );

  const openDeposit = useCallback(
    (input: DepositInput): BankAccount | null => {
      const amt = Number(input.amount);
      if (!amt || amt <= 0) return null;
      const from = ledgerRef.current.accounts.find((a) => a.id === (input.fromAccountId || 'acc-1')) || ledgerRef.current.accounts[0];
      if (from.balance < amt) {
        pushToast({ tone: 'warning', title: 'Insufficient balance', body: `${from.name} has ${formatINR(from.balance)} available.` });
        return null;
      }
      const serial = Math.floor(1000 + Math.random() * 9000);
      const number = `${input.kind}8829${serial}${Math.floor(10 + Math.random() * 89)}`;
      const acct: BankAccount = {
        id: uid('acc'),
        name: input.kind === 'FD' ? 'Fixed Deposit' : 'Recurring Deposit',
        type: input.kind === 'FD' ? 'Fixed Deposit' : 'Recurring Deposit',
        accountNumber: number,
        maskedNumber: `XXXX ${number.slice(-4)}`,
        routingNumber: 'NXRA0001089',
        balance: amt,
        currency: 'INR',
        status: 'Active',
        color: 'amber',
        maturityDate: addMonths(input.tenureMonths),
        interestRate: `${input.ratePct.toFixed(2)}% p.a.`,
      };
      const txn: Transaction = {
        id: uid('txn'),
        ...dateDaysAgo(0),
        description: `${acct.name} booked · ${number} · ${input.tenureMonths} months @ ${input.ratePct.toFixed(2)}%`,
        merchant: `India Bank ${acct.name}`,
        category: 'Investments',
        amount: amt,
        type: 'debit',
        status: 'Completed',
        reference: `DEP-${number.slice(-8)}`,
        iconType: 'deposit',
        accountId: from.id,
        channel: 'Internal',
      };
      const now = Date.now();
      const record: ServiceRequest = {
        id: `SR${now.toString().slice(-8)}`,
        type: `${acct.name} opened`,
        details: `${number} · ${formatINR(amt)} · ${input.tenureMonths} months @ ${input.ratePct.toFixed(2)}% · matures ${acct.maturityDate}`,
        status: 'Completed',
        createdAt: now,
        eta: 'Instant',
        steps: [
          { label: 'Request received', at: now },
          { label: 'Funds debited', at: now },
          { label: 'Deposit opened', at: now },
        ],
      };
      setLedger((prev) => ({
        ...prev,
        accounts: [...debitAccount(prev.accounts, from.id, amt), acct],
        transactions: [txn, ...prev.transactions],
        requests: [record, ...prev.requests],
        notifications: [
          {
            id: uid('n'),
            title: `${acct.name} booked`,
            body: `${formatINR(amt)} · matures ${acct.maturityDate} at ${acct.interestRate}. Certificate ${number} is in your documents.`,
            kind: 'service' as const,
            at: Date.now(),
            read: false,
            tab: 'deposits' as NavTab,
          },
          ...prev.notifications,
        ],
      }));
      pushToast({ tone: 'success', title: `${acct.name} opened`, body: `${number} · ${formatINR(amt)} debited from ${from.name}` });
      return acct;
    },
    [pushToast]
  );

  /* ---- beneficiaries ---- */
  const addBeneficiary: BankStoreValue['addBeneficiary'] = useCallback(
    (b) => {
      const now = Date.now();
      const ben: Beneficiary = {
        ...b,
        id: uid('ben'),
        avatar: b.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        status: 'Cooling',
        addedAt: now,
        activatesAt: now + BENEFICIARY_COOLING_MS,
        transferCount: 0,
      };
      setLedger((prev) => ({
        ...prev,
        beneficiaries: [...prev.beneficiaries, ben],
        notifications: [
          { id: uid('n'), title: 'Beneficiary added', body: `${ben.name} (${ben.bank}) will be active for transfers after the security cooling period.`, kind: 'security' as const, at: now, read: false, tab: 'beneficiaries' as NavTab },
          ...prev.notifications,
        ],
      }));
      pushToast({ tone: 'info', title: 'Beneficiary added', body: 'Activates after a short cooling period' });
      return ben;
    },
    [pushToast]
  );

  const removeBeneficiary = useCallback((id: string) => {
    setLedger((prev) => ({ ...prev, beneficiaries: prev.beneficiaries.filter((b) => b.id !== id) }));
  }, []);

  // Cooling period → Active
  useEffect(() => {
    const cooling = ledger.beneficiaries.filter((b) => b.status === 'Cooling' && b.activatesAt);
    if (cooling.length === 0) return;
    const next = Math.min(...cooling.map((b) => b.activatesAt!));
    const t = window.setTimeout(() => {
      const now = Date.now();
      setLedger((prev) => ({
        ...prev,
        beneficiaries: prev.beneficiaries.map((b) => (b.status === 'Cooling' && b.activatesAt && b.activatesAt <= now ? { ...b, status: 'Active' } : b)),
      }));
      const activated = cooling.filter((b) => b.activatesAt! <= now + 50);
      if (activated.length) pushToast({ tone: 'success', title: 'Beneficiary active', body: `${activated.map((b) => b.name).join(', ')} can now receive transfers` });
    }, Math.max(50, next - Date.now()));
    return () => window.clearTimeout(t);
  }, [ledger.beneficiaries, pushToast]);

  /* ---- service requests ---- */
  const createRequest = useCallback(
    (type: string, details: string, eta = '2 working days') => {
      const now = Date.now();
      const req: ServiceRequest = {
        id: `SR${now.toString().slice(-8)}`,
        type,
        details,
        status: 'Received',
        createdAt: now,
        eta,
        steps: [
          { label: 'Request received', at: now },
          { label: 'Verification & processing', at: null },
          { label: 'Completed', at: null },
        ],
      };
      setLedger((prev) => ({
        ...prev,
        requests: [req, ...prev.requests],
        notifications: [
          { id: uid('n'), title: `${type} request raised`, body: `Reference ${req.id} · expected completion in ${eta}.`, kind: 'service' as const, at: now, read: false, tab: 'services' as NavTab },
          ...prev.notifications,
        ],
      }));
      pushToast({ tone: 'info', title: 'Request raised', body: `Reference ${req.id}` });
      return req;
    },
    [pushToast]
  );

  // Requests move along on their own so the tracker feels alive (30 s → in progress, 2 min → completed)
  useEffect(() => {
    if (ledger.requests.every((r) => r.status === 'Completed')) return;
    const t = window.setInterval(() => {
      const now = Date.now();
      setLedger((prev) => {
        let changed = false;
        const requests = prev.requests.map((r) => {
          const age = now - r.createdAt;
          if (r.status === 'Received' && age > 30_000) {
            changed = true;
            return { ...r, status: 'In progress' as const, steps: r.steps.map((s, i) => (i === 1 ? { ...s, at: now } : s)) };
          }
          if (r.status === 'In progress' && age > 120_000) {
            changed = true;
            return { ...r, status: 'Completed' as const, steps: r.steps.map((s, i) => (i === 2 ? { ...s, at: now } : s)) };
          }
          return r;
        });
        if (!changed) return prev;
        const done = requests.filter((r, i) => r.status === 'Completed' && prev.requests[i].status !== 'Completed');
        return {
          ...prev,
          requests,
          notifications: [
            ...done.map((r) => ({ id: uid('n'), title: `${r.type} completed`, body: `Request ${r.id} has been fulfilled.`, kind: 'service' as const, at: now, read: false, tab: 'services' as NavTab })),
            ...prev.notifications,
          ],
        };
      });
    }, 5000);
    return () => window.clearInterval(t);
  }, [ledger.requests]);

  /* ---- credit card ledger (server) ---- */
  const refreshCard = useCallback(async () => {
    try {
      const res = await fetch('/api/banking/credit-card');
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.card) return;
      setCard(data.card);
      const payments: CardPaymentRecord[] = Array.isArray(data.payments) ? data.payments : [];
      setCardPayments(payments);

      // Reconcile: any settled payment we have not booked yet flows into the local ledger.
      const fresh = payments.filter((p) => !ledgerRef.current.seenUtrs.includes(p.utr));
      if (fresh.length === 0) return;
      setLedger((prev) => {
        let accounts = prev.accounts;
        const txns: Transaction[] = [];
        const notes: BankNotification[] = [];
        for (const p of fresh.reverse()) {
          const fromSavings = debitsSavings(p.method);
          if (fromSavings) accounts = debitAccount(accounts, 'acc-1', p.amount);
          txns.unshift({
            id: uid('txn'),
            ...dateDaysAgo(0),
            description: `Credit card bill payment · Nexora Royale Infinite •••• 8842 · ${p.method}`,
            merchant: 'Credit card payment',
            category: 'Card payment',
            amount: p.amount,
            type: 'debit',
            status: 'Completed',
            reference: p.utr,
            iconType: 'card',
            accountId: fromSavings ? 'acc-1' : undefined,
            channel: p.method,
          });
          notes.unshift({
            id: uid('n'),
            title: 'Credit card payment received',
            body: `${formatINR(p.amount)} towards •••• 8842 via ${p.method} · UTR ${p.utr}${fromSavings ? ' · debited from Savings' : ''}`,
            kind: 'payment',
            at: p.at || Date.now(),
            read: false,
            tab: 'cards',
          });
        }
        return {
          ...prev,
          accounts,
          transactions: [...txns, ...prev.transactions],
          notifications: [...notes, ...prev.notifications].slice(0, 60),
          seenUtrs: [...prev.seenUtrs, ...fresh.map((p) => p.utr)].slice(-200),
        };
      });
      const latest = fresh[fresh.length - 1];
      pushToast({
        tone: 'success',
        title: 'Card payment posted',
        body: `${formatINR(latest.amount)} · new outstanding ${formatINR(data.card.outstandingBalance)}`,
      });
    } catch {
      /* server unreachable — keep the last known card */
    }
  }, [pushToast]);

  useEffect(() => {
    refreshCard().finally(() => setReady(true));
    const poll = window.setInterval(refreshCard, 5000);
    const onEvent = () => refreshCard();
    window.addEventListener('ib:card-updated', onEvent);
    window.addEventListener('focus', onEvent);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('ib:card-updated', onEvent);
      window.removeEventListener('focus', onEvent);
    };
  }, [refreshCard]);

  /* ---- Zora snapshot ---- */
  useEffect(() => {
    publishDashboardSnapshot({
      accounts: ledger.accounts,
      transactions: ledger.transactions,
      beneficiaries: ledger.beneficiaries.map((b) => ({ name: b.name, bank: b.bank, status: b.status })),
      requests: ledger.requests.map((r) => ({ id: r.id, type: r.type, status: r.status, eta: r.eta })),
      unreadNotifications: ledger.notifications.filter((n) => !n.read).length,
    });
  }, [ledger]);

  /* ---- demo reset ---- */
  const resetDemo = useCallback(async () => {
    try {
      await fetch('/api/banking/reset-card', { method: 'POST' });
    } catch {
      /* ignore */
    }
    setLedger(seedLedger());
    await refreshCard();
    pushToast({ tone: 'info', title: 'Demo data reset', body: 'Balances, statement and card restored to the opening position' });
  }, [refreshCard, pushToast]);

  const savingsAccount = useMemo(() => ledger.accounts.find((a) => a.type === 'Savings') || ledger.accounts[0], [ledger.accounts]);
  const unreadCount = useMemo(() => ledger.notifications.filter((n) => !n.read).length, [ledger.notifications]);

  const value: BankStoreValue = {
    ready,
    accounts: ledger.accounts,
    transactions: ledger.transactions,
    notifications: ledger.notifications,
    unreadCount,
    beneficiaries: ledger.beneficiaries,
    requests: ledger.requests,
    card,
    cardPayments,
    toasts,
    savingsAccount,
    transfer,
    openDeposit,
    addBeneficiary,
    removeBeneficiary,
    createRequest,
    markAllRead,
    markRead,
    pushNotification,
    dismissToast,
    refreshCard,
    resetDemo,
  };

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
};

export function useBank(): BankStoreValue {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error('useBank must be used inside <BankProvider>');
  return ctx;
}

/** Tells the store a card payment just settled so it reconciles immediately instead of at the next poll. */
export const notifyCardUpdated = () => window.dispatchEvent(new CustomEvent('ib:card-updated'));

/** Relative time for notification rows ("just now", "5 min ago", "2 days ago"). */
export function timeAgo(at: number): string {
  const diff = Date.now() - at;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export { todayLabel };
