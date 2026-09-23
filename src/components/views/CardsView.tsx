import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Shield,
  Wifi,
  Globe,
  Plus,
  ArrowUpRight,
  Gift,
  CheckCircle2,
  Zap,
  RotateCcw,
  Sparkles,
  Building2,
  QrCode,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  X,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { BankCard, CoreCreditCard, PaymentSession, UserSession } from '../../types';
import { MOCK_CARDS } from '../../data/mockData';
import { MobilePhoneSimulatorModal } from '../chat/MobilePhoneSimulatorModal';
import { Page, PageHeader } from '../ui/Primitives';
import { zoraEvents } from '../NexoraAiAssistant';

interface CardsViewProps {
  onOpenAssistantForPayment?: () => void;
  user?: UserSession | null;
}

export const CardsView: React.FC<CardsViewProps> = ({ onOpenAssistantForPayment, user }) => {
  const [cards, setCards] = useState<BankCard[]>(MOCK_CARDS);
  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0].id);
  const [showCvv, setShowCvv] = useState(false);
  const [domesticLimit, setDomesticLimit] = useState(250000);
  const [coreCard, setCoreCard] = useState<CoreCreditCard | null>(null);

  const effectiveCardHolder = user?.name ? user.name.toUpperCase() : 'SHIVANSH MISHRA';

  // Direct Card Bill Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<'savings' | 'debit' | 'qr'>('savings');
  
  // Amount Options: Total Due, Minimum Due, Custom
  const [amountType, setAmountType] = useState<'total' | 'min' | 'custom'>('total');
  const [payAmount, setPayAmount] = useState<string>('87500');

  // Savings 2-Step OTP State
  const [savingsCvv, setSavingsCvv] = useState<string>('624');
  const [savingsOtp, setSavingsOtp] = useState<string>('');
  const [isSavingsOtpRequested, setIsSavingsOtpRequested] = useState<boolean>(false);
  const [isRequestingSavingsOtp, setIsRequestingSavingsOtp] = useState<boolean>(false);

  // Debit Card 2-Step OTP State
  const [debitCardNumber, setDebitCardNumber] = useState<string>('5241 8910 2341 5521');
  const [debitExpiry, setDebitExpiry] = useState<string>('08/29');
  const [debitCvv, setDebitCvv] = useState<string>('842');
  const [debitOtp, setDebitOtp] = useState<string>('');
  const [isDebitOtpRequested, setIsDebitOtpRequested] = useState<boolean>(false);
  const [isRequestingDebitOtp, setIsRequestingDebitOtp] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    amount: number;
    utr: string;
    method: string;
  } | null>(null);

  // Dynamic QR Code State
  const [qrSession, setQrSession] = useState<PaymentSession | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [simulatorTxnId, setSimulatorTxnId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(120);
  const [isQrExpired, setIsQrExpired] = useState<boolean>(false);

  // Sync with Core Banking Credit Card API
  useEffect(() => {
    let isMounted = true;
    async function fetchCard() {
      try {
        const res = await fetch('/api/banking/credit-card');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.card) {
            setCoreCard(data.card);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchCard();
    const interval = setInterval(fetchCard, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update default payAmount whenever card outstanding changes
  useEffect(() => {
    if (coreCard?.outstandingBalance !== undefined && coreCard.outstandingBalance > 0) {
      setPayAmount(String(coreCard.outstandingBalance));
    }
  }, [coreCard?.outstandingBalance]);

  // Real-time SSE listener for QR payment completion
  useEffect(() => {
    if (!qrSession || !isPayModalOpen) return;
    let sse: EventSource | null = null;
    try {
      sse = new EventSource(`/api/payment/stream/${qrSession.txnId}`);
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'payment_complete') {
            if (data.card) setCoreCard(data.card);
            setPaymentSuccessData({
              amount: data.session?.amount || Number(payAmount),
              utr: data.session?.utr || 'UTR-INB-98410291',
              method: 'Dynamic QR (UPI Instant)',
            });
            if (sse) sse.close();
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // fallback
    }
    return () => {
      if (sse) sse.close();
    };
  }, [qrSession, isPayModalOpen, payAmount]);

  const currentCard = cards.find((c) => c.id === selectedCardId) || cards[0];

  const handleResetCard = async () => {
    try {
      const res = await fetch('/api/banking/reset-card', { method: 'POST' });
      const data = await res.json();
      if (data.card) {
        setCoreCard(data.card);
        setPayAmount(String(data.card.outstandingBalance));
        setPaymentSuccessData(null);
        setQrSession(null);
      }
    } catch {
      // ignore
    }
  };

  // Direct Savings Account OTP & Debit Handlers
  const handleRequestSavingsOtp = () => {
    if (!savingsCvv || savingsCvv.length < 3) return;
    setIsRequestingSavingsOtp(true);
    setTimeout(() => {
      setIsRequestingSavingsOtp(false);
      setIsSavingsOtpRequested(true);
      setSavingsOtp('4920');
    }, 400);
  };

  const handleDirectSavingsPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (!isSavingsOtpRequested) {
      handleRequestSavingsOtp();
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/payment/direct-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          method: 'India Bank Primary Savings (AC1000231234)',
          cvv: savingsCvv,
          otp: savingsOtp || '4920',
        }),
      });
      const data = await res.json();
      if (data.success && data.card) {
        setCoreCard(data.card);
        setPaymentSuccessData({
          amount: data.amount,
          utr: data.utr,
          method: 'India Bank Savings A/C (AC1000231234)',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct Debit Card OTP & Payment Handlers
  const handleRequestDebitOtp = () => {
    const raw = debitCardNumber.replace(/\s+/g, '');
    if (!raw || raw.length < 12 || !debitCvv) return;
    setIsRequestingDebitOtp(true);
    setTimeout(() => {
      setIsRequestingDebitOtp(false);
      setIsDebitOtpRequested(true);
      setDebitOtp('8421');
    }, 400);
  };

  const handleDirectDebitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (!isDebitOtpRequested) {
      handleRequestDebitOtp();
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/payment/direct-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          method: 'Debit Card Instant (IMPS)',
          cvv: debitCvv,
          otp: debitOtp || '8421',
        }),
      });
      const data = await res.json();
      if (data.success && data.card) {
        setCoreCard(data.card);
        setPaymentSuccessData({
          amount: data.amount,
          utr: data.utr,
          method: 'Debit Card Instant (IMPS)',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Redirect to External Debit Card Payment Portal
  const handleRedirectToDebitPortal = async () => {
    const amt = parseFloat(payAmount) || (coreCard?.outstandingBalance || 87500);
    setIsProcessing(true);
    try {
      const res = await fetch('/api/payment/create-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        window.location.href = `/?view=gateway&txnId=${data.session.txnId}&amount=${amt}&method=debit`;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate Dynamic QR Code handler
  const handleGenerateQr = async () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsGeneratingQr(true);
    setIsQrExpired(false);
    try {
      const res = await fetch('/api/payment/create-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setQrSession(data.session);
        setQrTimeLeft(120);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // 2-Minute QR Countdown Timer
  useEffect(() => {
    if (!qrSession || isPayModalOpen === false || paymentSuccessData) return;
    const remaining = Math.max(0, Math.floor((qrSession.expiresAt - Date.now()) / 1000));
    setQrTimeLeft(remaining > 0 ? remaining : 120);

    const timer = setInterval(() => {
      setQrTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsQrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrSession, isPayModalOpen, paymentSuccessData]);

  const toggleFreeze = (id: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'Active' ? 'Frozen' : 'Active' } : c
      )
    );
  };

  const toggleInternational = (id: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, internationalEnabled: !c.internationalEnabled } : c
      )
    );
  };

  return (
    <Page>
      <PageHeader
        title="Cards"
        subtitle="Your credit and debit cards, bill payments, limits and instant security controls."
        actions={
          (coreCard?.outstandingBalance ?? 87500) > 0 ? (
            <button
              onClick={() => {
                onOpenAssistantForPayment?.();
                zoraEvents.prompt('Pay my credit card bill');
              }}
              className="ib-btn-secondary"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" /> Pay with Zora
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Card Display and Selector */}
        <div className="lg:col-span-6 space-y-4">
          {/* Card Visual with Metallic Gradient */}
          <div
            className={`relative h-56 sm:h-60 rounded-xl p-6 text-white shadow-md bg-gradient-to-br ${currentCard.gradient} flex flex-col justify-between overflow-hidden border border-white/10`}
          >
            {/* Top row: Brand & Wifi */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight">India Bank</span>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-white/80">
                  {currentCard.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-white/80 rotate-90" />
                {currentCard.status === 'Frozen' && (
                  <span className="text-[10px] font-bold bg-red-600 px-2 py-0.5 rounded">
                    FROZEN
                  </span>
                )}
              </div>
            </div>

            {/* Middle: EMV Chip & Contactless */}
            <div className="relative z-10 my-auto">
              <div className="w-11 h-8 rounded bg-gradient-to-tr from-amber-300 via-amber-200 to-yellow-400 border border-amber-400/40 mb-3 flex items-center justify-center">
                <div className="w-7 h-5 border border-amber-600/40 rounded-xs grid grid-cols-2" />
              </div>
              <div className="font-mono text-xl sm:text-2xl tracking-widest text-white/95 font-medium drop-shadow-sm">
                {currentCard.cardNumber}
              </div>
            </div>

            {/* Bottom: Cardholder, Expiry, Network */}
            <div className="flex items-end justify-between relative z-10 text-xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/60 block">Card Holder</span>
                <span className="font-semibold tracking-wide">{effectiveCardHolder}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/60 block">Expires</span>
                <span className="font-mono font-semibold">{currentCard.expiry}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold italic tracking-tight text-white">
                  {currentCard.network}
                </span>
              </div>
            </div>
          </div>

          {/* Cards Switcher Tabs */}
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  selectedCardId === card.id
                    ? 'bg-white border-indigo-600 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">{card.cardName}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                    card.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {card.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{card.maskedNumber}</p>
              </button>
            ))}
          </div>

          {/* Credit Card Outstanding & Chat-Assisted Bill Pay Card */}
          {currentCard.type === 'Credit' && (
            <div className="ib-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Credit card bill</span>
                    <span className="text-xs text-slate-500">Due {coreCard?.dueDate || '05 Oct 2026'} · live ledger</span>
                  </div>
                </div>

                <button
                  onClick={handleResetCard}
                  className="text-[10px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer font-medium"
                  title="Reset demo balance to ₹87,500"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset Demo</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 block">Total due</span>
                  <span className={`text-lg font-bold tracking-tight ${
                    (coreCard?.outstandingBalance ?? 87500) === 0 ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    ₹{(coreCard?.outstandingBalance ?? 87500).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 block">Minimum due</span>
                  <span className="text-lg font-bold tracking-tight text-slate-900">
                    ₹{(coreCard?.minimumDue ?? 4500).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 block">Available</span>
                  <span className="text-lg font-bold tracking-tight text-slate-900">
                    ₹{(coreCard?.availableCredit ?? 412500).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {(coreCard?.outstandingBalance ?? 87500) === 0 ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">All dues settled! Core ledger updated with UTR {coreCard?.lastUtr || 'UTR-INB-98410291'}.</span>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-pay-credit-card-direct"
                  onClick={() => {
                    setIsPayModalOpen(true);
                    setPaymentSuccessData(null);
                    setQrSession(null);
                  }}
                  className="ib-btn-primary w-full py-3"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay credit card bill</span>
                </button>
              )}
            </div>
          )}

          {/* Reward Points Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-800">Reward Points</span>
                <p className="text-base font-bold text-indigo-700">
                  {currentCard.rewardPoints.toLocaleString('en-IN')} pts
                </p>
              </div>
            </div>
            <button className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 px-3 py-1.5 rounded-md bg-white border border-slate-200 transition-colors cursor-pointer">
              Redeem (₹{Math.round(currentCard.rewardPoints * 0.25)})
            </button>
          </div>
        </div>

        {/* Right: Security & Limits Settings */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-xs tracking-tight uppercase">Instant Card Controls</h3>

            {/* CVV Reveal */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Security CVV</span>
                <span className="text-[11px] text-slate-500">Never share your CVV with anyone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {showCvv ? currentCard.cvv : '•••'}
                </span>
                <button
                  onClick={() => setShowCvv(!showCvv)}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Lock / Freeze Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded ${currentCard.status === 'Frozen' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {currentCard.status === 'Frozen' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Freeze Card</span>
                  <span className="text-[11px] text-slate-500">Instantly block all outgoing card transactions</span>
                </div>
              </div>
              <button
                onClick={() => toggleFreeze(currentCard.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  currentCard.status === 'Frozen'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {currentCard.status === 'Frozen' ? 'Unfreeze' : 'Freeze Card'}
              </button>
            </div>

            {/* International Transactions */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-blue-100 text-blue-600">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">International Usage</span>
                  <span className="text-[11px] text-slate-500">Allow overseas merchants &amp; forex transactions</span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={currentCard.internationalEnabled}
                aria-label="International usage"
                onClick={() => toggleInternational(currentCard.id)}
                className="ib-switch"
              />
            </div>

            {/* Domestic Limit Slider */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">Daily Domestic Limit</span>
                <span className="font-mono font-bold text-indigo-700">
                  ₹{domesticLimit.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="500000"
                step="10000"
                value={domesticLimit}
                onChange={(e) => setDomesticLimit(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>₹10,000</span>
                <span>₹2,50,000</span>
                <span>₹5,00,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Credit Card Bill Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-800 text-amber-300 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Pay Credit Card Bill</h3>
                  <p className="text-[10px] text-indigo-200">
                    Nexora Royale Infinite (•••• 8842) • Core Banking Settlement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {paymentSuccessData ? (
                /* Payment Success State */
                <div className="text-center py-4 space-y-4 animate-in fade-in duration-200">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Payment Successful
                    </span>
                    <h4 className="text-xl font-black text-slate-900">
                      ₹{paymentSuccessData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Paid!
                    </h4>
                    <p className="text-xs text-slate-500">
                      Your credit card outstanding balance has been credited immediately on the core ledger.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Payment Mode:</span>
                      <span className="font-bold text-slate-800">{paymentSuccessData.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Bank Reference UTR:</span>
                      <span className="font-bold text-indigo-700">{paymentSuccessData.utr}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5">
                      <span className="text-slate-500 font-sans">Remaining Due:</span>
                      <span className="font-bold text-emerald-700">
                        ₹{(coreCard?.outstandingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="w-full py-2.5 px-4 bg-indigo-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Payment Form */
                <>
                  {/* Bill Overview Banner */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Due</span>
                      <span className="text-lg font-black font-mono text-slate-900">
                        ₹{(coreCard?.outstandingBalance ?? 87500).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Due Date</span>
                      <span className="text-xs font-bold text-indigo-900">05 Oct 2026</span>
                    </div>
                  </div>

                  {/* Payment Method Switcher (3 Channels) */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPayMethod('savings')}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        payMethod === 'savings'
                          ? 'bg-white text-indigo-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Savings A/C</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod('debit')}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        payMethod === 'debit'
                          ? 'bg-white text-indigo-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Using Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod('qr')}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        payMethod === 'qr'
                          ? 'bg-white text-indigo-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Code</span>
                    </button>
                  </div>

                  {/* Amount Selection: Total Due, Minimum Due, Custom */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Choose Payment Amount
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAmountType('total');
                          setPayAmount(String(coreCard?.outstandingBalance || 87500));
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          amountType === 'total'
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase text-slate-500">Total Due</div>
                        <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
                          ₹{(coreCard?.outstandingBalance || 87500).toLocaleString('en-IN')}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAmountType('min');
                          setPayAmount(String(coreCard?.minimumDue || 4500));
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          amountType === 'min'
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase text-slate-500">Minimum Due</div>
                        <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
                          ₹{(coreCard?.minimumDue || 4500).toLocaleString('en-IN')}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAmountType('custom')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          amountType === 'custom'
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase text-slate-500">Custom</div>
                        <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
                          Any Amount
                        </div>
                      </button>
                    </div>

                    {amountType === 'custom' && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 animate-in fade-in">
                        <label className="text-[11px] font-bold text-slate-700">Enter Custom Amount (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            placeholder="e.g. 15000"
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TAB 1: SAVINGS ACCOUNT DIRECT PAYMENT */}
                  {payMethod === 'savings' && (
                    <form onSubmit={handleDirectSavingsPayment} className="space-y-3 pt-1">
                      {/* Debit Account Info */}
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold text-xs">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              Primary Savings Account
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              AC1000231234 • Avail: ₹1,24,560.50
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          Linked
                        </span>
                      </div>

                      {/* 2-Step OTP for Savings */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Card CVV</label>
                            <input
                              type="password"
                              maxLength={4}
                              disabled={isSavingsOtpRequested}
                              value={savingsCvv}
                              onChange={(e) => setSavingsCvv(e.target.value.replace(/\D/g, ''))}
                              placeholder="Any 3-4 digits"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600 text-center tracking-widest disabled:bg-slate-100"
                              required
                            />
                          </div>

                          <div className="space-y-1 flex flex-col justify-end">
                            {!isSavingsOtpRequested ? (
                              <button
                                type="button"
                                onClick={handleRequestSavingsOtp}
                                disabled={isRequestingSavingsOtp || !savingsCvv}
                                className="w-full py-1.5 px-3 bg-indigo-900 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                              >
                                {isRequestingSavingsOtp ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Sending...</span>
                                  </>
                                ) : (
                                  <span>Request OTP</span>
                                )}
                              </button>
                            ) : (
                              <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded-lg flex items-center justify-between">
                                <span className="font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  OTP Sent
                                </span>
                                <span className="font-mono font-bold">4920</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {isSavingsOtpRequested && (
                          <div className="space-y-1 pt-1 animate-in fade-in">
                            <label className="text-[11px] font-bold text-slate-700 flex justify-between">
                              <span>Enter 4-Digit OTP</span>
                              <span className="text-[10px] text-slate-400 font-normal">Accepts any 4 digits</span>
                            </label>
                            <input
                              type="text"
                              maxLength={4}
                              value={savingsOtp}
                              onChange={(e) => setSavingsOtp(e.target.value.replace(/\D/g, ''))}
                              placeholder="e.g. 4920"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600 text-center tracking-widest font-bold text-indigo-950"
                              autoFocus
                              required
                            />
                          </div>
                        )}
                      </div>

                      {/* Pay Button */}
                      <button
                        type="submit"
                        disabled={isProcessing || !payAmount}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Debiting Savings &amp; Settling Ledger...</span>
                          </>
                        ) : !isSavingsOtpRequested ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-200" />
                            <span>Request OTP for ₹{Number(payAmount || 0).toLocaleString('en-IN')}</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-200" />
                            <span>Submit OTP &amp; Pay ₹{Number(payAmount || 0).toLocaleString('en-IN')}</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* TAB 2: USING CARD (DIRECT 16-DIGIT DEBIT CARD + OTP) */}
                  {payMethod === 'debit' && (
                    <form onSubmit={handleDirectDebitPayment} className="space-y-3 pt-1 text-left">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 flex justify-between">
                          <span>16-Digit Debit Card Number</span>
                          <span className="text-[10px] text-slate-400 font-normal">Accepts any 16 digits</span>
                        </label>
                        <input
                          type="text"
                          maxLength={19}
                          disabled={isDebitOtpRequested}
                          value={debitCardNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                            const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
                            setDebitCardNumber(formatted);
                          }}
                          placeholder="5241 8910 2341 5521"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-900 focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700">Expiry MM/YY</label>
                          <input
                            type="text"
                            maxLength={5}
                            disabled={isDebitOtpRequested}
                            value={debitExpiry}
                            onChange={(e) => setDebitExpiry(e.target.value)}
                            placeholder="08/29"
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700">CVV (3/4 digits)</label>
                          <input
                            type="password"
                            maxLength={4}
                            disabled={isDebitOtpRequested}
                            value={debitCvv}
                            onChange={(e) => setDebitCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="842"
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center tracking-widest focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
                            required
                          />
                        </div>
                      </div>

                      {/* 2-Step OTP flow for Debit Card */}
                      {!isDebitOtpRequested ? (
                        <button
                          type="button"
                          onClick={handleRequestDebitOtp}
                          disabled={isRequestingDebitOtp || !debitCardNumber || !debitCvv}
                          className="w-full py-2.5 px-3 bg-indigo-900 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          {isRequestingDebitOtp ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Requesting Secure OTP...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Request OTP</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              OTP Generated
                            </span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-mono font-bold">
                              Dummy OTP: 8421
                            </span>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-700 block">
                              Enter 4-Digit OTP
                            </label>
                            <input
                              type="text"
                              maxLength={4}
                              value={debitOtp}
                              onChange={(e) => setDebitOtp(e.target.value.replace(/\D/g, ''))}
                              placeholder="8421"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-center tracking-widest text-indigo-950 focus:outline-none focus:border-indigo-600 shadow-2xs"
                              autoFocus
                              required
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isProcessing || !payAmount}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Processing Debit Card Payment...</span>
                          </>
                        ) : !isDebitOtpRequested ? (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-200" />
                            <span>Request OTP for ₹{Number(payAmount || 0).toLocaleString('en-IN')}</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-200" />
                            <span>Submit OTP &amp; Pay ₹{Number(payAmount || 0).toLocaleString('en-IN')}</span>
                          </>
                        )}
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={handleRedirectToDebitPortal}
                          className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Or Open in External Payment Gateway Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 3: DYNAMIC QR CODE OPTION */}
                  {payMethod === 'qr' && (
                    <div className="space-y-3 pt-1 text-center">
                      {!qrSession ? (
                        <div className="py-6 space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
                            <QrCode className="w-6 h-6" />
                          </div>
                          <p className="text-xs text-slate-600 max-w-xs mx-auto">
                            Click below to generate a single-use dynamic UPI QR code for ₹
                            {Number(payAmount || 0).toLocaleString('en-IN')} that anyone can scan and pay with any UPI app.
                          </p>
                          <button
                            type="button"
                            onClick={handleGenerateQr}
                            disabled={isGeneratingQr || !payAmount}
                            className="py-2.5 px-5 bg-indigo-900 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                          >
                            {isGeneratingQr ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Generating Dynamic QR...</span>
                              </>
                            ) : (
                              <>
                                <QrCode className="w-4 h-4 text-amber-300" />
                                <span>Generate QR Code &rarr;</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : isQrExpired ? (
                        /* EXPIRED / FAILED STATE */
                        <div className="py-6 space-y-3 text-center animate-in fade-in">
                          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-rose-800 uppercase bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Session Expired
                            </span>
                            <h4 className="text-base font-black text-slate-900 mt-1">Payment Failed</h4>
                            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                              The 2-minute dynamic QR code payment window expired without payment authorization.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleGenerateQr}
                            className="py-2.5 px-5 bg-indigo-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4 text-amber-300" />
                            <span>Generate New QR Code</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          {/* QR Code Image */}
                          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs inline-block mx-auto relative">
                            {qrSession.qrDataUrl ? (
                              <img
                                src={qrSession.qrDataUrl}
                                alt="Scan QR Code"
                                className="w-48 h-48 rounded-lg object-contain mx-auto"
                              />
                            ) : (
                              <div
                                dangerouslySetInnerHTML={{ __html: qrSession.qrSvg || '' }}
                                className="w-48 h-48 mx-auto flex items-center justify-center"
                              />
                            )}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-indigo-900 text-white border-2 border-white shadow flex items-center justify-center font-bold text-xs pointer-events-none">
                              IB
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs px-4">
                            <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span>Awaiting Scan</span>
                            </div>
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                              {Math.floor(qrTimeLeft / 60).toString().padStart(2, '0')}:{(qrTimeLeft % 60).toString().padStart(2, '0')}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500">
                            Scan with any phone camera or UPI app (Google Pay, PhonePe, Paytm, BHIM).
                          </p>

                          {/* Helpers */}
                          <div className="space-y-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setSimulatorTxnId(qrSession.txnId)}
                              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                              <span>Simulate Phone Scan (In-App)</span>
                            </button>

                            <div className="grid grid-cols-2 gap-1.5">
                              <a
                                href={qrSession.gatewayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 text-center"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open Gateway in Tab</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => {
                                  if (qrSession.gatewayUrl) {
                                    navigator.clipboard.writeText(qrSession.gatewayUrl);
                                    setCopiedLink(true);
                                    setTimeout(() => setCopiedLink(false), 2000);
                                  }
                                }}
                                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                {copiedLink ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-700 font-bold">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Phone Simulator Modal */}
      <MobilePhoneSimulatorModal
        isOpen={Boolean(simulatorTxnId)}
        onClose={() => setSimulatorTxnId(null)}
        txnId={simulatorTxnId || 'TXN-CC-829104'}
        onPaymentSuccess={(session, card) => {
          if (card) setCoreCard(card);
          setPaymentSuccessData({
            amount: session?.amount || Number(payAmount),
            utr: session?.utr || 'UTR-INB-98410291',
            method: 'Dynamic QR (Mobile Phone Scan)',
          });
          setSimulatorTxnId(null);
        }}
      />
    </Page>
  );
};
