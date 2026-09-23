import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  ArrowRight,
  RefreshCw,
  Clock,
  Zap,
  Receipt,
  Download,
} from 'lucide-react';
import { PaymentSession, CoreCreditCard } from '../../types';
import { formatINR, formatCountdown } from '../../utils/format';
import { Skeleton } from '../ui/Primitives';

interface PaymentGatewayViewProps {
  initialTxnId?: string;
  isEmbedded?: boolean;
  onPaymentCompleted?: (session: PaymentSession, card: CoreCreditCard) => void;
  onClose?: () => void;
}

/** Bill facts encoded in the QR link, so the page is complete even if the session can't be fetched. */
function readUrlFacts() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const num = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined);
  return {
    txnId: p.get('txnId') || p.get('txn_id') || undefined,
    amount: num('amount'),
    total: num('total'),
    min: num('min'),
    holder: p.get('holder') || undefined,
    card: p.get('card') || undefined,
    cardName: p.get('name') || undefined,
    due: p.get('due') || undefined,
    expires: num('exp'),
  };
}

export const PaymentGatewayView: React.FC<PaymentGatewayViewProps> = ({
  initialTxnId,
  isEmbedded = false,
  onPaymentCompleted,
  onClose,
}) => {
  const facts = readUrlFacts();
  const [txnId] = useState<string>(() => initialTxnId || facts.txnId || 'TXN-CC-829104');

  const [session, setSession] = useState<PaymentSession | null>(null);
  const [card, setCard] = useState<CoreCreditCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'netbanking' | 'debit'>(() => {
    if (typeof window !== 'undefined') {
      const m = new URLSearchParams(window.location.search).get('method');
      if (m === 'debit' || m === 'card') return 'debit';
      if (m === 'netbanking' || m === 'nb') return 'netbanking';
    }
    return 'upi';
  });

  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm'>('gpay');
  const [vpaId, setVpaId] = useState('');
  const [amountOption, setAmountOption] = useState<'total' | 'min' | 'custom'>('total');
  const [customAmount, setCustomAmount] = useState<string>('');

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardOtp, setCardOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState<boolean>(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState<boolean>(false);

  const [netbankingUser, setNetbankingUser] = useState('');
  const [netbankingOtp, setNetbankingOtp] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedSession, setCompletedSession] = useState<PaymentSession | null>(null);
  const [updatedCard, setUpdatedCard] = useState<CoreCreditCard | null>(null);

  // Load the session; fall back to the facts encoded in the link
  useEffect(() => {
    let isMounted = true;
    async function loadSession() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/payment/session/${txnId}`);
        if (!res.ok) {
          let fallbackCard: CoreCreditCard | null = null;
          try {
            const cardRes = await fetch('/api/banking/credit-card');
            fallbackCard = (await cardRes.json())?.card || null;
          } catch {
            /* server unreachable — use link facts only */
          }
          if (!isMounted) return;
          setOffline(true);
          setCard(fallbackCard);
          setSession({
            txnId,
            cardId: fallbackCard?.cardId || 'card-1',
            cardMasked: facts.card ? `•••• ${facts.card}` : fallbackCard?.maskedNumber || '•••• 8842',
            cardName: facts.cardName || fallbackCard?.cardName || 'Nexora Royale Infinite',
            cardHolder: facts.holder || fallbackCard?.cardHolder || 'SHIVANSH MISHRA',
            amount: facts.amount || fallbackCard?.outstandingBalance || 87500,
            status: 'PENDING',
            createdAt: Date.now(),
            expiresAt: facts.expires || Date.now() + 15 * 60 * 1000,
            gatewayUrl: window.location.href,
          });
          return;
        }
        const data = await res.json();
        if (isMounted && data.success) {
          setSession(data.session);
          setCard(data.card);
          if (data.session.status === 'COMPLETED') {
            setIsSuccess(true);
            setCompletedSession(data.session);
            setUpdatedCard(data.card);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load payment details');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadSession();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txnId]);

  // Countdown
  useEffect(() => {
    if (isSuccess || !session) return;
    const initial = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
    setTimeLeft(initial);
    if (initial <= 0 || session.status === 'EXPIRED') {
      setIsExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [session, isSuccess]);

  const totalDue = card?.outstandingBalance ?? facts.total ?? 87500;
  const minDue = card?.minimumDue ?? facts.min ?? 4500;
  const billedAmount = session?.amount ?? facts.amount ?? totalDue;
  const dueDate = card?.dueDate || facts.due || '05 Oct 2026';

  const effectivePayAmount =
    amountOption === 'total' ? billedAmount : amountOption === 'min' ? minDue : parseFloat(customAmount) || billedAmount;
  const formattedAmount = formatINR(effectivePayAmount);

  const handleRequestDebitOtp = () => {
    if (cardNumber.replace(/\s+/g, '').length < 12) return setError('Enter a valid 16-digit card number.');
    if (cardCvv.length < 3) return setError('Enter the card CVV.');
    setError(null);
    setIsRequestingOtp(true);
    setTimeout(() => {
      setIsRequestingOtp(false);
      setOtpRequested(true);
    }, 500);
  };

  const handleSimulatePayment = async () => {
    if (isProcessing || isSuccess) return;
    if (paymentMethod === 'debit' && (!otpRequested || cardOtp.length < 4)) return setError('Enter the 4-digit OTP to complete payment.');
    if (paymentMethod === 'upi' && !vpaId.trim()) return setError('Enter your UPI ID.');
    if (paymentMethod === 'netbanking' && (!netbankingUser.trim() || netbankingOtp.length < 4)) return setError('Enter your customer ID and OTP.');

    setIsProcessing(true);
    setError(null);
    const steps = ['Connecting to Bharat BillPay…', 'Verifying card •••• ' + (session?.cardMasked?.slice(-4) || '8842'), 'Debiting your account…', 'Confirming with India Bank…'];
    for (const s of steps) {
      setProcessingStep(s);
      await new Promise((r) => setTimeout(r, 550));
    }
    try {
      const methodName =
        paymentMethod === 'upi' ? `UPI (${upiApp === 'gpay' ? 'Google Pay' : upiApp === 'phonepe' ? 'PhonePe' : 'Paytm'} · ${vpaId})` : paymentMethod === 'netbanking' ? 'NetBanking' : `Debit card •••• ${cardNumber.replace(/\D/g, '').slice(-4)}`;
      const res = await fetch('/api/payment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txnId, paymentMethod: methodName, amount: effectivePayAmount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || 'Payment authorisation failed');
      setIsSuccess(true);
      setCompletedSession(data.session);
      setUpdatedCard(data.card);
      onPaymentCompleted?.(data.session, data.card);
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  /* -------------------------------------------------------------- */

  const BillDetails = (
    <div className="ib-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-bold text-slate-900">Bill details</h3>
        {offline && (
          <span className="ml-auto text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
            From QR link
          </span>
        )}
      </div>
      <dl className="text-sm divide-y divide-slate-100">
        {[
          ['Payee', 'India Bank · Credit card bill'],
          ['Cardholder', session?.cardHolder || facts.holder || '—'],
          ['Card', `${session?.cardName || 'Nexora Royale Infinite'} ${session?.cardMasked || ''}`],
          ['Amount requested', formatINR(billedAmount)],
          ['Total outstanding', formatINR(totalDue)],
          ['Minimum due', formatINR(minDue)],
          ['Due date', dueDate],
          ['Reference', txnId],
        ].map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 py-2.5">
            <dt className="text-slate-500 shrink-0">{k}</dt>
            <dd className={`font-semibold text-slate-900 text-right ${k === 'Reference' ? 'font-mono text-xs' : ''}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> PCI-DSS Level 1 · NPCI / Bharat BillPay certified
      </p>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#F5F7FB] ${isEmbedded ? 'min-h-full p-2' : 'py-6 px-4 sm:px-6'}`}>
      <div className={`mx-auto ${isEmbedded ? 'max-w-full' : 'max-w-4xl'} space-y-4`}>
        {/* Institutional header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold">IB</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">India Bank</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                  Payment gateway
                </span>
              </div>
              <p className="text-xs text-slate-500">Secure bill payment · Bharat BillPay</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-semibold">
            <Lock className="w-3 h-3" /> 256-bit SSL
          </span>
        </div>

        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-12" aria-busy="true" aria-label="Fetching your bill">
            <div className="md:col-span-5 space-y-4">
              <Skeleton className="h-40 rounded-[22px]" />
              <Skeleton className="h-72 rounded-[22px]" />
            </div>
            <div className="md:col-span-7 ib-card p-5 space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </div>
        ) : isSuccess ? (
          /* ---------------- SUCCESS ---------------- */
          <div className="ib-card p-6 sm:p-8 text-center space-y-5 ib-pop">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30" />
              <div className="relative w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Payment successful</h2>
              <p className="text-sm text-slate-600 mt-1">Your credit card bill has been paid and the ledger updated.</p>
            </div>
            <dl className="ib-card bg-slate-50 p-4 text-left text-sm divide-y divide-slate-200 max-w-md mx-auto">
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Amount paid</dt>
                <dd className="text-lg font-bold text-emerald-600">{formatINR(completedSession?.amount ?? effectivePayAmount)}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Card</dt>
                <dd className="font-semibold text-slate-900">
                  {session?.cardName} {session?.cardMasked}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Paid via</dt>
                <dd className="font-medium text-slate-900">{completedSession?.paymentMethod || 'UPI'}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">UTR</dt>
                <dd className="font-mono font-semibold text-indigo-700">{completedSession?.utr}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Reference</dt>
                <dd className="font-mono text-xs text-slate-700">{txnId}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">Remaining due</dt>
                <dd className="font-bold text-slate-900">{formatINR(updatedCard?.outstandingBalance || 0)}</dd>
              </div>
            </dl>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <button onClick={() => window.print()} className="ib-btn-secondary">
                <Download className="w-4 h-4" /> Save receipt
              </button>
              <button onClick={() => (onClose ? onClose() : (window.location.href = '/'))} className="ib-btn-primary">
                {isEmbedded ? 'Done' : 'Back to NetBanking'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">The NetBanking screen and Zora have been updated automatically.</p>
          </div>
        ) : (
          /* ---------------- PENDING ---------------- */
          <div className={`grid gap-4 ${isEmbedded ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-12'}`}>
            <div className={isEmbedded ? '' : 'md:col-span-5 space-y-4'}>
              {/* Amount hero */}
              <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-indigo-700 to-slate-900">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-200">
                  {amountOption === 'total' ? 'Amount to pay' : amountOption === 'min' ? 'Minimum due' : 'Custom amount'}
                </span>
                <p className="text-3xl font-bold tracking-tight mt-1">{formattedAmount}</p>
                <p className="text-sm text-indigo-200 mt-1">
                  {session?.cardHolder} · {session?.cardMasked}
                </p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs">
                  <span className="text-indigo-200">Due {dueDate}</span>
                  <span className={`inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded-md ${isExpired ? 'bg-rose-500/30 text-rose-100' : 'bg-white/10'}`}>
                    <Clock className="w-3.5 h-3.5" /> {isExpired ? 'Expired' : formatCountdown(timeLeft)}
                  </span>
                </div>
              </div>
              {!isEmbedded && BillDetails}
            </div>

            <div className={`ib-card p-5 space-y-5 ${isEmbedded ? '' : 'md:col-span-7'}`}>
              {isExpired && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3 text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong className="block">This payment link has expired</strong>
                    <p className="text-rose-700 text-xs mt-0.5">Links are valid for 2 minutes. Please generate a new QR from NetBanking or Zora.</p>
                  </div>
                </div>
              )}

              {/* Amount choice */}
              <div>
                <label className="ib-label">Choose amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'total' as const, label: 'Requested', value: formatINR(billedAmount, { decimals: 0 }) },
                    { id: 'min' as const, label: 'Minimum due', value: formatINR(minDue, { decimals: 0 }) },
                    { id: 'custom' as const, label: 'Custom', value: 'Any amount' },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setAmountOption(o.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        amountOption === o.id ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">{o.label}</span>
                      <span className="text-sm font-bold text-slate-900">{o.value}</span>
                    </button>
                  ))}
                </div>
                {amountOption === 'custom' && (
                  <div className="relative mt-2 ib-fade-up">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                    <input type="number" min="1" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="Enter amount" className="ib-input pl-8 font-semibold" autoFocus />
                  </div>
                )}
              </div>

              {/* Method */}
              <div className="space-y-2">
                <label className="ib-label">Pay using</label>
                {[
                  { id: 'upi' as const, icon: <Zap className="w-4 h-4" />, title: 'UPI', sub: 'Google Pay, PhonePe, Paytm — instant' },
                  { id: 'debit' as const, icon: <CreditCard className="w-4 h-4" />, title: 'Debit card', sub: 'Any bank · RuPay, Visa, Mastercard' },
                  { id: 'netbanking' as const, icon: <Building2 className="w-4 h-4" />, title: 'India Bank NetBanking', sub: 'Savings account •••• 1234' },
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${paymentMethod === m.id ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/15' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">{m.icon}</div>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-900 block">{m.title}</span>
                        <span className="text-xs text-slate-500">{m.sub}</span>
                      </div>
                      <span className={`w-4 h-4 rounded-full border-2 ${paymentMethod === m.id ? 'border-indigo-600 bg-indigo-600 ring-2 ring-white ring-inset' : 'border-slate-300'}`} />
                    </div>

                    {paymentMethod === 'upi' && m.id === 'upi' && (
                      <div className="mt-3 pt-3 border-t border-indigo-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'gpay' as const, label: 'Google Pay' },
                            { id: 'phonepe' as const, label: 'PhonePe' },
                            { id: 'paytm' as const, label: 'Paytm' },
                          ].map((app) => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => setUpiApp(app.id)}
                              className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer ${upiApp === app.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                            >
                              {app.label}
                            </button>
                          ))}
                        </div>
                        <input value={vpaId} onChange={(e) => setVpaId(e.target.value)} placeholder="yourname@upi" className="ib-input font-mono" />
                      </div>
                    )}

                    {paymentMethod === 'debit' && m.id === 'debit' && (
                      <div className="mt-3 pt-3 border-t border-indigo-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          value={cardNumber}
                          disabled={otpRequested}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '))}
                          placeholder="Card number"
                          className="ib-input font-mono tracking-wider"
                          inputMode="numeric"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input value={cardExpiry} disabled={otpRequested} maxLength={5} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" className="ib-input font-mono" />
                          <input type="password" value={cardCvv} disabled={otpRequested} maxLength={4} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))} placeholder="CVV" className="ib-input font-mono" />
                        </div>
                        {otpRequested && (
                          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2 ib-fade-up">
                            <p className="text-xs text-emerald-800 font-semibold inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> OTP sent to the mobile linked to this card
                            </p>
                            <input value={cardOtp} maxLength={6} onChange={(e) => setCardOtp(e.target.value.replace(/\D/g, ''))} placeholder="Enter OTP" className="ib-input font-mono text-center tracking-[0.4em] font-bold" autoFocus />
                            <button type="button" onClick={() => setOtpRequested(false)} className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
                              Change card
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethod === 'netbanking' && m.id === 'netbanking' && (
                      <div className="mt-3 pt-3 border-t border-indigo-100 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <input value={netbankingUser} onChange={(e) => setNetbankingUser(e.target.value)} placeholder="Customer ID" className="ib-input font-mono" />
                        <input value={netbankingOtp} maxLength={6} onChange={(e) => setNetbankingOtp(e.target.value.replace(/\D/g, ''))} placeholder="OTP" className="ib-input font-mono text-center" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                type="button"
                id="btn-simulate-payment"
                onClick={paymentMethod === 'debit' && !otpRequested ? handleRequestDebitOtp : handleSimulatePayment}
                disabled={isProcessing || isExpired || isRequestingOtp}
                className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  isExpired ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-60'
                }`}
              >
                {isProcessing || isRequestingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> {processingStep || 'Sending OTP…'}
                  </>
                ) : isExpired ? (
                  'Payment window closed'
                ) : paymentMethod === 'debit' && !otpRequested ? (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Request OTP for {formattedAmount}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Pay {formattedAmount}
                  </>
                )}
              </button>

              {isEmbedded && <details className="text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Bill details</summary><div className="mt-2">{BillDetails}</div></details>}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400">
          India Bank payment gateway · Ref {txnId} · Need help? 1800 202 6161
        </p>
      </div>
    </div>
  );
};
