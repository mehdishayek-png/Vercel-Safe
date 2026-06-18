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

        // Pull the server-persisted profile (cross-device source of truth).
        // Fire-and-forget: localStorage already populated state above; this
        // overwrites with the server copy when available.
        get().loadFromServer();
    },

    // Hydrate from the server-persisted profile, if the user is signed in and
    // a record exists. Falls back silently to the localStorage copy otherwise.
    loadFromServer: async () => {
        try {
            const res = await fetch('/api/profile', { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            const p = data?.profile;
            if (p && typeof p === 'object') {
                set({ profile: p });
                if (p.experience_years != null) set({ experienceYears: p.experience_years });
                if (p.headline) set({ jobTitle: p.headline });
                if (p.whatIDo) set({ whatIDo: p.whatIDo });
            }
        } catch {}
    },

    // Push the current profile to the server (best-effort).
    saveToServer: () => {
        const { profile, experienceYears, jobTitle, whatIDo } = get();
        if (!profile) return;
        const payload = { ...profile, experience_years: experienceYears, headline: jobTitle, whatIDo };
        try {
            fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile: payload }),
            }).catch(() => {});
        } catch {}
    },

    // Persist profile to localStorage + server
    persistProfile: () => {
        const { profile, experienceYears, jobTitle } = get();
        if (profile) {
            try {
                const profileToSave = { ...profile, experience_years: experienceYears, headline: jobTitle };
                localStorage.setItem('midas_profile', JSON.stringify(profileToSave));
            } catch {}
            get().saveToServer();
        }
    },

    // Persist whatIDo to localStorage + server
    persistWhatIDo: () => {
        const { whatIDo } = get();
        if (whatIDo) {
            try { localStorage.setItem('midas_what_i_do', whatIDo); } catch {}
            get().saveToServer();
        }
    },
}));
