/**
 * Single source of truth for what Zora (the AI assistant) knows about the customer.
 *
 * Everything here is derived from the same data the dashboard renders (mockData + the
 * live state the shell keeps in memory), so the model answers from what the customer
 * actually sees on screen rather than from a separate hard-coded script.
 *
 * Shared by the Express server (builds the Gemini system prompt) and the client
 * (captures the on-screen snapshot that is sent along with every chat message).
 */
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  SPENDING_INSIGHTS,
  CREDIT_SCORE_DATA,
  MOCK_CARDS,
  BANK_OFFERS,
  QUICK_PAYEES,
} from './mockData';
import type { BankAccount, Transaction } from '../types';

/** Figures shown on the Loans view (LoansView.tsx). */
export const LOAN_FACTS = {
  product: 'Smart Personal Loan',
  accountNumber: 'PL882910',
  sanctioned: 800000,
  outstanding: 342100,
  emi: 18450,
  emiDay: '1st of every month (auto-debit from Savings AC1000231234)',
  rate: '10.50% p.a. (reducing balance)',
  emisRemaining: 22,
  status: 'Regular — no missed EMIs',
};

/** Holdings shown on the Investments view (InvestmentsView.tsx). */
export const PORTFOLIO = {
  totalValue: 814200,
  invested: 650000,
  gain: 164200,
  gainPct: 25.2,
  holdings: [
    { name: 'Fixed Deposit · FD8829109101', type: 'Deposit', value: 500000, change: '+6.75% p.a.' },
    { name: 'Nifty 50 Index Fund (Direct)', type: 'Mutual fund', value: 312400, change: '+28.4%' },
    { name: 'Flexi Cap Fund (Direct)', type: 'Mutual fund', value: 286900, change: '+22.1%' },
    { name: 'Corporate Bond Fund', type: 'Debt', value: 214900, change: '+7.9%' },
  ],
};

/** Credit-card fee schedule Zora quotes when asked about penalties. */
export const CARD_FEE_SCHEDULE = [
  'Late payment fee: nil up to ₹1,000 due; ₹500 for ₹1,001–₹10,000; ₹750 for ₹10,001–₹50,000; ₹1,300 above ₹50,000',
  'Finance charges: 3.49% per month (41.88% p.a.) on the unpaid amount from the transaction date, and on new purchases until the balance is cleared in full',
  'GST: 18% on all fees and charges',
  'Credit bureau: a payment more than 30 days late is reported to CIBIL and can lower the score',
  'Paying the minimum due avoids the late fee but interest still accrues on the remainder',
];

/** Live pieces of state the shell keeps in memory and passes to Zora with each message. */
export interface DashboardSnapshot {
  accounts?: BankAccount[];
  transactions?: Transaction[];
  activeTab?: string;
  beneficiaries?: { name: string; bank: string; status: string }[];
  requests?: { id: string; type: string; status: string; eta: string }[];
  unreadNotifications?: number;
  capturedAt?: number;
}

/** Shape of the server-side credit-card ledger (mirrors CoreCreditCard in server.ts). */
export interface LiveCardState {
  cardName: string;
  cardNumber?: string;
  maskedNumber: string;
  creditLimit: number;
  availableCredit: number;
  outstandingBalance: number;
  minimumDue: number;
  dueDate: string;
  billingCycle?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastUtr?: string;
  lastPaymentMethod?: string;
}

export const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const inrWhole = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function dueDescriptor(dueDate: string): string {
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return dueDate;
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return `${dueDate} (overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'})`;
  if (days === 0) return `${dueDate} (due today)`;
  return `${dueDate} (${days} day${days === 1 ? '' : 's'} left)`;
}

/**
 * Renders the customer's complete banking picture as plain text for the model.
 * The snapshot wins over the seed data so post-transfer balances and new transactions
 * are reflected; the live card ledger always comes from the server.
 */
