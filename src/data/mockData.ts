import {
  BankAccount,
  Transaction,
  SpendingCategory,
  CreditScoreData,
  BankCard,
} from '../types';

export const COMPLAINT_PRODUCT_TYPES = [
  'Cheque Book',
  'Account Statement',
  'Debit Card / ATM',
  'UPI / Fund Transfer',
  'Savings Account Services',
  'Interest Certificate',
  'Digital Banking / NetBanking',
  'Loans & Credit Cards',
] as const;

export const INITIAL_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-1',
    name: 'Savings Account',
    type: 'Savings',
    accountNumber: 'AC1000231234',
    maskedNumber: 'XXXX 1234',
    routingNumber: 'NXRA0001089',
    balance: 124560.50,
    currency: 'INR',
    status: 'Active',
    color: 'blue',
    interestRate: '4.00% p.a.',
  },
  {
    id: 'acc-2',
    name: 'Current Account',
    type: 'Current',
    accountNumber: 'AC1000235678',
    maskedNumber: 'XXXX 5678',
    routingNumber: 'NXRA0001089',
    balance: 875000.00,
    currency: 'INR',
    status: 'Active',
    color: 'green',
    interestRate: 'N/A',
  },
  {
    id: 'acc-3',
    name: 'Fixed Deposit',
    type: 'Fixed Deposit',
    accountNumber: 'FD8829109101',
    maskedNumber: 'XXXX 9101',
    routingNumber: 'NXRA0001089',
    balance: 500000.00,
    currency: 'INR',
    status: 'Active',
    color: 'amber',
    maturityDate: dateMonthsAhead(6),
    interestRate: '6.75% p.a.',
  },
];

/** "16 Sep 2026" style date `daysAgo` days before today, so the seeded history always looks current. */
export function dateDaysAgo(daysAgo: number): { date: string; rawDate: string } {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    rawDate: d.toISOString().slice(0, 10),
  };
}

/** Date `monthsAhead` months from today, e.g. an FD maturity. */
export function dateMonthsAhead(monthsAhead: number, day = 12): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type SeedTxn = Omit<Transaction, 'date' | 'rawDate'> & { daysAgo: number };

