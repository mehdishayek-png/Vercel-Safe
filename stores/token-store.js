import { create } from 'zustand';

export const useTokenStore = create((set, get) => ({
    tokenBalance: 0,
    isAdminUser: false,
    tokensLoading: true,
    sessionBurn: 0,

    isPurchaseModalOpen: false,

    openPurchaseModal: () => set({ isPurchaseModalOpen: true }),
    closePurchaseModal: () => set({ isPurchaseModalOpen: false }),

    setSessionBurn: (sessionBurn) => set({ sessionBurn }),
    setTokenBalance: (tokenBalance) => set({ tokenBalance }),


    refreshTokens: async () => {
        try {
            const res = await fetch('/api/tokens');
            const data = await res.json();
            if (data.source !== 'anonymous' && data.source !== 'local') {
                set({
                    tokenBalance: data.tokens,
                    tokensLoading: false,
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
