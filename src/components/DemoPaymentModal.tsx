import React, { useState } from 'react';
import { api } from '../services/api.ts';
import { ShieldAlert, CheckCircle2, AlertOctagon, X, CreditCard, Smartphone, Lock } from 'lucide-react';

interface DemoPaymentModalProps {
  amount: number;
  restaurantName: string;
  onPaymentSuccess: (transactionReference: string) => void;
  onPaymentFailure: (errorReason: string) => void;
  onClose: () => void;
}

export const DemoPaymentModal: React.FC<DemoPaymentModalProps> = ({
  amount,
  restaurantName,
  onPaymentSuccess,
  onPaymentFailure,
  onClose,
}) => {
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('student@okcampus');

  const handleSimulatePayment = async (simulateFailure = false) => {
    try {
      setProcessing(true);
      const res = await api.processDemoPayment({
        amount,
        restaurantName,
        simulateFailure,
      });

      if (res.success && res.transactionReference) {
        onPaymentSuccess(res.transactionReference);
      } else {
        onPaymentFailure('Demo payment declined by bank simulator.');
      }
    } catch (err: any) {
      onPaymentFailure(err.message || 'Payment simulation failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Top Simulation Warning Banner */}
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b border-amber-600/20">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>DEMO PAYMENT GATEWAY &middot; NO REAL MONEY CHARGED</span>
        </div>

        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Simulated Campus Payment</h3>
            <p className="text-xs text-slate-500">Merchant: {restaurantName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Box */}
        <div className="p-5 bg-stone-50/80 border-b border-stone-100 text-center">
          <p className="text-xs font-medium text-slate-500">Total Payable Amount</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
            ₹{amount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Includes canteen taxes & food preparation charges</p>
        </div>

        {/* Simulated Method Selector */}
        <div className="p-5 space-y-4">
          <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('upi')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'upi'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              UPI Simulator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('card')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'card'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Card Simulator
            </button>
          </div>

          {activeTab === 'upi' ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Simulated Virtual Payment Address (VPA)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Any mock UPI handle can be used for demonstration.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Test Campus Debit Card
              </label>
              <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-slate-700">
                  <span>•••• •••• •••• 4242</span>
                  <span className="text-[11px] text-emerald-600 font-sans font-medium">Demo Ready</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>EXP: 12/28</span>
                  <span>CVV: •••</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              disabled={processing}
              onClick={() => handleSimulatePayment(false)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {processing ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Authorizing Demo Payment...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Simulate Successful Payment (Pay ₹{amount})
                </>
              )}
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={() => handleSimulatePayment(true)}
              className="w-full py-2 px-4 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 hover:border-rose-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
              Simulate Failed Payment (Test Bank Decline)
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={onClose}
              className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel and Return to Cart
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-stone-50 px-5 py-3 border-t border-stone-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>256-bit Simulated Sandbox &middot; Modular Razorpay Plug-in Ready</span>
        </div>
      </div>
    </div>
  );
};
