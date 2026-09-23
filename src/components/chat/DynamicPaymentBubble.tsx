import React, { useState, useEffect } from 'react';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { PaymentSession, CoreCreditCard } from '../../types';

interface DynamicPaymentBubbleProps {
  session: PaymentSession;
  onPaymentSuccess?: (session: PaymentSession, card: CoreCreditCard) => void;
  onOpenSimulator?: (txnId: string) => void;
  onRegenerate?: () => void;
}

export const DynamicPaymentBubble: React.FC<DynamicPaymentBubbleProps> = ({
  session,
  onPaymentSuccess,
  onOpenSimulator,
  onRegenerate,
}) => {
  const [currentStatus, setCurrentStatus] = useState<'PENDING' | 'COMPLETED' | 'EXPIRED'>(
    session.status || 'PENDING'
  );
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
    return remaining > 0 ? remaining : 120; // 2 minutes timeout
  });
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState<string | null>(session.utr || null);

  // Expiry countdown timer
  useEffect(() => {
    if (currentStatus === 'COMPLETED') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCurrentStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStatus]);

  // Real-Time Listener: Server-Sent Events (SSE) + Polling Fallback
  useEffect(() => {
    if (currentStatus === 'COMPLETED') return;

    let sse: EventSource | null = null;
    let pollInterval: any = null;
    let isSubscribed = true;

    try {
      sse = new EventSource(`/api/payment/stream/${session.txnId}`);

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'payment_complete' && isSubscribed) {
            console.log('[DynamicPaymentBubble] Real-time payment confirmation received via SSE!', data);
            setCurrentStatus('COMPLETED');
            setUtrNumber(data.session?.utr || 'UTR-INB-98410291');
            if (onPaymentSuccess) {
              onPaymentSuccess(data.session, data.card);
            }
            if (sse) sse.close();
            if (pollInterval) clearInterval(pollInterval);
          }
        } catch {
          // ignore parsing error
        }
      };

      sse.onerror = () => {
        // SSE error, fall back to polling
        if (sse) {
          sse.close();
          sse = null;
        }
      };
    } catch {
      // fallback
    }

    // Polling fallback every 1.5s
    pollInterval = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`/api/payment/session/${session.txnId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.session?.status === 'COMPLETED' && isSubscribed) {
            console.log('[DynamicPaymentBubble] Payment confirmed via polling!', data);
            setCurrentStatus('COMPLETED');
            setUtrNumber(data.session?.utr || 'UTR-INB-98410291');
            if (onPaymentSuccess) {
              onPaymentSuccess(data.session, data.card);
            }
            if (pollInterval) clearInterval(pollInterval);
            if (sse) sse.close();
          }
        }
      } catch {
        // ignore
      }
    }, 1500);

    return () => {
      isSubscribed = false;
      if (sse) sse.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [session.txnId, currentStatus, onPaymentSuccess]);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(session.gatewayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const formattedAmount = Number(session.amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="w-full max-w-[340px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left my-2 transition-all">
      {/* Header Banner */}
      <div
        className={`px-3.5 py-2.5 flex items-center justify-between text-white ${
          currentStatus === 'COMPLETED'
            ? 'bg-emerald-600'
            : currentStatus === 'EXPIRED'
            ? 'bg-rose-700'
            : 'bg-indigo-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
            {currentStatus === 'COMPLETED' ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : currentStatus === 'EXPIRED' ? (
              <XCircle className="w-4 h-4 text-white" />
            ) : (
              <QrCode className="w-3.5 h-3.5 text-white" />
            )}
          </div>
          <div>
            <span className="font-bold text-xs tracking-tight block">
              {currentStatus === 'COMPLETED'
                ? 'Payment Verified'
                : currentStatus === 'EXPIRED'
                ? 'Session Expired · Failed'
                : 'Dynamic Payment QR'}
            </span>
            <span className="text-[10px] text-white/80">
              {currentStatus === 'EXPIRED' ? '2-minute window closed' : 'Valid for 2 minutes'}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[9px] uppercase tracking-wider text-white/80 block">Bill Amount</span>
          <span className="font-mono text-sm font-bold text-white">₹{formattedAmount}</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3.5 flex flex-col items-center text-center space-y-3">
        {currentStatus === 'COMPLETED' ? (
          /* SUCCESS STATE IN CHAT BUBBLE */
          <div className="py-3 px-2 w-full space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Payment Settled
              </span>
              <h4 className="text-sm font-black text-slate-900 mt-1">₹{formattedAmount} Credited</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Core banking ledger updated immediately.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-left text-[11px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Txn ID:</span>
                <span className="font-bold text-slate-800">{session.txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Bank UTR:</span>
                <span className="font-bold text-indigo-700">{utrNumber || 'UTR-INB-98410291'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Card:</span>
                <span className="font-bold text-slate-800">{session.cardMasked}</span>
              </div>
            </div>
          </div>
        ) : currentStatus === 'EXPIRED' ? (
          /* EXPIRED / FAILED STATE IN CHAT BUBBLE */
          <div className="py-3 px-2 w-full space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Payment Session Expired
              </span>
              <h4 className="text-sm font-black text-slate-900 mt-1">Payment Failed</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                The 2-minute dynamic QR payment window expired before authorization.
              </p>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-2.5 text-left text-[11px] space-y-1 font-mono">
              <div className="flex justify-between text-rose-800">
                <span className="font-sans">Status:</span>
                <span className="font-bold">EXPIRED / UNPAID</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Txn ID:</span>
                <span className="font-bold">{session.txnId}</span>
              </div>
            </div>

            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="w-full py-2.5 px-3 bg-indigo-950 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                <span>Generate New QR Code</span>
              </button>
            )}
          </div>
        ) : (
          /* ACTIVE PENDING QR CODE DISPLAY */
          <>
            {/* Scannable Dynamic QR Box */}
            <div className="relative p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs group">
              {session.qrDataUrl ? (
                <img
                  src={session.qrDataUrl}
                  alt={`Scan to Pay ₹${formattedAmount}`}
                  className="w-48 h-48 sm:w-52 sm:h-52 rounded-lg object-contain mx-auto"
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: session.qrSvg || '' }}
                  className="w-48 h-48 sm:w-52 sm:h-52 mx-auto flex items-center justify-center"
                />
              )}

              {/* Center Bank Logo Badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-indigo-900 text-white border-2 border-white shadow flex items-center justify-center font-bold text-xs pointer-events-none">
                IB
              </div>
            </div>

            {/* Live Status & Countdown */}
            <div className="w-full flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>Awaiting Scan &amp; Pay</span>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{timeFormatted}</span>
              </div>
            </div>

            {/* Instruction Callout */}
            <p className="text-[11px] text-slate-600 leading-tight">
              Scan with your <strong>phone camera</strong> or <strong>UPI app</strong> (GPay / PhonePe / Paytm) to open the India Bank Payment Gateway.
            </p>

            {/* Interactive Testing Helpers */}
            <div className="w-full space-y-1.5 pt-1">
              {/* Option A: Simulate Phone Scan in-app */}
              <button
                type="button"
                onClick={() => onOpenSimulator && onOpenSimulator(session.txnId)}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                <span>Simulate Phone Scan (In-App)</span>
              </button>

              {/* Option B: Open Gateway in New Tab */}
              <div className="grid grid-cols-2 gap-1.5">
                <a
                  href={session.gatewayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 text-center"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in Tab</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {copied ? (
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
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-100 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500">
        <span>Ref: <strong className="font-mono text-slate-700">{session.txnId}</strong></span>
        <span className="flex items-center gap-0.5 text-emerald-700 font-medium">
          <ShieldCheck className="w-3 h-3" /> PCI-DSS Level 1
        </span>
      </div>
    </div>
  );
};
