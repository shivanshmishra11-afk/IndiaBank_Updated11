export type ViewType = 'login' | 'dashboard' | 'complaint';

export type NavTab =
  | 'home'
  | 'accounts'
  | 'complaints'
  | 'cards'
  | 'payments'
  | 'transfers'
  | 'investments'
  | 'loans'
  | 'offers'
  | 'services'
  | 'statements'
  | 'beneficiaries'
  | 'deposits'
  | 'notifications'
  | 'profile';

export interface UserSession {
  email: string;
  name: string;
  firstName?: string;
  accountNumber: string;
  loginTime: string;
  avatarUrl?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'Savings' | 'Current' | 'Fixed Deposit' | 'Recurring Deposit';
  accountNumber: string;
  maskedNumber: string;
  routingNumber: string;
  balance: number;
  currency: string;
  status: 'Active' | 'Locked' | 'Review';
  color?: string;
  maturityDate?: string;
  interestRate?: string;
}

export interface Transaction {
  id: string;
  date: string;
  rawDate?: string;
  description: string;
  merchant: string;
  category: string;
  amount: number;
  type: 'debit' | 'credit';
  status: 'Completed' | 'Pending' | 'Flagged';
  reference: string;
  iconType?: 'amazon' | 'salary' | 'swiggy' | 'electricity' | 'netflix' | 'shopping' | 'transfer' | 'food' | 'bills' | 'card' | 'deposit';
  /** Account the money moved through (defaults to the primary savings account). */
  accountId?: string;
  /** Payment rail / channel shown on receipts (IMPS, UPI, NEFT, BBPS, Savings debit…). */
  channel?: string;
}

export interface BankNotification {
  id: string;
  title: string;
  body: string;
  kind: 'payment' | 'credit' | 'security' | 'reminder' | 'offer' | 'service';
  at: number;
  read: boolean;
  /** Tab to open when the notification is tapped. */
  tab?: NavTab;
}

export interface Beneficiary {
  id: string;
  name: string;
  nickname?: string;
  avatar: string;
  bank: string;
  accountNumber?: string;
  ifsc?: string;
  vpa?: string;
  status: 'Active' | 'Cooling';
  addedAt: number;
  /** Cooling period ends (24h after adding in a real bank; seconds here for the demo). */
  activatesAt?: number;
  lastPaidAt?: number;
  transferCount: number;
}

export type ServiceRequestStatus = 'Received' | 'In progress' | 'Completed';

export interface ServiceRequest {
  id: string;
  type: string;
  details: string;
  status: ServiceRequestStatus;
  createdAt: number;
  eta: string;
  steps: { label: string; at: number | null }[];
}

export interface CardPaymentRecord {
  utr: string;
  amount: number;
  method: string;
  at: number;
}

export interface QuickPayee {
  id: string;
  name: string;
  vpa?: string;
  accountNumber?: string;
  avatar: string;
  bank?: string;
  bankName?: string;
}

export interface BankOffer {
  id: string;
  title: string;
  category: string;
  tag: string;
  discount: string;
  expiry: string;
  description: string;
  color: string;
  code?: string;
}

export interface SpendingCategory {
  id: string;
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

export interface CreditScoreData {
  score: number;
  maxScore: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  updatedDate: string;
  factors: {
    paymentHistory: number; // 100%
    creditUtilization: number; // 14%
    creditAge: string; // 4.2 years
    totalAccounts: number; // 6
    hardInquiries: number; // 1
  };
}

export interface BankCard {
  id: string;
  type: 'Credit' | 'Debit';
  cardName: string;
  cardNumber: string;
  maskedNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  network: 'Visa' | 'Mastercard' | 'RuPay';
  tier: 'Signature' | 'Platinum' | 'Infinite';
  status: 'Active' | 'Frozen';
  creditLimit?: number;
  availableCredit?: number;
  domesticLimit: number;
  internationalEnabled: boolean;
  contactlessEnabled: boolean;
  rewardPoints: number;
  gradient: string;
}

export interface ComplaintSubmission {
  productType: string;
  complaintDetails: string;
  urgency?: 'Standard' | 'Urgent' | 'Critical';
}

export interface ComplaintTicket {
  traceId: string;
  ticketId?: string;
  workflowStatus?: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'UNKNOWN';
  metrics?: {
    total_llm_time?: number;
    total_tokens?: number;
    total_cost?: number;
    completion_tokens?: number;
    prompt_tokens?: number;
  };
  beautifiedOutput?: string;
  email: string;
  productType: string;
  details: string;
  status: 'Received' | 'Under Review' | 'Resolved';
  timestamp: string;
  estimatedResolution: string;
  isLiveApi: boolean;
  apiNotice?: string;
}

export interface ApiSubmissionResult {
  success: boolean;
  trace_id: string;
  ticketId?: string;
  status?: string;
  isDone?: boolean;
  metrics?: any;
  beautifiedOutput?: string;
  timestamp?: string;
  liveApi?: boolean;
  apiNotice?: string;
  gatewayResponse?: any;
  error?: string;
}

export interface CoreCreditCard {
  cardId: string;
  cardNumber: string;
  maskedNumber: string;
  cardName: string;
  cardHolder: string;
  creditLimit: number;
  availableCredit: number;
  outstandingBalance: number;
  minimumDue: number;
  dueDate: string;
  billingCycle: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastUtr?: string;
  lastPaymentMethod?: string;
}

export interface PaymentSession {
  txnId: string;
  cardId: string;
  cardMasked: string;
  cardName: string;
  cardHolder: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  createdAt: number;
  expiresAt: number;
  paidAt?: number;
  utr?: string;
  paymentMethod?: string;
  gatewayUrl: string;
  qrDataUrl?: string;
  qrSvg?: string;
}

