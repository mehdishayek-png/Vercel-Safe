import { create } from 'zustand';

export const useJobsStore = create((set, get) => ({
    savedJobIds: new Set(),
    savedJobsData: [],
    appliedJobIds: new Set(),
    appliedJobsData: [],

    setSavedJobIds: (savedJobIds) => set({ savedJobIds }),
    setSavedJobsData: (savedJobsData) => set({ savedJobsData }),
    setAppliedJobIds: (appliedJobIds) => set({ appliedJobIds }),
    setAppliedJobsData: (appliedJobsData) => set({ appliedJobsData }),

    toggleSaveJob: (job) => {
        const { savedJobIds, savedJobsData } = get();
        const jobId = job.apply_url;
        const isSaving = !savedJobIds.has(jobId);

        const nextIds = new Set(savedJobIds);
        if (isSaving) nextIds.add(jobId);
        else nextIds.delete(jobId);

        const nextData = isSaving
            ? [...savedJobsData, job]
            : savedJobsData.filter(j => j.apply_url !== jobId);

        set({ savedJobIds: nextIds, savedJobsData: nextData });

        localStorage.setItem('midas_saved_jobs', JSON.stringify(nextData.map(j => j.apply_url)));
        localStorage.setItem('midas_saved_jobs_data', JSON.stringify(nextData));

        fetch('/api/saved-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job, action: isSaving ? 'save' : 'unsave' }),
        }).catch(() => {});
    },

    toggleAppliedJob: (job) => {
        const { appliedJobIds, appliedJobsData } = get();
        const jobId = job.apply_url;
        const isApplying = !appliedJobIds.has(jobId);

        const nextIds = new Set(appliedJobIds);
        if (isApplying) nextIds.add(jobId);
        else nextIds.delete(jobId);

        const nextData = isApplying
            ? [...appliedJobsData, { ...job, applied_at: new Date().toISOString() }]
            : appliedJobsData.filter(j => j.apply_url !== jobId);

        set({ appliedJobIds: nextIds, appliedJobsData: nextData });

        localStorage.setItem('midas_applied_jobs', JSON.stringify(nextData.map(j => j.apply_url)));
        localStorage.setItem('midas_applied_jobs_data', JSON.stringify(nextData));

        fetch('/api/saved-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job, action: isApplying ? 'apply' : 'unapply', type: 'applied' }),
        }).catch(() => {});
    },

    // Called once on mount
    init: async () => {
        // Load saved jobs (server-first, localStorage fallback)
        try {
            const res = await fetch('/api/saved-jobs');
            if (res.ok) {
                const data = await res.json();
                if (data.source === 'server' && data.jobs.length > 0) {
                    set({
                        savedJobsData: data.jobs,
                        savedJobIds: new Set(data.jobs.map(j => j.apply_url)),
                    });
                    localStorage.setItem('midas_saved_jobs', JSON.stringify(data.jobs.map(j => j.apply_url)));
                    localStorage.setItem('midas_saved_jobs_data', JSON.stringify(data.jobs));
                    // Still load applied from localStorage
                    loadAppliedFromLocal();
                    return;
                }
            }
        } catch {}

        // Fallback: load saved from localStorage
        try {
            const saved = localStorage.getItem('midas_saved_jobs');
            if (saved) set({ savedJobIds: new Set(JSON.parse(saved)) });
            const savedData = localStorage.getItem('midas_saved_jobs_data');
            if (savedData) set({ savedJobsData: JSON.parse(savedData) });
        } catch { set({ savedJobIds: new Set(), savedJobsData: [] }); }

        loadAppliedFromLocal();
    },
}));

function loadAppliedFromLocal() {
    try {
        const applied = localStorage.getItem('midas_applied_jobs');
        if (applied) useJobsStore.setState({ appliedJobIds: new Set(JSON.parse(applied)) });
        const appliedData = localStorage.getItem('midas_applied_jobs_data');
        if (appliedData) useJobsStore.setState({ appliedJobsData: JSON.parse(appliedData) });
    } catch {
        useJobsStore.setState({ appliedJobIds: new Set(), appliedJobsData: [] });
    }
}
