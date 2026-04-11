import { create } from 'zustand';

const FREE_DAILY_SCANS = 5;
const FREE_VISIBLE_JOBS = 100;

export const useTokenStore = create((set, get) => ({
    tokenBalance: 0,
    dailyScanCount: 0,
    weeklyMidasScanCount: 0,
    isAdminUser: false,
    tokensLoading: true,

    FREE_DAILY_SCANS,
    FREE_VISIBLE_JOBS,

    freeScansRemaining: FREE_DAILY_SCANS,

    setTokenBalance: (tokenBalance) => set({ tokenBalance }),
    setDailyScanCount: (dailyScanCount) => set({
        dailyScanCount,
        freeScansRemaining: Math.max(0, FREE_DAILY_SCANS - dailyScanCount),
    }),

    refreshTokens: async () => {
        try {
            const res = await fetch('/api/tokens');
            const data = await res.json();
            if (data.source !== 'anonymous' && data.source !== 'local') {
                set({
                    tokenBalance: data.tokens,
                    dailyScanCount: data.dailyScansUsed,
                    weeklyMidasScanCount: data.weeklyMidasScansUsed || 0,
                    tokensLoading: false,
                    freeScansRemaining: Math.max(0, FREE_DAILY_SCANS - data.dailyScansUsed),
                });
                if (data.isAdmin) set({ isAdminUser: true });
                localStorage.setItem('midas_tokens', data.tokens.toString());
            } else {
                set({
                    tokenBalance: parseInt(localStorage.getItem('midas_tokens') || '0', 10),
                    tokensLoading: false,
                });
            }
        } catch {
            set({
                tokenBalance: parseInt(localStorage.getItem('midas_tokens') || '0', 10),
                tokensLoading: false,
            });
        }
    },

    // Called once on mount
    init: async () => {
        await get().refreshTokens();
    },
}));
