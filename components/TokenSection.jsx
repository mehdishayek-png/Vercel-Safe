import { Sparkles } from 'lucide-react';

export function TokenSection({
    tokenBalance,
    dailyScanCount,
    freeDailyScans,
    isAdminUser,
    initiatePayment,
    isPaymentProcessing,
}) {
    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Midas Tokens
                </div>
                <div className="text-2xl font-black text-indigo-600">{tokenBalance}</div>
            </div>
            <div className="text-[11px] text-indigo-500 mb-3">
                {isAdminUser ? 'Unlimited access (Admin)' :
                    dailyScanCount < freeDailyScans
                        ? `${freeDailyScans - dailyScanCount} free scans remaining today`
                        : tokenBalance > 0
                            ? `${tokenBalance} tokens remaining`
                            : 'No tokens — purchase to unlock full features'}
            </div>
            {(!isAdminUser && (tokenBalance > 0 || dailyScanCount >= freeDailyScans)) && (
                <button
                    onClick={initiatePayment}
                    disabled={isPaymentProcessing}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPaymentProcessing ? 'Processing...' : 'Get 50 Tokens — ₹399'}
                </button>
            )}
        </div>
    );
}
