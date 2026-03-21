export function TokenSection({
    tokenBalance,
    dailyScanCount,
    freeDailyScans,
    isAdminUser,
    initiatePayment,
    isPaymentProcessing,
}) {
    return (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-brand-50 border border-brand-100">
            <div>
                <div className="text-xs font-semibold text-brand-700">Need more scans?</div>
                <div className="text-[11px] text-brand-500">50 tokens &middot; &#8377;399</div>
            </div>
            {!isAdminUser && (
                <button
                    onClick={initiatePayment}
                    disabled={isPaymentProcessing}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isPaymentProcessing ? 'Processing...' : 'Get Tokens'}
                </button>
            )}
        </div>
    );
}