export function buildBankingContext(
  snapshot: DashboardSnapshot | undefined,
  card: LiveCardState,
  opts: { userName: string; userEmail?: string; customerId?: string } = { userName: 'Customer' }
): string {
  const accounts = snapshot?.accounts?.length ? snapshot.accounts : INITIAL_ACCOUNTS;
  const transactions = snapshot?.transactions?.length ? snapshot.transactions : INITIAL_TRANSACTIONS;
  const debitCard = MOCK_CARDS.find((c) => c.type === 'Debit');
  const creditSeed = MOCK_CARDS.find((c) => c.type === 'Credit');

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const fd = accounts.find((a) => a.type === 'Fixed Deposit');
  const netWorth = totalBalance + PORTFOLIO.totalValue - (fd?.balance ?? 0) - LOAN_FACTS.outstanding - card.outstandingBalance;

  const lines: string[] = [];
  lines.push(`Customer: ${opts.userName}${opts.userEmail ? ` (${opts.userEmail})` : ''}`);
  lines.push(`Customer ID: ${opts.customerId || 'CUST-INB-7729104'}`);
  lines.push(`Home branch: Nariman Point, Mumbai (IFSC INBA0001042)`);
  lines.push(`Today's date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
  if (snapshot?.activeTab) lines.push(`Screen the customer is currently viewing: ${snapshot.activeTab}`);
  lines.push('');

  lines.push('ACCOUNTS (as shown on the dashboard):');
  accounts.forEach((a, i) => {
    const extras = [
      a.interestRate && a.interestRate !== 'N/A' ? `interest ${a.interestRate}` : null,
      a.maturityDate ? `matures ${a.maturityDate}` : null,
      `status ${a.status}`,
    ]
      .filter(Boolean)
      .join(', ');
    lines.push(`${i + 1}. ${a.name} ${a.accountNumber} (${a.maskedNumber}): balance ${inr(a.balance)}${extras ? ` — ${extras}` : ''}`);
  });
  lines.push(`Total across deposit accounts: ${inr(totalBalance)}`);
  if (fd) lines.push(`Fixed deposit projected maturity value: ₹5,34,500.00 on ${fd.maturityDate}`);
  lines.push('');

  lines.push('CREDIT CARD (live core-banking ledger — always quote these numbers):');
  lines.push(`- ${card.cardName} ${card.cardNumber || creditSeed?.cardNumber || ''} (${card.maskedNumber}), Visa Infinite, expiry ${creditSeed?.expiry || '09/30'}`);
  lines.push(`- Total outstanding due: ${inr(card.outstandingBalance)}`);
  lines.push(`- Minimum amount due: ${inr(card.minimumDue)}`);
  lines.push(`- Payment due date: ${dueDescriptor(card.dueDate)}`);
  lines.push(`- Credit limit ${inrWhole(card.creditLimit)}, available credit ${inrWhole(card.availableCredit)} (utilisation ${Math.round(((card.creditLimit - card.availableCredit) / card.creditLimit) * 100)}%)`);
  if (card.billingCycle) lines.push(`- Billing cycle: ${card.billingCycle}`);
  if (card.lastPaymentAmount) {
    lines.push(
      `- Last payment: ${inr(card.lastPaymentAmount)} on ${new Date(card.lastPaymentDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}${card.lastUtr ? ` (UTR ${card.lastUtr})` : ''}${card.lastPaymentMethod ? ` via ${card.lastPaymentMethod}` : ''}`
    );
  }
  lines.push(`- Reward points: ${(creditSeed?.rewardPoints ?? 14250).toLocaleString('en-IN')} (≈ ₹${Math.round((creditSeed?.rewardPoints ?? 14250) * 0.25).toLocaleString('en-IN')} value)`);
  lines.push(`- Domestic limit ${inrWhole(creditSeed?.domesticLimit ?? 250000)}, international ${creditSeed?.internationalEnabled ? 'enabled' : 'disabled'}, contactless ${creditSeed?.contactlessEnabled ? 'on' : 'off'}`);
  lines.push('- Payment channels available in this chat: Savings account direct debit, any debit card with OTP, or a single-use dynamic QR (scan from any phone / UPI app)');
  lines.push('- Fee schedule if the bill is missed:');
  CARD_FEE_SCHEDULE.forEach((f) => lines.push(`  • ${f}`));
  if (debitCard) {
    lines.push(`- Debit card: ${debitCard.cardName} ${debitCard.cardNumber}, ${debitCard.network} ${debitCard.tier}, daily limit ${inrWhole(debitCard.domesticLimit)}, international ${debitCard.internationalEnabled ? 'enabled' : 'disabled'}, ${debitCard.rewardPoints.toLocaleString('en-IN')} reward points`);
  }
  lines.push('');

  lines.push('LOAN:');
  lines.push(`- ${LOAN_FACTS.product} ${LOAN_FACTS.accountNumber}: sanctioned ${inr(LOAN_FACTS.sanctioned)}, outstanding principal ${inr(LOAN_FACTS.outstanding)}`);
  lines.push(`- EMI ${inr(LOAN_FACTS.emi)} on the ${LOAN_FACTS.emiDay}; ${LOAN_FACTS.emisRemaining} EMIs remaining; rate ${LOAN_FACTS.rate}; ${LOAN_FACTS.status}`);
  lines.push('');

  lines.push('INVESTMENTS:');
  lines.push(`- Portfolio value ${inr(PORTFOLIO.totalValue)} (invested ${inr(PORTFOLIO.invested)}, gain +${inr(PORTFOLIO.gain)} / +${PORTFOLIO.gainPct}%)`);
  PORTFOLIO.holdings.forEach((h) => lines.push(`  • ${h.name} [${h.type}]: ${inr(h.value)} (${h.change})`));
  lines.push('');

  lines.push(`RECENT TRANSACTIONS (newest first, ${Math.min(transactions.length, 12)} of ${transactions.length}):`);
  transactions.slice(0, 12).forEach((t) => {
    lines.push(`- ${t.date}: ${t.type === 'credit' ? '+' : '−'}${inr(t.amount)} ${t.merchant} — ${t.description} [${t.category}, ${t.status}, ref ${t.reference}]`);
  });
  lines.push('');

  const spendTotal = SPENDING_INSIGHTS.reduce((s, c) => s + c.amount, 0);
  lines.push(`SPENDING THIS MONTH (total ${inr(spendTotal)}):`);
  SPENDING_INSIGHTS.forEach((c) => lines.push(`- ${c.name}: ${inr(c.amount)} (${c.percentage}%)`));
  lines.push('');

  const cs = CREDIT_SCORE_DATA;
  lines.push(`CREDIT SCORE: ${cs.score}/${cs.maxScore} (${cs.rating}), updated ${cs.updatedDate}. Payment history ${cs.factors.paymentHistory}%, utilisation ${cs.factors.creditUtilization}%, credit age ${cs.factors.creditAge}, ${cs.factors.totalAccounts} accounts, ${cs.factors.hardInquiries} hard inquiry.`);
  lines.push('');

  if (snapshot?.beneficiaries?.length) {
    lines.push('SAVED BENEFICIARIES: ' + snapshot.beneficiaries.map((b) => `${b.name} (${b.bank}${b.status !== 'Active' ? `, ${b.status.toLowerCase()} — not yet usable` : ''})`).join('; '));
  } else {
    lines.push('SAVED BENEFICIARIES: ' + QUICK_PAYEES.map((p) => `${p.name} (${p.vpa}, ${p.bank})`).join('; '));
  }
  lines.push('');

  if (snapshot?.requests?.length) {
    lines.push('OPEN SERVICE REQUESTS:');
    snapshot.requests.forEach((r) => lines.push(`- ${r.id}: ${r.type} — ${r.status} (expected ${r.eta})`));
    lines.push('');
  }
  if (typeof snapshot?.unreadNotifications === 'number') {
    lines.push(`UNREAD NOTIFICATIONS: ${snapshot.unreadNotifications}`);
    lines.push('');
  }

  lines.push('CURRENT OFFERS:');
  BANK_OFFERS.forEach((o) => lines.push(`- ${o.title} [${o.category}] — ${o.discount}, ${o.expiry}, code ${o.code}. ${o.description}`));
  lines.push('');

  lines.push(`NET POSITION: deposits + investments − loan − card due ≈ ${inr(netWorth)}`);

  return lines.join('\n');
}
