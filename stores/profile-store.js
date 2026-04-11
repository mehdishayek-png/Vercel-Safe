import { create } from 'zustand';

export const useProfileStore = create((set, get) => ({
    profile: null,
    experienceYears: 0,
    jobTitle: '',
    whatIDo: '',
    apiKeys: {},
    isParsing: false,
    fileInputRef: { current: null },

    setProfile: (updater) => {
        if (typeof updater === 'function') {
            set((state) => ({ profile: updater(state.profile) }));
        } else {
            set({ profile: updater });
        }
    },
    setExperienceYears: (experienceYears) => set({ experienceYears }),
    setJobTitle: (jobTitle) => set({ jobTitle }),
    setWhatIDo: (whatIDo) => set({ whatIDo }),
    setApiKeys: (apiKeys) => set({ apiKeys }),
    setIsParsing: (isParsing) => set({ isParsing }),

    // Called once on mount from AppProvider
    init: () => {
        try {
            const storedProfile = localStorage.getItem('midas_profile');
            if (storedProfile) {
                const parsed = JSON.parse(storedProfile);
                set({ profile: parsed });
                if (parsed.experience_years) set({ experienceYears: parsed.experience_years });
                if (parsed.headline) set({ jobTitle: parsed.headline });
            }
        } catch {}

        try {
            const storedWhatIDo = localStorage.getItem('midas_what_i_do');
            if (storedWhatIDo) set({ whatIDo: storedWhatIDo });
        } catch {}

        try {
            const stored = localStorage.getItem('midas_keys');
            if (stored) set({ apiKeys: JSON.parse(stored) });
        } catch {}
    },

    // Persist profile to localStorage
    persistProfile: () => {
        const { profile, experienceYears, jobTitle } = get();
        if (profile) {
            try {
                const profileToSave = { ...profile, experience_years: experienceYears, headline: jobTitle };
                localStorage.setItem('midas_profile', JSON.stringify(profileToSave));
            } catch {}
        }
    },

    // Persist whatIDo to localStorage
    persistWhatIDo: () => {
        const { whatIDo } = get();
        if (whatIDo) {
            try { localStorage.setItem('midas_what_i_do', whatIDo); } catch {}
        }
    },
}));
