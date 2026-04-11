import { create } from 'zustand';

export const useJobsStore = create((set, get) => ({
    savedJobIds: new Set(),
    savedJobsData: [],
    appliedJobIds: new Set(),
    appliedJobsData: [],
    jobActionError: null,

    setSavedJobIds: (savedJobIds) => set({ savedJobIds }),
    setSavedJobsData: (savedJobsData) => set({ savedJobsData }),
    setAppliedJobIds: (appliedJobIds) => set({ appliedJobIds }),
    setAppliedJobsData: (appliedJobsData) => set({ appliedJobsData }),
    clearJobActionError: () => set({ jobActionError: null }),

    toggleSaveJob: (job) => {
        const { savedJobIds, savedJobsData } = get();
        const jobId = job.apply_url;
        const isSaving = !savedJobIds.has(jobId);

        // Capture previous state for rollback
        const prevIds = savedJobIds;
        const prevData = savedJobsData;

        const nextIds = new Set(savedJobIds);
        if (isSaving) nextIds.add(jobId);
        else nextIds.delete(jobId);

        const nextData = isSaving
            ? [...savedJobsData, job]
            : savedJobsData.filter(j => j.apply_url !== jobId);

        // Optimistic update
        set({ savedJobIds: nextIds, savedJobsData: nextData, jobActionError: null });
        localStorage.setItem('midas_saved_jobs', JSON.stringify(nextData.map(j => j.apply_url)));
        localStorage.setItem('midas_saved_jobs_data', JSON.stringify(nextData));

        fetch('/api/saved-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job, action: isSaving ? 'save' : 'unsave' }),
        }).then(res => {
            if (!res.ok) throw new Error('Server error');
        }).catch(() => {
            // Rollback optimistic update
            set({ savedJobIds: prevIds, savedJobsData: prevData, jobActionError: 'Failed to save job. Please try again.' });
            localStorage.setItem('midas_saved_jobs', JSON.stringify(prevData.map(j => j.apply_url)));
            localStorage.setItem('midas_saved_jobs_data', JSON.stringify(prevData));
        });
    },

    toggleAppliedJob: (job) => {
        const { appliedJobIds, appliedJobsData } = get();
        const jobId = job.apply_url;
        const isApplying = !appliedJobIds.has(jobId);

        // Capture previous state for rollback
        const prevIds = appliedJobIds;
        const prevData = appliedJobsData;

        const nextIds = new Set(appliedJobIds);
        if (isApplying) nextIds.add(jobId);
        else nextIds.delete(jobId);

        const nextData = isApplying
            ? [...appliedJobsData, { ...job, applied_at: new Date().toISOString() }]
            : appliedJobsData.filter(j => j.apply_url !== jobId);

        // Optimistic update
        set({ appliedJobIds: nextIds, appliedJobsData: nextData, jobActionError: null });
        localStorage.setItem('midas_applied_jobs', JSON.stringify(nextData.map(j => j.apply_url)));
        localStorage.setItem('midas_applied_jobs_data', JSON.stringify(nextData));

        fetch('/api/saved-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job, action: isApplying ? 'apply' : 'unapply', type: 'applied' }),
        }).then(res => {
            if (!res.ok) throw new Error('Server error');
        }).catch(() => {
            // Rollback optimistic update
            set({ appliedJobIds: prevIds, appliedJobsData: prevData, jobActionError: 'Failed to mark job as applied. Please try again.' });
            localStorage.setItem('midas_applied_jobs', JSON.stringify(prevData.map(j => j.apply_url)));
            localStorage.setItem('midas_applied_jobs_data', JSON.stringify(prevData));
        });
    },

    // Called once on mount — server-first for both saved and applied, localStorage fallback
    init: async () => {
        const [savedResult, appliedResult] = await Promise.allSettled([
            fetch('/api/saved-jobs').then(r => r.ok ? r.json() : null),
            fetch('/api/saved-jobs?type=applied').then(r => r.ok ? r.json() : null),
        ]);

        const savedData = savedResult.status === 'fulfilled' && savedResult.value?.source === 'server'
            ? savedResult.value.jobs : null;
        const appliedData = appliedResult.status === 'fulfilled' && appliedResult.value?.source === 'server'
            ? appliedResult.value.jobs : null;

        if (savedData) {
            set({ savedJobsData: savedData, savedJobIds: new Set(savedData.map(j => j.apply_url)) });
            localStorage.setItem('midas_saved_jobs', JSON.stringify(savedData.map(j => j.apply_url)));
            localStorage.setItem('midas_saved_jobs_data', JSON.stringify(savedData));
        } else {
            loadFromLocal('saved');
        }

        if (appliedData) {
            set({ appliedJobsData: appliedData, appliedJobIds: new Set(appliedData.map(j => j.apply_url)) });
            localStorage.setItem('midas_applied_jobs', JSON.stringify(appliedData.map(j => j.apply_url)));
            localStorage.setItem('midas_applied_jobs_data', JSON.stringify(appliedData));
        } else {
            loadFromLocal('applied');
        }
    },
}));

function loadFromLocal(type) {
    try {
        if (type === 'saved') {
            const ids = localStorage.getItem('midas_saved_jobs');
            const data = localStorage.getItem('midas_saved_jobs_data');
            if (ids) useJobsStore.setState({ savedJobIds: new Set(JSON.parse(ids)) });
            if (data) useJobsStore.setState({ savedJobsData: JSON.parse(data) });
        } else {
            const ids = localStorage.getItem('midas_applied_jobs');
            const data = localStorage.getItem('midas_applied_jobs_data');
            if (ids) useJobsStore.setState({ appliedJobIds: new Set(JSON.parse(ids)) });
            if (data) useJobsStore.setState({ appliedJobsData: JSON.parse(data) });
        }
    } catch {
        if (type === 'saved') useJobsStore.setState({ savedJobIds: new Set(), savedJobsData: [] });
        else useJobsStore.setState({ appliedJobIds: new Set(), appliedJobsData: [] });
    }
}
