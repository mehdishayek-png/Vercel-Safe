import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing stores
const storage = {};
global.localStorage = {
    getItem: vi.fn((key) => storage[key] || null),
    setItem: vi.fn((key, val) => { storage[key] = val; }),
    removeItem: vi.fn((key) => { delete storage[key]; }),
};

// Mock fetch
global.fetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));

import { useProfileStore } from '../stores/profile-store.js';
import { useSearchStore } from '../stores/search-store.js';
import { useJobsStore } from '../stores/jobs-store.js';

describe('profileStore', () => {
    beforeEach(() => {
        useProfileStore.setState({ profile: null, experienceYears: 0, jobTitle: '', whatIDo: '' });
    });

    it('sets profile with direct value', () => {
        useProfileStore.getState().setProfile({ name: 'Alice', skills: ['JS'] });
        expect(useProfileStore.getState().profile).toEqual({ name: 'Alice', skills: ['JS'] });
    });

    it('sets profile with function updater', () => {
        useProfileStore.getState().setProfile({ name: 'Alice', skills: ['JS'] });
        useProfileStore.getState().setProfile(prev => ({ ...prev, skills: [...prev.skills, 'React'] }));
        expect(useProfileStore.getState().profile.skills).toEqual(['JS', 'React']);
    });
});

describe('searchStore', () => {
    beforeEach(() => {
        useSearchStore.setState({ jobs: [], logs: [] });
    });

    it('sets jobs with direct value', () => {
        useSearchStore.getState().setJobs([{ title: 'SWE' }]);
        expect(useSearchStore.getState().jobs).toEqual([{ title: 'SWE' }]);
    });

    it('sets jobs with function updater', () => {
        useSearchStore.getState().setJobs([{ title: 'SWE' }]);
        useSearchStore.getState().setJobs(prev => [...prev, { title: 'PM' }]);
        expect(useSearchStore.getState().jobs).toHaveLength(2);
        expect(useSearchStore.getState().jobs[1].title).toBe('PM');
    });

    it('addLog appends with timestamp', () => {
        useSearchStore.getState().addLog('test message');
        const logs = useSearchStore.getState().logs;
        expect(logs).toHaveLength(1);
        expect(logs[0].message).toBe('test message');
        expect(logs[0].time).toBeDefined();
    });
});

describe('jobsStore', () => {
    beforeEach(() => {
        useJobsStore.setState({
            savedJobIds: new Set(),
            savedJobsData: [],
            appliedJobIds: new Set(),
            appliedJobsData: [],
        });
    });

    it('toggleSaveJob adds a job', () => {
        const job = { apply_url: 'https://example.com/job1', title: 'SWE' };
        useJobsStore.getState().toggleSaveJob(job);
        expect(useJobsStore.getState().savedJobIds.has('https://example.com/job1')).toBe(true);
        expect(useJobsStore.getState().savedJobsData).toHaveLength(1);
    });

    it('toggleSaveJob removes a saved job', () => {
        const job = { apply_url: 'https://example.com/job1', title: 'SWE' };
        useJobsStore.getState().toggleSaveJob(job); // add
        useJobsStore.getState().toggleSaveJob(job); // remove
        expect(useJobsStore.getState().savedJobIds.has('https://example.com/job1')).toBe(false);
        expect(useJobsStore.getState().savedJobsData).toHaveLength(0);
    });

    it('toggleAppliedJob adds with timestamp', () => {
        const job = { apply_url: 'https://example.com/job2', title: 'PM' };
        useJobsStore.getState().toggleAppliedJob(job);
        expect(useJobsStore.getState().appliedJobIds.has('https://example.com/job2')).toBe(true);
        expect(useJobsStore.getState().appliedJobsData[0].applied_at).toBeDefined();
    });
});
