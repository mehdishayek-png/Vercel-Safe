'use client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useProfileStore } from '../stores/profile-store';
import { useSearchStore } from '../stores/search-store';
import { useJobsStore } from '../stores/jobs-store';
import { useTokenStore } from '../stores/token-store';

/**
 * AppProvider — thin initializer that hydrates Zustand stores on mount.
 * No React context or state lives here anymore.
 * State is consumed via individual store hooks (useProfileStore, useSearchStore, etc.)
 */
export function AppProvider({ children }) {
    const { isSignedIn } = useAuth();
    const initialized = useRef(false);

    // One-time initialization
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        useProfileStore.getState().init();
        useSearchStore.getState().init();
        useJobsStore.getState().init();
        useTokenStore.getState().init();

        // Send welcome email on first visit
        try {
            const welcomeSent = localStorage.getItem('midas_welcome_sent');
            if (!welcomeSent && isSignedIn) {
                setTimeout(() => {
                    fetch('/api/email/welcome', { method: 'POST' })
                        .then(res => { if (res.ok) localStorage.setItem('midas_welcome_sent', 'true'); })
                        .catch(() => {});
                }, 3000);
            }
        } catch {}
    }, []);

    // Persist profile changes
    const profile = useProfileStore(s => s.profile);
    const experienceYears = useProfileStore(s => s.experienceYears);
    const jobTitle = useProfileStore(s => s.jobTitle);
    const whatIDo = useProfileStore(s => s.whatIDo);

    useEffect(() => {
        if (profile) useProfileStore.getState().persistProfile();
    }, [profile, experienceYears, jobTitle]);

    useEffect(() => {
        if (whatIDo) useProfileStore.getState().persistWhatIDo();
    }, [whatIDo]);

    // Persist preferences
    const preferences = useSearchStore(s => s.preferences);
    useEffect(() => {
        if (preferences.country) useSearchStore.getState().persistPreferences();
    }, [preferences]);

    // Persist job results
    const jobs = useSearchStore(s => s.jobs);
    const isMatching = useSearchStore(s => s.isMatching);
    useEffect(() => {
        if (jobs.length > 0 && !isMatching) useSearchStore.getState().persistJobs();
    }, [jobs, isMatching]);

    // Location cascading on preference changes
    const isInitialMount = useRef(true);
    useEffect(() => {
        if (!isInitialMount.current && preferences.country) {
            useSearchStore.getState().updateLocationCascade(true, false);
            useSearchStore.getState().setPreferences(prev => ({ ...prev, state: '', city: '' }));
        }
    }, [preferences.country]);

    useEffect(() => {
        if (!isInitialMount.current && preferences.state) {
            useSearchStore.getState().updateLocationCascade(false, true);
            useSearchStore.getState().setPreferences(prev => ({ ...prev, city: '' }));
        }
        if (isInitialMount.current) isInitialMount.current = false;
    }, [preferences.state]);

    return children;
}
