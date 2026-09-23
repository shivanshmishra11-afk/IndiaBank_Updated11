import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  RefreshCw,
  Sparkles,
  CreditCard,
  Send,
  PhoneCall,
  Landmark,
} from 'lucide-react';
import { safeStorage } from '../utils/storage';
import { ZoraMark, WordReveal, AnimatedNumber } from './ui/Primitives';

interface LoginViewProps {
  onLogin: (email: string) => void;
  savedEmail?: string;
}

const DEMO_PROFILES = [
  { name: 'Shivansh Mishra', email: 'shivansh.mishra@intellectdesign.com', tag: 'Primary account' },
  { name: 'Ananya Sharma', email: 'ananya.sharma@indiabank.com', tag: 'Savings' },
  { name: 'Customer Support', email: 'customer.support@intellectbank.com', tag: 'Support' },
];

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, savedEmail = '' }) => {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');

  const [email, setEmail] = useState(savedEmail || 'shivansh.mishra@intellectdesign.com');
  const [password, setPassword] = useState('IndiaBank@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [resendNotification, setResendNotification] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendCountdown]);

  useEffect(() => {
    if (step === 'otp') setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [step]);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return setError('Please enter your registered email address.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setError('Please enter a valid email address.');

    setIsSubmitting(true);
    if (rememberMe) safeStorage.setItem('intellect_bank_remember_email', trimmedEmail);
    else safeStorage.removeItem('intellect_bank_remember_email');

    setTimeout(() => {
      setIsSubmitting(false);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setResendCountdown(30);
      setStep('otp');
    }, 400);
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return;
    const newDigit = cleaned.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = newDigit;
    setOtp(newOtp);
    setOtpError('');
    if (newDigit && index < 5) inputRefs.current[index + 1]?.focus();
    if (newDigit && index === 5 && newOtp.every((d) => d !== '')) handleVerifyOtp(newOtp.join(''));
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    else if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    else if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
    setOtp(newOtp);
    setOtpError('');
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) handleVerifyOtp(pasted);
  };

  // Accepts any 6 digits (sandbox)
  const handleVerifyOtp = (codeToVerify?: string) => {
    const code = codeToVerify || otp.join('');
    if (code.length < 6) return setOtpError('Please enter the full 6-digit code.');
    setIsVerifyingOtp(true);
    setOtpError('');
    safeStorage.setItem('intellect_bank_user_email', email.trim());
    setTimeout(() => {
      setIsVerifyingOtp(false);
      onLogin(email.trim());
    }, 500);
  };

  const handleQuickFillOtp = () => {
    setOtp(['1', '2', '3', '4', '5', '6']);
    setOtpError('');
    inputRefs.current[5]?.focus();
  };

  const handleResendOtp = () => {
    if (resendCountdown > 0) return;
    setResendCountdown(30);
    setResendNotification('A new code has been sent to your email.');
    setTimeout(() => setResendNotification(''), 4000);
  };

  return (
    <div className="relative w-full flex-1 overflow-hidden">
      {/* Hero lighting: two soft sources + fine grid, nothing else */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ib-drift absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute top-10 right-[-120px] w-[420px] h-[420px] rounded-full bg-amber-300/15 blur-3xl" />
      </div>

      <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left: editorial hero */}
          <div className="lg:col-span-7 space-y-10">
            <div className="space-y-6">
              <span className="ib-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-slate-200 text-slate-700 text-xs font-semibold shadow-[var(--shadow-xs)]">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> RBI-licensed scheduled commercial bank
              </span>
              <h1 className="ib-display text-slate-900 max-w-[14ch]">
                <WordReveal text="Banking that keeps up" />{' '}
                <WordReveal text="with you." className="text-indigo-600" startDelay={4} />
              </h1>
              <p className="ib-fade-up text-[17px] text-slate-600 leading-relaxed max-w-[50ch]" style={{ animationDelay: '520ms' }}>
                Balances at a glance, money sent in seconds, your card bill paid with a scan — and Zora on hand whenever you need a straight answer.
              </p>
            </div>

            {/* Product preview: a live-looking balance panel instead of three identical cards */}
            <div className="ib-fade-up relative mb-8" style={{ animationDelay: '640ms' }}>
              <div className="ib-grain relative rounded-[22px] bg-[#141a3a] text-white p-6 sm:p-7 overflow-hidden shadow-[var(--shadow-lg)]">
                <div className="ib-drift absolute -right-16 -top-24 w-72 h-72 rounded-full bg-indigo-500/40 blur-3xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                  <div>
                    <span className="ib-eyebrow text-indigo-200/80">Total balance</span>
                    <p className="ib-num text-[clamp(1.9rem,1.4rem+1.6vw,2.5rem)] font-bold mt-2 leading-none">
                      <AnimatedNumber value={1499560.5} format={(n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} duration={1400} />
                    </p>
                    <p className="text-sm text-indigo-200/80 mt-2">Savings · Current · Fixed deposit</p>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { icon: Send, label: 'Send' },
                      { icon: CreditCard, label: 'Pay bill' },
                      { icon: Landmark, label: 'Open FD' },
                    ].map((a) => {
                      const Icon = a.icon;
                      return (
                        <span key={a.label} className="flex flex-col items-center gap-1.5 w-[72px] py-3 rounded-2xl bg-white/[0.07] border border-white/10 text-[11px] font-semibold text-indigo-100">
                          <Icon className="w-4 h-4" /> {a.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* floating Zora chip */}
              <div className="ib-pop absolute -bottom-7 right-5 sm:right-8 max-w-[calc(100%-40px)] ib-card p-3 pr-4 flex items-center gap-3 shadow-[var(--shadow-md)]" style={{ animationDelay: '1100ms' }}>
                <ZoraMark size={36} />
                <span className="text-left">
                  <span className="text-xs font-bold text-slate-900 block">Zora · AI assistant</span>
                  <span className="text-xs text-slate-500 block">"Your card bill of ₹87,500 is due 05 Oct. Pay now?"</span>
                </span>
              </div>
            </div>

            <ul className="ib-fade-up grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 pt-6" style={{ animationDelay: '760ms' }}>
              {[
                { icon: Send, title: 'Instant transfers', desc: 'IMPS, UPI, NEFT and RTGS — 24x7, no charges.' },
                { icon: CreditCard, title: 'Pay bills your way', desc: 'Savings debit, any card, or a QR that opens on any phone.' },
                { icon: PhoneCall, title: 'Grievances, tracked', desc: 'Every complaint gets a ticket and a resolution under 24 hours.' },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.title} className="flex gap-3">
                    <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-[var(--shadow-xs)]">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span>
                      <span className="font-bold text-slate-900 text-sm block">{f.title}</span>
                      <span className="text-sm text-slate-500 leading-relaxed block mt-0.5">{f.desc}</span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 border-t border-slate-200/70 pt-5">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Landmark className="w-4 h-4 text-emerald-600" /> Deposits insured by DICGC up to ₹5 lakh
              </span>
              <span>CIN L65110MH1994PLC080801</span>
              <span>RBI licence B-1209/94</span>
            </div>
          </div>

          {/* Right: sign in */}
          <div className="lg:col-span-5 w-full lg:sticky lg:top-24 ib-fade-up" style={{ animationDelay: '300ms' }}>
            <div className="ib-card p-6 sm:p-8 shadow-[var(--shadow-md)]">
            {step === 'credentials' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
                  <p className="text-sm text-slate-500 mt-1">Use your registered email or NetBanking ID</p>
                </div>

                {/* Demo profiles */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-500">Demo customer</span>
                  <div className="grid grid-cols-3 gap-2">
                    {DEMO_PROFILES.map((p) => (
                      <button
                        key={p.email}
                        type="button"
                        onClick={() => {
                          setEmail(p.email);
                          setError('');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          email === p.email ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/15' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900 block truncate">{p.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{p.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>
                )}

                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="ib-label">
                      Email or NetBanking ID
                    </label>
                    <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@indiabank.com" className="ib-input" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="text-xs font-semibold text-slate-600">
                        Password
                      </label>
                      <span className="text-xs text-indigo-600 hover:underline cursor-pointer">Forgot password?</span>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="ib-input pr-10"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer" tabIndex={-1}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-300 accent-indigo-600" />
                    Remember me on this device
                  </label>

                  <button id="login-submit-btn" type="submit" disabled={isSubmitting} className="ib-btn-primary w-full py-3">
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Checking…
                      </>
                    ) : (
                      <>
                        Continue <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> 256-bit encrypted · Two-factor authentication
                </p>
              </div>
            ) : (
              <div className="space-y-6 ib-fade-up">
                <button type="button" onClick={() => setStep('credentials')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 cursor-pointer">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">Verify it's you</h2>
                    <p className="text-sm text-slate-500 truncate max-w-[260px]">Code sent to {email}</p>
                  </div>
                </div>

                {resendNotification && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{resendNotification}</div>}
                {otpError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{otpError}</div>}

                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all focus:outline-none ${
                          digit ? 'border-indigo-600 bg-indigo-50/40 text-slate-900' : 'border-slate-300 bg-white text-slate-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 text-center">Sandbox — any 6 digits are accepted.</p>
                </div>

                <button type="button" onClick={handleQuickFillOtp} className="ib-btn-secondary w-full text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Fill demo code (123456)
                </button>

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Didn't get a code?</span>
                  {resendCountdown > 0 ? (
                    <span className="text-slate-400 tabular-nums">Resend in {resendCountdown}s</span>
                  ) : (
                    <button type="button" onClick={handleResendOtp} className="text-indigo-600 font-semibold cursor-pointer inline-flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" /> Resend
                    </button>
                  )}
                </div>

                <button id="verify-otp-submit-btn" type="button" onClick={() => handleVerifyOtp()} disabled={isVerifyingOtp || otp.join('').length !== 6} className="ib-btn-primary w-full py-3">
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Verify & sign in
                    </>
                  )}
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
