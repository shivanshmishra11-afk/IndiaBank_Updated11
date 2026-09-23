import React, { useEffect, useState } from 'react';
import {
  Building2,
  CreditCard,
  QrCode,
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { CoreCreditCard, PaymentSession } from '../../types';
import { formatINR } from '../../utils/format';
import { DynamicPaymentBubble } from './DynamicPaymentBubble';

export interface PaymentReceipt {
  amount: number;
  utr: string;
  method: string;
  card: CoreCreditCard;
}

interface ChatPaymentFlowProps {
  initialCard: CoreCreditCard | null;
  cardHolder: string;
  onCompleted: (receipt: PaymentReceipt) => void;
  onOpenSimulator: (txnId: string) => void;
  /** Bubbles up a fresh session so the parent can resolve simulator callbacks */
  onQrSession?: (session: PaymentSession) => void;
  /** Externally completed (e.g. via phone simulator) */
  externalReceipt?: PaymentReceipt | null;
}

type AmountChoice = 'total' | 'min' | 'custom';
type Step = 'amount' | 'method' | 'savings' | 'debit' | 'qr' | 'done';

const OptionTile: React.FC<{
  selected: boolean;
  onClick: () => void;
  label: string;
  value: string;
  hint?: string;
}> = ({ selected, onClick, label, value, hint }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
      selected
        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20'
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`}
  >
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">{label}</span>
    <span className="text-sm font-bold text-slate-900 block mt-0.5">{value}</span>
    {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
  </button>
);

export const ChatPaymentFlow: React.FC<ChatPaymentFlowProps> = ({
  initialCard,
  cardHolder,
  onCompleted,
  onOpenSimulator,
  onQrSession,
  externalReceipt,
}) => {
  const [card, setCard] = useState<CoreCreditCard | null>(initialCard);
  const [step, setStep] = useState<Step>('amount');
  const [choice, setChoice] = useState<AmountChoice>('total');
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Savings & debit inputs
  const [cvv, setCvv] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [debitNumber, setDebitNumber] = useState('');
  const [debitExpiry, setDebitExpiry] = useState('');

  // QR
  const [qrSession, setQrSession] = useState<PaymentSession | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  // Always work from the live ledger value
  useEffect(() => {
    let alive = true;
    fetch('/api/banking/credit-card')
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.card) setCard(d.card);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Simulator completed the QR payment outside this component
  useEffect(() => {
    if (externalReceipt && step !== 'done') {
      setReceipt(externalReceipt);
      setCard(externalReceipt.card);
      setStep('done');
    }
  }, [externalReceipt, step]);

  const totalDue = card?.outstandingBalance ?? 87500;
  const minDue = card?.minimumDue ?? 4500;
  const amount =
    choice === 'total' ? totalDue : choice === 'min' ? minDue : Math.max(0, parseFloat(customAmount) || 0);
  const amountValid = amount > 0 && amount <= Math.max(totalDue, 1);

  const finish = (r: PaymentReceipt) => {
    setReceipt(r);
    setCard(r.card);
    setStep('done');
    onCompleted(r);
  };

  const requestOtp = () => {
    setError(null);
    if (step === 'savings' && cvv.replace(/\D/g, '').length < 3) {
      setError('Enter the 3-digit CVV of your debit card to authorise the debit.');
      return;
    }
    if (step === 'debit') {
      if (debitNumber.replace(/\D/g, '').length < 12) {
        setError('Enter a valid 16-digit card number.');
        return;
      }
      if (cvv.replace(/\D/g, '').length < 3) {
        setError('Enter the card CVV.');
        return;
      }
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setOtpSent(true);
    }, 600);
  };

  const payDirect = async () => {
    if (otp.replace(/\D/g, '').length < 4) {
      setError('Enter the 4-digit OTP sent to your registered mobile.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const method =
        step === 'savings' ? 'India Bank Savings A/C (AC1000231234)' : `Debit Card •••• ${debitNumber.replace(/\D/g, '').slice(-4)}`;
      const res = await fetch('/api/payment/direct-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method, cvv, otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || 'Payment could not be completed.');
      finish({ amount: data.amount, utr: data.utr, method, card: data.card });
    } catch (e: any) {
      setError(e.message || 'Payment failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const createQr = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/payment/create-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, origin: window.location.origin, cardHolder }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || 'Could not generate QR.');
      setQrSession(data.session);
      onQrSession?.(data.session);
      setStep('qr');
    } catch (e: any) {
      setError(e.message || 'Could not generate QR.');
    } finally {
      setBusy(false);
    }
  };

  const resetAuth = () => {
    setOtp('');
    setOtpSent(false);
    setError(null);
  };

  const header = (title: string, back?: Step) => (
    <div className="flex items-center gap-2 mb-3">
      {back && (
        <button
          type="button"
          onClick={() => {
            resetAuth();
            setStep(back);
          }}
          className="p-1 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <span className="text-xs font-bold text-slate-900">{title}</span>
      <span className="ml-auto text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
        {formatINR(amount)}
      </span>
    </div>
  );

  /* ---------------------------------------------------------------- */

  if (step === 'done' && receipt) {
    return (
      <div className="w-full max-w-[340px] ib-card p-4 ib-pop">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Payment successful</span>
            <p className="text-lg font-bold text-slate-900 leading-tight">{formatINR(receipt.amount)}</p>
          </div>
        </div>
        <dl className="mt-3 text-xs divide-y divide-slate-100 border-t border-slate-100">
          <div className="flex justify-between py-1.5">
            <dt className="text-slate-500">Paid via</dt>
            <dd className="font-medium text-slate-800 text-right">{receipt.method}</dd>
          </div>
          <div className="flex justify-between py-1.5">
            <dt className="text-slate-500">UTR</dt>
            <dd className="font-mono font-semibold text-indigo-700">{receipt.utr}</dd>
          </div>
          <div className="flex justify-between py-1.5">
            <dt className="text-slate-500">Remaining due</dt>
            <dd className="font-semibold text-slate-900">{formatINR(receipt.card.outstandingBalance)}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (step === 'qr' && qrSession) {
    return (
      <div className="w-full max-w-[340px] space-y-2">
        <DynamicPaymentBubble
          session={qrSession}
          onOpenSimulator={onOpenSimulator}
          onRegenerate={createQr}
          onPaymentSuccess={(s, c) =>
            finish({ amount: s.amount, utr: s.utr || 'UTR-INB-00000000', method: s.paymentMethod || 'UPI QR', card: c })
          }
        />
        <button
          type="button"
          onClick={() => {
            setQrSession(null);
            setStep('method');
          }}
          className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer inline-flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Choose a different method
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[340px] ib-card p-4 ib-pop">
      {/* Card summary strip */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">{card?.cardName || 'Nexora Royale Infinite'}</span>
            <span className="text-[11px] text-slate-500">
              {card?.maskedNumber || '•••• 8842'} · Due {card?.dueDate || '05 Oct 2026'}
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: amount */}
      {step === 'amount' && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-900 block">How much would you like to pay?</span>
          <div className="grid grid-cols-1 gap-2">
            <OptionTile
              selected={choice === 'total'}
              onClick={() => setChoice('total')}
              label="Total due"
              value={formatINR(totalDue)}
              hint="Clears the full statement, no interest"
            />
            <OptionTile
              selected={choice === 'min'}
              onClick={() => setChoice('min')}
              label="Minimum due"
              value={formatINR(minDue)}
              hint="Keeps the account regular"
            />
            <OptionTile
              selected={choice === 'custom'}
              onClick={() => setChoice('custom')}
              label="Custom"
              value="Any amount"
              hint="Enter a settlement amount of your choice"
            />
          </div>
          {choice === 'custom' && (
            <div className="ib-fade-up">
              <label className="ib-label">Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min="1"
                  max={totalDue}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={`Up to ${totalDue.toLocaleString('en-IN')}`}
                  className="ib-input pl-8 font-semibold"
                  autoFocus
                />
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={!amountValid}
            onClick={() => setStep('method')}
            className="ib-btn-primary w-full"
          >
            Continue with {formatINR(amount)} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: method */}
      {step === 'method' && (
        <div className="space-y-2">
          {header('Choose how to pay', 'amount')}
          {[
            {
              id: 'savings' as Step,
              icon: <Building2 className="w-4 h-4" />,
              title: 'Savings account',
              sub: 'Direct debit from AC1000231234 · Bal ₹1,24,560.50',
            },
            {
              id: 'debit' as Step,
              icon: <Wallet className="w-4 h-4" />,
              title: 'Debit card',
              sub: 'Any bank debit card with OTP',
            },
            {
              id: 'qr' as Step,
              icon: <QrCode className="w-4 h-4" />,
              title: 'Scan & pay QR',
              sub: 'Open on any phone or UPI app · valid 2 min',
            },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => {
                resetAuth();
                if (m.id === 'qr') createQr();
                else setStep(m.id);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-colors cursor-pointer disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
                {busy && m.id === 'qr' ? <RefreshCw className="w-4 h-4 animate-spin" /> : m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-900 block">{m.title}</span>
                <span className="text-[11px] text-slate-500 block truncate">{m.sub}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
      )}

      {/* STEP 3a / 3b: savings or debit with OTP */}
      {(step === 'savings' || step === 'debit') && (
        <div className="space-y-3">
          {header(step === 'savings' ? 'Pay from savings account' : 'Pay with debit card', 'method')}

          {step === 'savings' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600">Debit from</span>
              <span className="font-semibold text-slate-900">Savings · AC1000231234</span>
            </div>
          )}

          {step === 'debit' && (
            <div className="space-y-2">
              <div>
                <label className="ib-label">Card number</label>
                <input
                  className="ib-input font-mono tracking-wider"
                  inputMode="numeric"
                  maxLength={19}
                  disabled={otpSent}
                  value={debitNumber}
                  onChange={(e) =>
                    setDebitNumber(
                      e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 16)
                        .replace(/(\d{4})(?=\d)/g, '$1 ')
                    )
                  }
                  placeholder="0000 0000 0000 0000"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="ib-label">Expiry</label>
                  <input
                    className="ib-input font-mono"
                    maxLength={5}
                    disabled={otpSent}
                    value={debitExpiry}
                    onChange={(e) => setDebitExpiry(e.target.value)}
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="ib-label">CVV</label>
                  <input
                    className="ib-input font-mono"
                    type="password"
                    maxLength={4}
                    disabled={otpSent}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    placeholder="•••"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'savings' && (
            <div>
              <label className="ib-label">Debit card CVV (to authorise)</label>
              <input
                className="ib-input font-mono"
                type="password"
                maxLength={4}
                disabled={otpSent}
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                placeholder="•••"
              />
            </div>
          )}

          {otpSent && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2 ib-fade-up">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> OTP sent to +91 98765 43210
                </span>
                <button type="button" onClick={requestOtp} className="text-emerald-700 underline cursor-pointer">
                  Resend
                </button>
              </div>
              <input
                className="ib-input font-mono text-center tracking-[0.4em] font-bold"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                autoFocus
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            type="button"
            disabled={busy}
            onClick={otpSent ? payDirect : requestOtp}
            className="ib-btn-primary w-full"
          >
            {busy ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> {otpSent ? 'Processing payment…' : 'Sending OTP…'}
              </>
            ) : otpSent ? (
              <>
                <ShieldCheck className="w-4 h-4" /> Pay {formatINR(amount)}
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Request OTP
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
