export interface ZoraQuestionItem {
  id: string;
  category: string;
  question: string;
  shortLabel: string;
  answer: string;
  actionType?: 'apply_debit' | 'apply_credit' | 'open_fd' | 'grievance' | 'cards' | 'transfer' | 'statement' | 'call' | 'pay_cc';
  actionLabel?: string;
  badge?: string;
}

export interface ZoraCategory {
  id: string;
  name: string;
  icon: string;
  questions: ZoraQuestionItem[];
}

export const ZORA_CATEGORIES: ZoraCategory[] = [
  {
    id: 'debit-cards',
    name: 'Debit Cards',
    icon: 'credit-card',
    questions: [
      {
        id: 'dc-1',
        category: 'Debit Cards',
        question: 'How can I apply for a new Debit Card?',
        shortLabel: 'Apply for Debit Card',
        answer: `You can apply for an India Bank Debit Card easily:\n\n1. **Online via NetBanking:** Go to the 'Cards' tab in your dashboard, select your Savings Account, choose your preferred card variant (Classic RuPay, Platinum Visa, or Royale Infinite Mastercard), and confirm your delivery address.\n2. **Instant Virtual Card:** A digital debit card is generated immediately for instant online shopping and UPI activation.\n3. **Doorstep Delivery:** The physical chip-and-PIN card will be delivered to your registered communication address within 3 to 5 business days with secure tracking.`,
        actionType: 'cards',
        actionLabel: 'Go to Cards Section',
        badge: 'Instant Virtual Card',
      },
      {
        id: 'dc-2',
        category: 'Debit Cards',
        question: 'How do I generate or reset my ATM Green PIN?',
        shortLabel: 'Generate ATM Green PIN',
        answer: `You can set or reset your 4-digit ATM PIN in 3 convenient ways:\n\n• **Via NetBanking (Instant):** Go to 'Cards' > Select Card > Click 'Manage PIN' > Enter your new 4-digit PIN and verify via OTP sent to your registered mobile.\n• **At any India Bank ATM:** Insert card > Select 'PIN Generation / Green PIN' > Enter the 6-digit OTP received on mobile > Enter new 4-digit PIN.\n• **Via SMS Banking:** Send **GREENPIN <last 4 digits of card>** to 567676 from your registered mobile number.`,
        actionType: 'cards',
        actionLabel: 'Manage Card PIN',
      },
      {
        id: 'dc-3',
        category: 'Debit Cards',
        question: 'How do I block or freeze my lost or stolen card immediately?',
        shortLabel: 'Block / Freeze Card',
        answer: `To prevent unauthorized transactions on a lost or stolen card:\n\n1. **Instant Freeze:** Open the 'Cards' tab and toggle the **'Freeze Card'** switch to disable all ATM, POS, and online transactions instantly.\n2. **Permanent Hotlisting:** Call our 24x7 Emergency Helpline toll-free at **1800 202 6161** or **1800 425 3800** (press option 1 for Card Blocking).\n3. **SMS Block:** SMS **BLOCK <last 4 digits of card>** to 567676.\n\nA replacement card will be automatically dispatched to your registered address within 48 hours.`,
        actionType: 'cards',
        actionLabel: 'Instant Card Freeze',
        badge: 'High Priority',
      },
      {
        id: 'dc-4',
        category: 'Debit Cards',
        question: 'How do I enable contactless Tap & Pay or International transactions?',
        shortLabel: 'Contactless & International Limits',
        answer: `Under RBI guidelines, you have full control over your card security channels:\n\n• Go to **'Cards'** tab > **'Security & Usage Limits'**.\n• Toggle **'Contactless (Tap & Pay)'** On/Off. The default single transaction limit without PIN is ₹5,000.\n• Toggle **'International Usage'** and set custom per-day transaction limits for ATM, POS, and E-commerce.`,
        actionType: 'cards',
        actionLabel: 'Configure Usage Limits',
      },
      {
        id: 'dc-5',
        category: 'Debit Cards',
        question: 'What are the daily ATM cash withdrawal and POS shopping limits?',
        shortLabel: 'ATM & POS Daily Limits',
        answer: `Daily limits depend on your card variant:\n\n• **Classic RuPay Debit Card:** ATM Cash: ₹40,000/day | POS/Online: ₹1,00,000/day\n• **Platinum Visa Debit Card:** ATM Cash: ₹1,00,000/day | POS/Online: ₹2,00,000/day\n• **Royale Infinite Card:** ATM Cash: ₹2,00,000/day | POS/Online: ₹5,00,000/day\n\nYou can temporarily adjust these limits lower for security via Card Settings.`,
        actionType: 'cards',
        actionLabel: 'View Card Details',
      },
    ],
  },
  {
    id: 'credit-cards',
    name: 'Credit Cards',
    icon: 'credit-card',
    questions: [
      {
        id: 'cc-pay',
        category: 'Credit Cards',
        question: 'How do I pay my Credit Card bill with dynamic QR code?',
        shortLabel: 'Pay Credit Card Bill (Instant QR)',
        answer: `You can pay your credit card bill directly inside this chat in 4 simple steps:\n\n1. Ask me to **'Pay credit card bill'** or tap the payment action below.\n2. I will check your account and fetch your exact real-time outstanding balance from core banking.\n3. I will generate a **single-use dynamic Bharat BillPay QR code** right in this chat bubble encoding your due amount.\n4. Scan the QR with your phone camera or UPI app (or use our built-in simulator), click **'Simulate Payment'**, and your card balance updates in real-time with instant UTR confirmation!`,
        actionType: 'pay_cc',
        actionLabel: 'Pay Credit Card Bill Now',
        badge: 'Instant QR Payment',
      },
      {
        id: 'cc-1',
        category: 'Credit Cards',
        question: 'How can I apply for an India Bank Credit Card?',
        shortLabel: 'Apply for Credit Card',
        answer: `Applying for an India Bank Credit Card is 100% digital:\n\n1. **Pre-Approved Offers:** Existing customers with active savings or salary accounts can check the 'Pre-Approved Offers' section on the dashboard for zero-documentation instant approval.\n2. **New Applications:** Select between our **Royale Infinite Metal** card or **Platinum Cashback** card.\n3. **Quick Video KYC:** Complete your 2-minute Video KYC from home.\n4. **Card Delivery:** Virtual card is activated immediately in NetBanking; physical card delivers in 3-4 business days.`,
        actionType: 'apply_credit',
        actionLabel: 'Check Pre-Approved Cards',
        badge: 'Zero Annual Fee for Salary Acc',
      },
      {
        id: 'cc-2',
        category: 'Credit Cards',
        question: 'What are the eligibility criteria and documents required for a Credit Card?',
        shortLabel: 'Credit Card Eligibility & Docs',
        answer: `Basic requirements for India Bank Credit Cards:\n\n• **Age:** 21 to 65 years (Indian Resident).\n• **Salaried:** Minimum net monthly income of ₹25,000.\n• **Self-Employed:** Latest ITR with annual income ₹4.5 Lakhs+.\n• **Documents:** PAN Card, Aadhaar Card (for digital e-KYC), last 3 months salary slips or bank statements.\n• **Credit Score:** Recommended CIBIL score of 720 or higher.`,
      },
      {
        id: 'cc-3',
        category: 'Credit Cards',
        question: 'What reward points, cashback, and lounge access benefits do I get?',
        shortLabel: 'Rewards & Airport Lounge',
        answer: `Our card benefits include:\n\n• **Royale Infinite:** 4 complimentary domestic airport lounge visits per quarter, 5X reward points on dining and travel, 1% fuel surcharge waiver across India.\n• **Platinum Cashback:** Flat 2% unlimited cashback on all online shopping, 1% on offline spends, plus zero joining fee with annual spend of ₹50,000+.\n• Reward points never expire and can be redeemed for flights, gift vouchers, or statement cash credit.`,
      },
      {
        id: 'cc-4',
        category: 'Credit Cards',
        question: 'How can I increase my Credit Card limit?',
        shortLabel: 'Credit Limit Increase',
        answer: `You can request an enhanced credit limit:\n\n• If you have maintained clean on-time repayments for 6+ months, pre-approved limit increase offers appear automatically in your NetBanking.\n• Alternatively, submit your latest Form 16 or 3-month salary slip under **Cards > Service Requests > Enhance Limit**.\n• Decisions are communicated within 24 business hours.`,
        actionType: 'cards',
        actionLabel: 'View Credit Limit',
      },
      {
        id: 'cc-5',
        category: 'Credit Cards',
        question: 'How do I convert a high-value purchase into EMIs?',
        shortLabel: 'Convert Spends to EMI',
        answer: `Any credit card transaction over ₹2,500 can be converted into flexible EMIs (3, 6, 9, 12, or 24 months):\n\n1. Open your NetBanking or Mobile Banking.\n2. Navigate to **Cards > Unbilled Transactions**.\n3. Click **'Convert to EMI'** next to the transaction.\n4. Select your preferred tenure and interest rate (starting at 1.15% per month).\n5. Confirm with OTP. No physical documentation required!`,
      },
    ],
  },
  {
    id: 'fixed-deposits',
    name: 'Deposits & FDs',
    icon: 'piggy-bank',
    questions: [
      {
        id: 'fd-1',
        category: 'Deposits & FDs',
        question: 'What are the current Fixed Deposit (FD) interest rates?',
        shortLabel: 'FD Interest Rates',
        answer: `Current India Bank Fixed Deposit Interest Rates (compounded quarterly):\n\n• **7 to 45 Days:** 3.50% p.a.\n• **46 to 179 Days:** 4.75% p.a.\n• **180 to 364 Days:** 6.00% p.a.\n• **1 Year to < 2 Years:** 6.75% p.a.\n• **Special 444-Day Bucket:** **7.25% p.a.** (Highest Yield)\n• **Senior Citizens:** Additional **+0.50% p.a.** on all tenures (up to **7.75% p.a.**)\n• **Super Senior Citizens (80+ yrs):** Additional **+0.75% p.a.**`,
        actionType: 'open_fd',
        actionLabel: 'Open Fixed Deposit',
        badge: 'Up to 7.75% p.a.',
      },
      {
        id: 'fd-2',
        category: 'Deposits & FDs',
        question: 'How do I open an instant Fixed Deposit (FD) online?',
        shortLabel: 'Open Instant FD Online',
        answer: `Booking an online Fixed Deposit takes under 60 seconds:\n\n1. From the dashboard, click **'Quick Actions > Open FD'**.\n2. Choose deposit amount (minimum ₹1,000) and tenure (7 days to 10 years).\n3. Choose interest payout preference: Cumulative (on maturity) or Monthly/Quarterly payout.\n4. Nominee is automatically inherited from your Savings account (or select custom nominee).\n5. Confirm with transaction authentication. Your FD Advice PDF is instantly available for download.`,
        actionType: 'open_fd',
        actionLabel: 'Book FD in 60s',
      },
      {
        id: 'fd-3',
        category: 'Deposits & FDs',
        question: 'What is a Tax-Saving 5-Year Fixed Deposit under Section 80C?',
        shortLabel: 'Tax Saving 80C FD',
        answer: `Key features of the India Bank Tax-Saving FD:\n\n• **Tax Benefit:** Deductions up to **₹1,50,000 per financial year** under Section 80C of the Income Tax Act.\n• **Lock-in Period:** Mandatory 5-year lock-in period.\n• **Rate of Interest:** 6.50% p.a. (7.00% p.a. for Senior Citizens).\n• **Premature withdrawal:** Not permitted before 5 years as per Government tax guidelines.`,
        actionType: 'open_fd',
        actionLabel: 'Explore Tax-Saving FD',
      },
      {
        id: 'fd-4',
        category: 'Deposits & FDs',
        question: 'Can I withdraw my Fixed Deposit prematurely and what is the penalty?',
        shortLabel: 'Premature FD Withdrawal',
        answer: `Yes, you can close your regular FD prematurely anytime online without visiting a branch:\n\n• Funds are credited instantly back to your linked savings account.\n• Interest will be paid for the period the deposit actually ran at the prevailing rate, minus a nominal 0.50% penalty.\n• No penalty applies if the proceeds are reinvested into a longer tenure deposit.`,
      },
      {
        id: 'fd-5',
        category: 'Deposits & FDs',
        question: 'How does a Recurring Deposit (RD) work?',
        shortLabel: 'Recurring Deposit (RD)',
        answer: `Recurring Deposits help you build savings month by month:\n\n• **Minimum Monthly Installment:** ₹500/month.\n• **Tenure:** 6 months to 10 years in multiples of 3 months.\n• **Interest Rates:** Same attractive rates as Fixed Deposits.\n• **Auto-Debit:** The installment is automatically debited on your chosen day of the month from your savings account.`,
      },
    ],
  },
  {
    id: 'transfers',
    name: 'Transfers & UPI',
    icon: 'send',
    questions: [
      {
        id: 'tr-1',
        category: 'Transfers & UPI',
        question: 'What are the transfer limits and timings for IMPS, NEFT, RTGS, and UPI?',
        shortLabel: 'Transfer Limits & Timings',
        answer: `Fund Transfer Matrix for India Bank:\n\n• **UPI:** Limit up to ₹1,00,000 per transaction | 24x7 instant credit | Zero charges\n• **IMPS:** Up to ₹5,00,000 per transaction | 24x7 instant credit | Real-time\n• **NEFT:** No minimum or maximum limit | 24x7 settled in half-hourly batches | Zero charges on NetBanking\n• **RTGS:** Minimum ₹2,00,000 | 24x7 gross real-time settlement | Zero charges online`,
        actionType: 'transfer',
        actionLabel: 'Transfer Funds Now',
      },
      {
        id: 'tr-2',
        category: 'Transfers & UPI',
        question: 'How do I add and activate a new beneficiary for fund transfer?',
        shortLabel: 'Add New Beneficiary',
        answer: `To add a new beneficiary:\n\n1. Go to **Transfers > Manage Beneficiaries > Add Beneficiary**.\n2. Enter Beneficiary Name, Account Number, and IFSC Code (or UPI VPA ID).\n3. Authenticate with OTP received on your registered mobile.\n4. **Cooling Period:** For security, new beneficiaries have a 30-minute cooling period, after which you can transfer up to ₹50,000 during the first 24 hours.`,
        actionType: 'transfer',
        actionLabel: 'Manage Beneficiaries',
      },
      {
        id: 'tr-3',
        category: 'Transfers & UPI',
        question: 'What should I do if money was debited but not credited to the receiver?',
        shortLabel: 'Failed Transfer / Auto-Refund',
        answer: `In case of technical timeout or delayed inter-bank settlements:\n\n• **Auto-Reversal:** Under RBI harmonization rules, failed IMPS/UPI transactions auto-reverse to your account within **T+1 business day**.\n• If not refunded within 24 hours, the bank automatically credits compensation of ₹100 per day of delay.\n• You can also lodge a quick grievance with your transaction UTR number in our Grievance Portal for immediate desk reconciliation.`,
        actionType: 'grievance',
        actionLabel: 'Lodge Transfer Grievance',
        badge: 'RBI SLA Protected',
      },
    ],
  },
  {
    id: 'loans',
    name: 'Loans & Mortgages',
    icon: 'home',
    questions: [
      {
        id: 'ln-1',
        category: 'Loans & Mortgages',
        question: 'How can I apply for an India Bank Home Loan?',
        shortLabel: 'Home Loan Application',
        answer: `India Bank offers competitive Home Loans:\n\n• **Interest Rates:** Starting from **8.40% p.a.** (linked to RBI Repo Rate).\n• **Tenure:** Up to 30 years with affordable EMIs.\n• **Loan Amount:** Up to 90% of property cost.\n• **Processing:** In-principle digital sanction letter generated within 15 minutes for pre-approved customers.\n• **Zero Prepayment Penalty:** Pay off your floating rate loan anytime without extra charges!`,
      },
      {
        id: 'ln-2',
        category: 'Loans & Mortgages',
        question: 'How much Personal Loan can I get and what are the interest rates?',
        shortLabel: 'Personal Loan Rates & Eligibility',
        answer: `India Bank Instant Personal Loans:\n\n• **Loan Quantum:** From ₹50,000 up to **₹20,00,000**.\n• **Interest Rates:** 10.25% to 13.50% p.a. based on credit profile.\n• **Tenure:** 12 to 60 months.\n• **Disbursal:** Instant credit to your India Bank savings account upon digital agreement acceptance.`,
        badge: 'Instant Disbursal',
      },
      {
        id: 'ln-3',
        category: 'Loans & Mortgages',
        question: 'What documents are required for loan approval?',
        shortLabel: 'Loan Documentation Checklist',
        answer: `Document Checklist for Loans:\n\n1. **Identity & Address Proof:** Aadhaar Card & PAN Card.\n2. **Income Proof (Salaried):** Last 3 months salary slips and Form 16 / ITR.\n3. **Income Proof (Self-Employed):** Last 2 years audited balance sheets and ITR.\n4. **Bank Statements:** Last 6 months bank statement (auto-fetched if you bank with India Bank!).`,
      },
    ],
  },
  {
    id: 'cheque-services',
    name: 'Cheque & Statements',
    icon: 'file-text',
    questions: [
      {
        id: 'cq-1',
        category: 'Cheque & Statements',
        question: 'How can I request a new Cheque Book?',
        shortLabel: 'Request Cheque Book',
        answer: `I can order a personalised cheque book for you right here — just tell me three things:\n\n1. How many leaves: 25, 50 or 100.\n2. Which account: Savings (•••• 1234) or Current (•••• 5678).\n3. Delivery: your registered address (14B Marine Drive, Mumbai) or pickup at the Nariman Point branch.\n\nIt's free, printed with CTS-2010 security features, and ready in 4 working days. You'll get a reference number to track it under Services, and dispatch details by SMS.`,
        actionType: 'grievance',
        actionLabel: 'Cheque Book Services',
      },
      {
        id: 'cq-2',
        category: 'Cheque & Statements',
        question: 'How do I stop payment on an issued cheque?',
        shortLabel: 'Stop Cheque Payment',
        answer: `If a cheque was lost or issued incorrectly:\n\n• Navigate to **Services > Cheque Services > Stop Cheque Payment**.\n• Enter the 6-digit cheque number (or range of numbers) and reason.\n• Authenticate via OTP. The stop instruction takes effect immediately across all clearing houses and branches nationwide.`,
      },
      {
        id: 'cq-3',
        category: 'Cheque & Statements',
        question: 'How do I download my account statement or interest certificate?',
        shortLabel: 'Download Statement & TDS Certificate',
        answer: `To download official bank statements:\n\n• Go to **Accounts > Statement**.\n• Choose format (PDF or Excel) and custom date range (last 1 month, 3 months, 1 year, or financial year).\n• The downloaded PDF is password protected (your uppercase PAN + DDMM of birth).\n• **Interest Certificate / Form 16A:** Available under **Tax Center** for effortless income tax filing.`,
        actionType: 'statement',
        actionLabel: 'Download Statement',
      },
      {
        id: 'cq-4',
        category: 'Cheque & Statements',
        question: 'What is the minimum average balance requirement for savings accounts?',
        shortLabel: 'Minimum Balance Requirements',
        answer: `India Bank minimum quarterly balance guidelines:\n\n• **Metro & Urban Branches:** ₹5,000 to ₹10,000 average balance.\n• **Semi-Urban & Rural Branches:** ₹1,000 to ₹2,500.\n• **Corporate Salary Accounts & Pradhan Mantri Jan Dhan Accounts:** Zero-Balance Account (No minimum balance charges apply ever).`,
      },
    ],
  },
  {
    id: 'support-grievance',
    name: 'Grievance & Fraud',
    icon: 'shield',
    questions: [
      {
        id: 'gr-1',
        category: 'Grievance & Fraud',
        question: 'How do I lodge an official customer complaint or grievance?',
        shortLabel: 'Lodge Official Complaint',
        answer: `You can lodge an official grievance directly in our portal:\n\n1. Click **'Customer Support & Grievance Portal'** in the top navigation.\n2. Select product category (e.g. Cheque Book, Debit Card, NetBanking, Fund Transfer).\n3. Enter details of your issue.\n4. Click **'Submit Grievance'**.\n\nYour complaint is registered with India Bank's central redressal desk. You will receive an acknowledgment with your ticket reference, and our officers will contact you with resolution within 24 business hours.`,
        actionType: 'grievance',
        actionLabel: 'Open Grievance Portal',
        badge: '< 24h Turnaround',
      },
      {
        id: 'gr-2',
        category: 'Grievance & Fraud',
        question: 'How do I report an unauthorized transaction or fraud immediately?',
        shortLabel: 'Report Fraud / Unauthorized Txn',
        answer: `🚨 **Immediate Action for Fraud Protection:**\n\n1. Freeze your debit/credit card immediately from the **Cards** tab.\n2. Call our 24x7 Dedicated Fraud Reporting Cell toll-free at **1800 202 6161** (available round the clock).\n3. Under RBI's Zero Liability Framework, unauthorized electronic banking transactions reported within 3 days carry ZERO customer liability.\n4. Keep your SMS alert timestamp and transaction reference handy.`,
        actionType: 'cards',
        actionLabel: 'Emergency Card Freeze',
        badge: 'Zero Liability Protected',
      },
      {
        id: 'gr-3',
        category: 'Grievance & Fraud',
        question: 'What is the escalation matrix if my grievance is not resolved?',
        shortLabel: 'Escalation Matrix & Ombudsman',
        answer: `India Bank 3-Level Escalation Structure:\n\n• **Level 1:** Branch Manager / Digital Grievance Portal (SLA: 24 to 48 hours).\n• **Level 2:** Principal Nodal Officer (Email: nodal.officer@indiabank.co.in | Tel: 022-2654-8900).\n• **Level 3:** Reserve Bank of India (RBI) Integrated Banking Ombudsman Scheme (if unresolved within 30 days at cms.rbi.org.in).`,
        actionType: 'grievance',
        actionLabel: 'View Escalation Matrix',
      },
    ],
  },
];