const SEED_TRANSACTIONS: SeedTxn[] = [
  { id: 'TXN-90214', daysAgo: 1, description: 'Amazon India Pvt Ltd - Prime Purchase', merchant: 'Amazon India Pvt Ltd', category: 'Shopping', amount: 2450, type: 'debit', status: 'Completed', reference: 'AMZN-928104812', iconType: 'amazon' },
  { id: 'TXN-90213', daysAgo: 2, description: 'Salary Credit from ABC Corp - Monthly Salary', merchant: 'Salary Credit from ABC Corp', category: 'Salary', amount: 75000, type: 'credit', status: 'Completed', reference: 'NEFT-SAL7849102', iconType: 'salary' },
  { id: 'TXN-90212', daysAgo: 2, description: 'Swiggy Online Food Delivery Order', merchant: 'Swiggy', category: 'Food & Dining', amount: 650, type: 'debit', status: 'Completed', reference: 'UPI-SWIGGY882190', iconType: 'swiggy' },
  { id: 'TXN-90211', daysAgo: 3, description: 'Electricity Bill Payment - Tata Power Mumbai', merchant: 'Electricity Bill Payment', category: 'Bills & Utilities', amount: 1250, type: 'debit', status: 'Completed', reference: 'BBPS-ELEC491823', iconType: 'electricity' },
  { id: 'TXN-90210', daysAgo: 5, description: 'Netflix India - Monthly Subscription Ultra HD', merchant: 'Netflix India', category: 'Entertainment', amount: 649, type: 'debit', status: 'Completed', reference: 'CARD-NETFLIX-9018', iconType: 'netflix' },
  { id: 'TXN-90209', daysAgo: 7, description: 'Uber India Trip - Bandra to Airport T2', merchant: 'Uber India Systems', category: 'Transport', amount: 540, type: 'debit', status: 'Completed', reference: 'UPI-UBER99182', iconType: 'transfer' },
  { id: 'TXN-90208', daysAgo: 9, description: 'Quarterly FD Interest Credit (FD XXXX 9101)', merchant: 'Nexora Bank Treasury', category: 'Investments', amount: 8437.5, type: 'credit', status: 'Completed', reference: 'INT-NXRA-88910', iconType: 'salary' },
  { id: 'TXN-90207', daysAgo: 11, description: 'Zomato - Dinner order', merchant: 'Zomato', category: 'Food & Dining', amount: 1180, type: 'debit', status: 'Completed', reference: 'UPI-ZOMATO118204', iconType: 'food' },
  { id: 'TXN-90206', daysAgo: 12, description: 'Rent - ABC Landlord (UPI)', merchant: 'ABC Landlord', category: 'Transfers', amount: 32000, type: 'debit', status: 'Completed', reference: 'UPI/INB/442190', iconType: 'transfer' },
  { id: 'TXN-90205', daysAgo: 14, description: 'Myntra - Apparel', merchant: 'Myntra Designs', category: 'Shopping', amount: 3199, type: 'debit', status: 'Completed', reference: 'CARD-MYNTRA-77102', iconType: 'shopping' },
  { id: 'TXN-90204', daysAgo: 16, description: 'Airtel Xstream broadband', merchant: 'Airtel', category: 'Bills & Utilities', amount: 1199, type: 'debit', status: 'Completed', reference: 'BBPS-AIRTEL20981', iconType: 'bills' },
  { id: 'TXN-90203', daysAgo: 19, description: 'Personal loan EMI - PL882910', merchant: 'India Bank Loans', category: 'Loan EMI', amount: 18450, type: 'debit', status: 'Completed', reference: 'ECS-PL882910-09', iconType: 'bills' },
  { id: 'TXN-90202', daysAgo: 22, description: 'Blinkit - Groceries', merchant: 'Blinkit', category: 'Groceries', amount: 2140, type: 'debit', status: 'Completed', reference: 'UPI-BLINKIT4410', iconType: 'shopping' },
  { id: 'TXN-90201', daysAgo: 25, description: 'Priya Sharma - Dinner split', merchant: 'Priya Sharma', category: 'Transfers', amount: 1200, type: 'credit', status: 'Completed', reference: 'UPI/HDFC/119920', iconType: 'transfer' },
  { id: 'TXN-90200', daysAgo: 28, description: 'Indian Oil - Fuel', merchant: 'Indian Oil Corporation', category: 'Transport', amount: 2660, type: 'debit', status: 'Completed', reference: 'CARD-IOCL-56710', iconType: 'transfer' },
  { id: 'TXN-90199', daysAgo: 32, description: 'Salary Credit from ABC Corp - Monthly Salary', merchant: 'Salary Credit from ABC Corp', category: 'Salary', amount: 75000, type: 'credit', status: 'Completed', reference: 'NEFT-SAL7712048', iconType: 'salary' },
  { id: 'TXN-90198', daysAgo: 34, description: 'Apollo Pharmacy', merchant: 'Apollo Pharmacy', category: 'Health', amount: 860, type: 'debit', status: 'Completed', reference: 'UPI-APOLLO88120', iconType: 'shopping' },
  { id: 'TXN-90197', daysAgo: 41, description: 'Rent - ABC Landlord (UPI)', merchant: 'ABC Landlord', category: 'Transfers', amount: 32000, type: 'debit', status: 'Completed', reference: 'UPI/INB/401877', iconType: 'transfer' },
];

/** Seeded statement history with dates relative to today (newest first). */
export function seedTransactions(): Transaction[] {
  return SEED_TRANSACTIONS.map(({ daysAgo, ...t }) => ({ ...t, ...dateDaysAgo(daysAgo) }));
}

export const INITIAL_TRANSACTIONS: Transaction[] = seedTransactions();

export const SPENDING_INSIGHTS: SpendingCategory[] = [
  {
    id: 'cat-shopping',
    name: 'Shopping',
    amount: 8650,
    color: '#6366F1', // Indigo/Purple
    percentage: 35.1,
  },
  {
    id: 'cat-bills',
    name: 'Bills & Utilities',
    amount: 5400,
    color: '#3B82F6', // Blue
    percentage: 21.9,
  },
  {
    id: 'cat-food',
    name: 'Food & Dining',
    amount: 4250,
    color: '#F59E0B', // Amber
    percentage: 17.2,
  },
  {
    id: 'cat-transport',
    name: 'Transport',
    amount: 3200,
    color: '#06B6D4', // Cyan
    percentage: 13.0,
  },
  {
    id: 'cat-others',
    name: 'Others',
    amount: 3150,
    color: '#10B981', // Emerald
    percentage: 12.8,
  },
];

