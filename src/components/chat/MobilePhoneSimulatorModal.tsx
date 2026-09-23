import React from 'react';
import { X, Smartphone, Wifi, Battery, Signal, Camera } from 'lucide-react';
import { PaymentGatewayView } from '../views/PaymentGatewayView';
import { PaymentSession, CoreCreditCard } from '../../types';

interface MobilePhoneSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  txnId: string;
  onPaymentSuccess?: (session: PaymentSession, card: CoreCreditCard) => void;
}

export const MobilePhoneSimulatorModal: React.FC<MobilePhoneSimulatorModalProps> = ({
  isOpen,
  onClose,
  txnId,
  onPaymentSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 sm:-right-10 z-20 w-8 h-8 rounded-full bg-white text-slate-800 hover:bg-slate-200 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
          title="Close Simulator"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Outer Phone Bezel / Chassis (iPhone / High-end smartphone style) */}
        <div className="w-[380px] max-w-[calc(100vw-24px)] h-[680px] max-h-[calc(100vh-48px)] bg-slate-900 rounded-[48px] p-3.5 shadow-2xl border-4 border-slate-700/80 flex flex-col relative overflow-hidden ring-1 ring-white/20">
          {/* Top Speaker / Dynamic Island */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-28 h-6 bg-black rounded-full flex items-center justify-end px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80 border border-slate-700 mr-1" />
          </div>

          {/* Status Bar */}
          <div className="h-6 w-full flex items-center justify-between px-6 pt-1 text-[11px] text-white/90 z-20 font-semibold select-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5 text-white/90">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Browser Address Bar inside Phone */}
          <div className="px-3 py-1.5 bg-slate-950 text-slate-400 text-[10px] flex items-center gap-1.5 border-b border-slate-800 z-10">
            <div className="flex-1 bg-slate-900 text-slate-300 px-2.5 py-1 rounded-full flex items-center justify-between font-mono">
              <span className="truncate">indiabank.in/gateway/pay?txnId={txnId}</span>
              <span className="text-emerald-400 text-[9px] font-bold">🔒 SSL</span>
            </div>
          </div>

          {/* Phone Screen Viewport */}
          <div className="flex-1 rounded-b-[36px] overflow-y-auto bg-slate-900 relative">
            <PaymentGatewayView
              initialTxnId={txnId}
              isEmbedded={true}
              onPaymentCompleted={(session, card) => {
                if (onPaymentSuccess) {
                  onPaymentSuccess(session, card);
                }
              }}
              onClose={onClose}
            />
          </div>

          {/* Home Indicator Bar */}
          <div className="w-full flex justify-center py-1">
            <div className="w-32 h-1 bg-white/40 rounded-full" />
          </div>
        </div>

        {/* Badge Explaining the Simulation */}
        <div className="mt-2.5 px-3 py-1 bg-slate-900/90 border border-slate-700 rounded-full text-slate-300 text-[11px] flex items-center gap-2 shadow-sm">
          <Camera className="w-3.5 h-3.5 text-amber-300" />
          <span>Simulated Phone Camera Scan Viewport</span>
        </div>
      </div>
    </div>
  );
};