// Helper to find answer based on user query
export function searchZoraKnowledge(query: string): {
  answer: string;
  matchedQuestion?: ZoraQuestionItem;
  suggestedQuestions?: ZoraQuestionItem[];
} {
  const clean = query.toLowerCase().trim();

  // Check for "what questions can i ask" / "help" / "list of questions" / "menu"
  if (
    clean.includes('what question') ||
    clean.includes('what can i ask') ||
    clean.includes('list of question') ||
    clean.includes('questions list') ||
    clean.includes('show questions') ||
    clean.includes('help menu') ||
    clean === 'help' ||
    clean === 'questions' ||
    clean === 'guide'
  ) {
    return {
      answer: `Here are the key topics and product questions you can ask me anytime:\n\n💳 **Debit & Credit Cards:**\n• "How can I apply for a debit card?"\n• "How do I apply for a credit card?"\n• "How do I block or freeze my lost card?"\n• "How do I generate my ATM Green PIN?"\n\n💰 **Fixed Deposits & Savings:**\n• "What are the latest FD interest rates?"\n• "What extra interest do senior citizens get?"\n• "How do I open an instant FD online?"\n\n💸 **Transfers & UPI:**\n• "What are the transfer limits for IMPS, NEFT, and RTGS?"\n• "How do I add a new beneficiary?"\n\n🏠 **Loans:**\n• "How can I apply for an India Bank Home Loan?"\n• "What is the interest rate for Personal Loans?"\n\n📑 **Cheque Books & Account:**\n• "How do I request a new cheque book?"\n• "How do I download my bank statement?"\n\n🛡️ **Support & Fraud:**\n• "How do I lodge a complaint or report fraud?"\n\nClick any topic below or explore our full Questions Directory!`,
    };
  }

  // Exact or keyword match search across all questions
  let bestMatch: ZoraQuestionItem | null = null;
  let highestScore = 0;

  for (const cat of ZORA_CATEGORIES) {
    for (const q of cat.questions) {
      const qText = q.question.toLowerCase();
      const qLabel = q.shortLabel.toLowerCase();

      // Direct inclusion
      if (clean === qText || clean === qLabel) {
        return { answer: q.answer, matchedQuestion: q };
      }

      let score = 0;
      const keywords = qText.split(/\s+/).filter((w) => w.length > 3);
      for (const kw of keywords) {
        if (clean.includes(kw)) {
          score += 2;
        }
      }

      // Specific thematic boosts
      if ((clean.includes('pay') || clean.includes('bill') || clean.includes('due') || clean.includes('clear')) && (clean.includes('credit') || clean.includes('card')) && q.id === 'cc-pay') score += 20;
      if (clean.includes('debit') && clean.includes('apply') && q.id === 'dc-1') score += 10;
      if (clean.includes('credit') && clean.includes('apply') && q.id === 'cc-1') score += 10;
      if (clean.includes('pin') && q.id === 'dc-2') score += 10;
      if ((clean.includes('block') || clean.includes('lost') || clean.includes('freeze')) && q.id === 'dc-3') score += 10;
      if ((clean.includes('rate') || clean.includes('fd rate') || clean.includes('interest rate')) && q.id === 'fd-1') score += 10;
      if (clean.includes('cheque') && clean.includes('book') && q.id === 'cq-1') score += 10;
      if (clean.includes('home loan') && q.id === 'ln-1') score += 10;
      if (clean.includes('personal loan') && q.id === 'ln-2') score += 10;
      if (clean.includes('statement') && q.id === 'cq-3') score += 10;
      if ((clean.includes('complaint') || clean.includes('grievance')) && q.id === 'gr-1') score += 10;
      if (clean.includes('fraud') && q.id === 'gr-2') score += 10;
      if (clean.includes('limit') && clean.includes('transfer') && q.id === 'tr-1') score += 10;
      if (clean.includes('beneficiary') && q.id === 'tr-2') score += 10;
      if (clean.includes('lounge') && q.id === 'cc-3') score += 10;
      if (clean.includes('tax') && clean.includes('fd') && q.id === 'fd-3') score += 10;

      if (score > highestScore) {
        highestScore = score;
        bestMatch = q;
      }
    }
  }

  if (bestMatch && highestScore >= 4) {
    return {
      answer: bestMatch.answer,
      matchedQuestion: bestMatch,
    };
  }

  // Fallback with helpful suggestions
  return {
    answer: `I understand you are inquiring about "${query}". As Zora, your India Bank 24x7 assistant, I can provide immediate assistance with Debit & Credit Cards, Fixed Deposits, Loans, Cheque Books, Fund Transfers, or lodging customer grievances.\n\nTake a look at the suggested questions below or open the **'Questions Guide'** to browse everything you can ask!`,
  };
}