export const CREDIT_SCORE_DATA: CreditScoreData = {
  score: 782,
  maxScore: 900,
  rating: 'Excellent',
  updatedDate: '15 May 2026',
  factors: {
    paymentHistory: 100,
    creditUtilization: 14,
    creditAge: '4.2 yrs',
    totalAccounts: 6,
    hardInquiries: 1,
  },
};

export const CREDIT_SCORE = CREDIT_SCORE_DATA;

export const MOCK_CARDS: BankCard[] = [
  {
    id: 'card-1',
    type: 'Credit',
    cardName: 'Nexora Royale Infinite',
    cardNumber: '4532 •••• •••• 8842',
    maskedNumber: '•••• 8842',
    cardHolder: 'SHIVANSH MISHRA',
    expiry: '09/30',
    cvv: '624',
    network: 'Visa',
    tier: 'Infinite',
    status: 'Active',
    creditLimit: 500000,
    availableCredit: 412500,
    domesticLimit: 250000,
    internationalEnabled: true,
    contactlessEnabled: true,
    rewardPoints: 14250,
    gradient: 'from-[#1E1156] via-[#2A1B70] to-[#432A9C]',
  },
  {
    id: 'card-2',
    type: 'Debit',
    cardName: 'Nexora Platinum Debit',
    cardNumber: '5241 •••• •••• 1234',
    maskedNumber: '•••• 1234',
    cardHolder: 'SHIVANSH MISHRA',
    expiry: '11/29',
    cvv: '819',
    network: 'Mastercard',
    tier: 'Platinum',
    status: 'Active',
    domesticLimit: 100000,
    internationalEnabled: false,
    contactlessEnabled: true,
    rewardPoints: 3420,
    gradient: 'from-[#0F172A] via-[#1E293B] to-[#334155]',
  },
];

export const QUICK_PAYEES = [
  { id: 'p1', name: 'Priya Sharma', vpa: 'priya@okhdfcbank', avatar: 'PS', bank: 'HDFC Bank' },
  { id: 'p2', name: 'Rohan Mehta', vpa: 'rohan.m@icici', avatar: 'RM', bank: 'ICICI Bank' },
  { id: 'p3', name: 'Sneha Verma', vpa: 'snehav@oksbi', avatar: 'SV', bank: 'State Bank of India' },
  { id: 'p4', name: 'ABC Landlord', vpa: 'rent.mumbai@axl', avatar: 'AL', bank: 'Axis Bank' },
  { id: 'p5', name: 'Rahul Verma', vpa: 'rahul99@paytm', avatar: 'RV', bank: 'Paytm Payments Bank' },
];

export const BANK_OFFERS = [
  {
    id: 'off-1',
    title: 'Special FD Rate 6.75% p.a.',
    category: 'Deposit',
    tag: 'High Yield',
    discount: '6.75% Returns',
    expiry: 'Valid till 30 Sep 2026',
    description: 'Book a Fixed Deposit for 18 months and enjoy guaranteed high returns compounded quarterly.',
    color: 'from-violet-600 to-indigo-700',
    code: 'NXRAFD675',
  },
  {
    id: 'off-2',
    title: 'Amazon Prime Shopping Days',
    category: 'Shopping',
    tag: '10% Instant',
    discount: 'Up to ₹2,500 off',
    expiry: 'Valid on weekends',
    description: 'Use your Nexora Infinite Credit Card on Amazon India to get 10% instant discount on electronics & appliances.',
    color: 'from-amber-600 to-orange-700',
    code: 'AMZNEX10',
  },
  {
    id: 'off-3',
    title: 'Swiggy Gourmet Dining',
    category: 'Dining',
    tag: '20% Cashback',
    discount: 'Flat ₹150 off',
    expiry: 'Daily on orders > ₹500',
    description: 'Indulge in premium restaurants on Swiggy and save with your Nexora Debit or Credit card.',
    color: 'from-rose-600 to-pink-700',
    code: 'SWIGNEX',
  },
  {
    id: 'off-4',
    title: 'MakeMyTrip Holidays',
    category: 'Travel',
    tag: 'Domestic Flights',
    discount: 'Flat 12% off',
    expiry: 'Valid till 31 Oct 2026',
    description: 'Zero convenience fees and flat 12% off on domestic flights booking with code NEXFLY.',
    color: 'from-sky-600 to-blue-700',
    code: 'NEXFLY',
  },
];

