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
        <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-200">
            <div>
                <div className="text-xs font-semibold text-violet-600">Need more Deep Scans?</div>
                <div className="text-[11px] text-violet-400">50 tokens &middot; &#8377;399</div>
            </div>
            {!isAdminUser && (
                <button
                    onClick={initiatePayment}
                    disabled={isPaymentProcessing}
                    className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPaymentProcessing ? 'Processing...' : 'Get Tokens'}
                </button>
            )}
        </div>
    );
}
