import React, { useState } from 'react';
import {
  ArrowLeft,
  PhoneCall,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  ChevronDown,
  Printer,
  Sparkles,
  Building2,
  Mail,
  RefreshCw
} from 'lucide-react';
import { UserSession, ComplaintTicket } from '../types';
import { COMPLAINT_PRODUCT_TYPES } from '../data/mockData';
import { ZoraMark } from './ui/Primitives';

interface ComplaintViewProps {
  user: UserSession;
  onReturnToDashboard: () => void;
  onTicketCreated: (ticket: ComplaintTicket) => void;
  recentTickets?: ComplaintTicket[];
}

export const ComplaintView: React.FC<ComplaintViewProps> = ({
  user,
  onReturnToDashboard,
  onTicketCreated,
  recentTickets = [],
}) => {
  // Form states
  const [productType, setProductType] = useState<string>('Cheque Book');
  const [accountNumber, setAccountNumber] = useState<string>('AC1000234567');
  const [senderEmail, setSenderEmail] = useState<string>(user.email);
  const [complaintDetails, setComplaintDetails] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'lodge' | 'escalation'>('lodge');

  // Loading & Submission states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submissionTime, setSubmissionTime] = useState<string>('');

  // Submit Complaint Handler: Sends POST to /api/complaint/submit as before
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!complaintDetails.trim()) {
      setError('Please describe your grievance or request particulars.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/complaint/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: senderEmail || user.email,
          from: senderEmail || user.email,
          productType: productType,
          complaintDetails: complaintDetails.trim(),
          body: complaintDetails.trim(),
          accountNumber: accountNumber,
          subject: `Account Number = ${accountNumber}`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit grievance. Please try again.');
      }

      const now = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      // Reference ID for logging/audit behind the scenes
      const generatedRefId = data.trace_id
        ? `IB-CR-${data.trace_id.slice(0, 6).toUpperCase()}`
        : `IB-CR-${Math.floor(10000 + Math.random() * 90000)}`;

      setSubmissionTime(now);
      setIsSuccess(true);

      const newTicket: ComplaintTicket = {
        traceId: data.trace_id || generatedRefId,
        ticketId: generatedRefId,
        productType,
        details: complaintDetails.trim(),
        email: senderEmail || user.email,
        timestamp: now,
        status: 'Under Review',
        estimatedResolution: 'Within 24 business hours',
        isLiveApi: true,
      };

      onTicketCreated(newTicket);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'An unexpected error occurred while communicating with the bank resolution gateway.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setComplaintDetails('');
    setError('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToDashboard}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Customer Care &amp; Redressal
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">India Bank Helpdesk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
              Customer Support &amp; Grievance Portal
            </h1>
          </div>
        </div>

        {/* Priority Helpdesk Helpline Badge */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              24x7 Customer Helpline
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              1800 202 6161 <span className="text-xs text-slate-400 font-sans font-normal">(Toll Free)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-slate-100 p-1 rounded-xl flex flex-wrap gap-1 border border-slate-200 text-xs sm:text-sm font-medium">
        <button
          onClick={() => setActiveTab('lodge')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer font-semibold ${
            activeTab === 'lodge'
              ? 'bg-white text-indigo-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Lodge a Complaint</span>
        </button>

        <button
          onClick={() => setActiveTab('escalation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all cursor-pointer font-semibold ${
            activeTab === 'escalation'
              ? 'bg-white text-indigo-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Escalation Matrix &amp; Helpline</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LODGE A COMPLAINT / SUBMISSION FORM & DIRECT CONFIRMATION          */}
      {/* ========================================================================= */}
      {activeTab === 'lodge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {!isSuccess ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Register Grievance / Service Request
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submit your issue directly to India Bank's Central Grievance Redressal Cell.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Turnaround: &lt; 24 Hours
                  </span>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-red-800">Notice: </span>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Account Summary Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                        Debited / Associated Account
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {accountNumber}
                      </span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">
                        Primary Savings Account • Available Bal: ₹1,42,850.00
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                        Registered Customer Contact
                      </span>
                      <span className="font-medium text-slate-900 text-sm block truncate">
                        {senderEmail}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        SMS notification to +91 98765 43210
                      </span>
                    </div>
                  </div>

                  {/* Product / Service Category */}
                  <div>
                    <label
                      htmlFor="complaint-product-select"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Product / Service Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="complaint-product-select"
                        value={productType}
                        onChange={(e) => setProductType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-indigo-600 appearance-none font-medium pr-10 cursor-pointer shadow-2xs"
                      >
                        {COMPLAINT_PRODUCT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Select the banking service related to your issue (e.g. Cheque Book, Debit Card, Net Banking).
                    </p>
                  </div>

                  {/* Grievance Description */}
                  <div>
                    <label
                      htmlFor="complaint-details-textarea"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Grievance Particulars &amp; Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="complaint-details-textarea"
                      rows={4}
                      value={complaintDetails}
                      onChange={(e) => setComplaintDetails(e.target.value)}
                      placeholder="Please clearly describe your grievance (e.g., Cheque book requested 10 days ago for account AC1000234567, still not delivered; or unauthorized charge on debit card)..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-indigo-600 font-normal shadow-2xs leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>Please avoid sharing confidential passwords or ATM PINs.</span>
                      <span>{complaintDetails.length} characters</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Protected under RBI Customer Protection Framework</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !complaintDetails.trim()}
                      className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Complaint...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit Grievance</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ========================================================================= */
              /* SUCCESS STATE: "Your complaint has been received. You will receive a     */
              /* response by our team as soon as possible."                                */
              /* ========================================================================= */
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn text-left">
                {/* Reassuring Official Confirmation Banner */}
                <div className="p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Grievance Registered Successfully
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      Your complaint has been registered.
                    </h2>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      You will receive an email regarding the complaint updates. You will also receive your official complaint ticket ID in the same email.
                    </p>
                  </div>
                </div>

                {/* Complaint Summary & Notification Dispatch Details */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Product / Service Category
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-1 block">
                        {productType}
                      </span>
                      <span className="text-xs text-slate-500">
                        Account: {accountNumber}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Status
                      </span>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                          Registered • Under Review
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mail & Update Notification Card */}
                  <div className="p-4 rounded-xl bg-white border border-indigo-100 shadow-2xs space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-slate-900">
                          Email Confirmation &amp; Ticket ID On Its Way
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                          A confirmation email is being sent to <strong className="text-slate-900">{senderEmail}</strong> with your assigned <strong className="text-slate-900">Complaint Ticket ID</strong> and regular progress updates.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Logged at: <strong>{submissionTime}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>Expected resolution: <strong>Within 24 business hours</strong></span>
                    </div>
                  </div>
                </div>

                {/* Reassurance Guidance */}
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1 leading-relaxed">
                  <p className="font-semibold text-indigo-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    What happens next?
                  </p>
                  <p className="text-indigo-900/80">
                    Our dedicated customer redressal officer has been assigned to investigate your complaint particulars. You will receive an email regarding the complaint updates along with your ticket ID. You do not need to take any further steps.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Acknowledgment Receipt</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl cursor-pointer transition-colors"
                    >
                      Lodge Another Complaint
                    </button>
                    <button
                      type="button"
                      onClick={onReturnToDashboard}
                      className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer transition-colors shadow-xs"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Support Helpline & Charter */}
          <div className="lg:col-span-4 space-y-5">
            {/* Bank Commitment Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Bank Service Commitment
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">Instant Ticket Generation</span>
                    <span className="text-slate-500 text-[11px]">
                      A unique complaint reference is logged immediately in bank records.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">Fast Response Guarantee</span>
                    <span className="text-slate-500 text-[11px]">
                      Dedicated resolution team reviews and responds to your issue promptly.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">SMS &amp; Email Updates</span>
                    <span className="text-slate-500 text-[11px]">
                      Timely status notifications sent to your registered contact channels.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Instant Product Answers? Ask Zora */}
            <div className="bg-gradient-to-br from-indigo-700 to-violet-800 text-white rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <ZoraMark size={40} />
                <div>
                  <h4 className="text-sm font-bold text-white">Quick answers from Zora</h4>
                  <p className="text-xs text-indigo-200">24x7 AI assistant</p>
                </div>
              </div>
              <p className="text-sm text-indigo-100 leading-relaxed">
                How to apply for a card, block a lost card, FD rates, transfer limits — ask Zora and get an instant answer.
              </p>
              <p className="text-xs text-indigo-200 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Use the <strong>Ask Zora</strong> button at the bottom right.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ESCALATION MATRIX & HELPLINE                                       */}
      {/* ========================================================================= */}
      {activeTab === 'escalation' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6 animate-fadeIn text-left">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Customer Grievance Redressal Escalation Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured multi-tier redressal under Reserve Bank of India (RBI) guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Level 1 */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Level 1: Branch / Portal Desk</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                First touchpoint for all retail banking services, cheque books, and debit cards.
              </p>
              <div className="pt-2 border-t border-slate-200 text-xs space-y-1 text-slate-700 font-medium">
                <div>Phone: <strong>1800 202 6161</strong> (Toll Free)</div>
                <div>Turnaround: <strong>&lt; 24 - 48 Hours</strong></div>
              </div>
            </div>

            {/* Level 2 */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Level 2: Principal Nodal Officer</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If your grievance is not resolved to your satisfaction within 7 business days at Level 1.
              </p>
              <div className="pt-2 border-t border-slate-200 text-xs space-y-1 text-slate-700 font-medium">
                <div>Email: <strong>nodal.officer@indiabank.co.in</strong></div>
                <div>Turnaround: <strong>Up to 5 Business Days</strong></div>
              </div>
            </div>

            {/* Level 3 */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Level 3: RBI Ombudsman</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Integrated Banking Ombudsman Scheme governed by the Reserve Bank of India.
              </p>
              <div className="pt-2 border-t border-slate-200 text-xs space-y-1 text-slate-700 font-medium">
                <div>Portal: <strong>cms.rbi.org.in</strong></div>
                <div>Toll Free: <strong>14448</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
