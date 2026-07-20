'use client';
import { useState, useRef } from 'react';
import { useProfileStore } from '@/stores/profile-store';
import { useSearchStore } from '@/stores/search-store';
import { useJobsStore } from '@/stores/jobs-store';
import { useUser } from '@clerk/nextjs';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import {
    User, Briefcase, Tag, Plus, X, Globe, ToggleLeft, ToggleRight,
    Download, Trash2, Shield, CheckCircle, AlertTriangle, FileText,
    ChevronRight, Sparkles
} from 'lucide-react';

const LOCAL_DATA_PREFIXES = ['midas_', 'job_detail_', 'jobbot_'];
const LOCAL_DATA_KEYS = new Set(['print_cv_data']);

function clearLocalWorkspaceData() {
    const keys = [];
    for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (key) keys.push(key);
    }
    for (const key of keys) {
        if (LOCAL_DATA_KEYS.has(key) || LOCAL_DATA_PREFIXES.some((prefix) => key.startsWith(prefix))) {
            localStorage.removeItem(key);
        }
    }
}

function Toast({ message, tone = 'success', onClose }) {
    const isError = tone === 'error';
    return (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-gray-900/95 backdrop-blur-sm text-white text-[13px] px-5 py-3 rounded-2xl shadow-elevated animate-fade-in">
            {isError
                ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                : <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span className="font-medium">{message}</span>
            <button onClick={onClose} className="ml-1 text-gray-400 hover:text-white cursor-pointer transition-colors">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

function GlassCard({ children, className = '' }) {
    return (
        <div className={`glass-panel backdrop-blur-xl  rounded-2xl shadow-glass ${className}`}>
            {children}
        </div>
    );
}

function SectionHeader({ title, icon: Icon }) {
    return (
        <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-brand-500" />
            </div>
            <h2 className="text-[15px] font-headline font-bold text-gray-900">{title}</h2>
        </div>
    );
}

function FieldLabel({ children }) {
    return <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{children}</label>;
}

function TextInput({ value, onChange, placeholder, type = 'text', ...props }) {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3.5 py-2.5 text-[13px] text-gray-900 bg-surface-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-gray-300"
            {...props}
        />
    );
}

function SelectInput({ value, onChange, children }) {
    return (
        <select
            value={value}
            onChange={onChange}
            className="w-full px-3.5 py-2.5 text-[13px] text-gray-900 bg-surface-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none cursor-pointer"
        >
            {children}
        </select>
    );
}

export default function SettingsPage() {
    const { user } = useUser();
    const { profile, setProfile, experienceYears, setExperienceYears, jobTitle, setJobTitle, saveToServer } = useProfileStore();
    const { preferences, setPreferences, savePreferencesToServer } = useSearchStore();

    const [toast, setToast] = useState(null);
    const [skillInput, setSkillInput] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showDeleteResumeConfirm, setShowDeleteResumeConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const skillInputRef = useRef(null);

    const showToast = (message, tone = 'success') => {
        setToast({ message, tone });
        setTimeout(() => setToast(null), 3000);
    };

    // Profile field helpers
    const profileVal = (key) => profile?.[key] || '';
    const updateProfile = (key, value) => {
        setProfile(prev => prev ? { ...prev, [key]: value } : { [key]: value });
    };

    // Skills management
    const skills = profile?.skills || [];
    const addSkill = () => {
        const trimmed = skillInput.trim();
        if (!trimmed || skills.includes(trimmed)) return;
        updateProfile('skills', [...skills, trimmed]);
        setSkillInput('');
        skillInputRef.current?.focus();
    };
    const removeSkill = (skill) => {
        updateProfile('skills', skills.filter(s => s !== skill));
    };
    const handleSkillKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
        if (e.key === 'Backspace' && !skillInput && skills.length > 0) {
            removeSkill(skills[skills.length - 1]);
        }
    };

    // Save profile
    const handleSaveProfile = async () => {
        setPendingAction('profile');
        const result = await saveToServer();
        setPendingAction(null);
        showToast(result.success ? 'Profile saved across devices' : result.error, result.success ? 'success' : 'error');
    };

    // Save preferences
    const handleSavePreferences = async () => {
        setPendingAction('preferences');
        const result = await savePreferencesToServer();
        setPendingAction(null);
        showToast(result.success ? 'Preferences saved across devices' : result.error, result.success ? 'success' : 'error');
    };

    // Export data
    const handleExportData = async () => {
        setPendingAction('export');
        try {
            const res = await fetch('/api/account/data', { cache: 'no-store' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to export data.');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `midas-match-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Complete account data exported');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setPendingAction(null);
        }
    };

    // Clear all data
    const handleClearAllData = async () => {
        setPendingAction('clear');
        try {
            const res = await fetch('/api/account/data', { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to clear account data.');

            clearLocalWorkspaceData();
            useProfileStore.getState().reset();
            useSearchStore.getState().reset();
            useJobsStore.getState().reset();
            setShowClearConfirm(false);
            setPendingAction(null);
            showToast(data.cacheCleared === false
                ? 'Account data cleared; temporary cache records will expire automatically'
                : 'Account data cleared from the server and this device');
        } catch (error) {
            setPendingAction(null);
            showToast(error.message, 'error');
        }
    };

    // Delete resume text
    const handleDeleteResumeData = async () => {
        setPendingAction('resume');
        try {
            const res = await fetch('/api/profile', { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to delete resume data.');
            updateProfile('resume_text', '');
            setShowDeleteResumeConfirm(false);
            showToast('Resume text deleted from the server and this device');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setPendingAction(null);
        }
    };

    return (
        <div className="min-h-screen bg-surface-50/50">
            {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Page header */}
                <div className="mb-10">
                    <h1 className="text-[32px] font-headline font-bold text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-[14px] text-gray-400 mt-1 font-light">Fine-tune your profile, preferences, and account details</p>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* ---- Left column: Profile, Skills, Preferences (8 cols) ---- */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* ---- Profile Section ---- */}
                        <GlassCard className="p-6 sm:p-8">
                            <SectionHeader title="Profile" icon={User} />
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <FieldLabel>Full Name</FieldLabel>
                                        <TextInput
                                            value={profileVal('name')}
                                            onChange={(e) => updateProfile('name', e.target.value)}
                                            placeholder="Your full name"
                                        />
                                    </div>
                                    <div>
                                        <FieldLabel>Job Title / Headline</FieldLabel>
                                        <TextInput
                                            value={jobTitle}
                                            onChange={(e) => {
                                                setJobTitle(e.target.value);
                                                updateProfile('headline', e.target.value);
                                            }}
                                            placeholder="e.g. Senior Software Engineer"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div>
                                        <FieldLabel>Experience (years)</FieldLabel>
                                        <TextInput
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={experienceYears}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setExperienceYears(val);
                                                updateProfile('experience_years', val);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <FieldLabel>Location</FieldLabel>
                                        <TextInput
                                            value={profileVal('location')}
                                            onChange={(e) => updateProfile('location', e.target.value)}
                                            placeholder="e.g. San Francisco, CA"
                                        />
                                    </div>
                                    <div>
                                        <FieldLabel>Industry</FieldLabel>
                                        <TextInput
                                            value={profileVal('industry')}
                                            onChange={(e) => updateProfile('industry', e.target.value)}
                                            placeholder="e.g. Technology"
                                        />
                                    </div>
                                </div>



                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={Boolean(pendingAction)}
                                        className="px-5 py-2.5 text-[13px] font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all shadow-button hover:shadow-card cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {pendingAction === 'profile' ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>
                        </GlassCard>

                        {/* ---- Skills Section ---- */}
                        <GlassCard className="p-6 sm:p-8">
                            <SectionHeader title="Skills" icon={Tag} />
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 rounded-full text-[12px] font-semibold text-brand-600 group transition-all hover:bg-brand-100"
                                        >
                                            {skill}
                                            <button
                                                onClick={() => removeSkill(skill)}
                                                className="text-brand-300 hover:text-red-400 transition-colors cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <button
                                        onClick={() => skillInputRef.current?.focus()}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-brand-300 rounded-full text-[12px] font-medium text-brand-500 hover:bg-brand-50 transition-all cursor-pointer"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Skill
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        ref={skillInputRef}
                                        type="text"
                                        value={skillInput}
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyDown={handleSkillKeyDown}
                                        placeholder={skills.length === 0 ? 'Type a skill and press Enter' : 'Add more skills...'}
                                        className="w-full px-3.5 py-2.5 text-[13px] bg-surface-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-gray-300"
                                    />
                                </div>

                                <p className="text-[11px] text-gray-300">Press Enter to add, Backspace to remove last</p>

                                {/* AI Suggestion hint */}
                                {skills.length > 0 && skills.length < 8 && (
                                    <div className="flex items-start gap-3 p-3.5 bg-accent-50/60 rounded-xl">
                                        <Sparkles className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                                        <p className="text-[12px] text-accent-600 leading-relaxed">
                                            Adding <span className="font-semibold">2-3 more skills</span> could improve your match accuracy by up to <span className="font-semibold">18%</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        {/* ---- Search Preferences Section ---- */}
                        <GlassCard className="p-6 sm:p-8">
                            <SectionHeader title="Search Preferences" icon={Globe} />
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 gap-5">
                                    <div>
                                        <FieldLabel>Target Location</FieldLabel>
                                        <LocationAutocomplete
                                            value={preferences.location || ''}
                                            onChange={(val) => setPreferences(prev => ({ ...prev, location: val }))}
                                        />
                                    </div>
                                </div>

                                {/* Remote toggle */}
                                <div className="flex items-center justify-between py-3 px-4 bg-surface-100/60/60 rounded-xl">
                                    <div>
                                        <p className="text-[13px] font-semibold text-gray-700">Remote Only</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Only show remote positions in search results</p>
                                    </div>
                                    <button
                                        onClick={() => setPreferences(prev => ({ ...prev, remoteOnly: !prev.remoteOnly }))}
                                        className="cursor-pointer"
                                    >
                                        {preferences.remoteOnly ? (
                                            <ToggleRight className="w-8 h-8 text-emerald-500" />
                                        ) : (
                                            <ToggleLeft className="w-8 h-8 text-gray-300" />
                                        )}
                                    </button>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSavePreferences}
                                        disabled={Boolean(pendingAction)}
                                        className="px-5 py-2.5 text-[13px] font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all shadow-button hover:shadow-card cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {pendingAction === 'preferences' ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* ---- Right column: Account + Privacy (4 cols) ---- */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Token balance card removed — unlimited access. */}

                        {/* ---- Account Details ---- */}
                        <GlassCard className="p-6">
                            <SectionHeader title="Account" icon={Briefcase} />
                            <div className="space-y-4">
                                <div>
                                    <FieldLabel>Email</FieldLabel>
                                    <div className="px-3.5 py-2.5 text-[13px] text-gray-500 bg-surface-100 rounded-xl">
                                        {user?.primaryEmailAddress?.emailAddress || 'Not signed in'}
                                    </div>
                                </div>
                                <div>
                                    <FieldLabel>Account Name</FieldLabel>
                                    <div className="px-3.5 py-2.5 text-[13px] text-gray-500 bg-surface-100 rounded-xl">
                                        {user?.fullName || user?.firstName || 'Not signed in'}
                                    </div>
                                </div>

                                {/* Clear data */}
                                <div className="pt-3">
                                    {!showClearConfirm ? (
                                        <button
                                            onClick={() => setShowClearConfirm(true)}
                                            className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer w-full"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear All Data
                                        </button>
                                    ) : (
                                        <div className="p-3.5 bg-red-50 rounded-xl space-y-3">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-red-600 leading-relaxed">This permanently removes your profile, preferences, searches, saved jobs, applications, outcomes, and Midas Match browser data. Your sign-in account remains active.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowClearConfirm(false)}
                                                    className="flex-1 px-3 py-1.5 text-[12px] font-medium text-gray-600 bg-white rounded-xl hover:bg-surface-50 transition-colors cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleClearAllData}
                                                    disabled={Boolean(pendingAction)}
                                                    className="flex-1 px-3 py-1.5 text-[12px] font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {pendingAction === 'clear' ? 'Clearing...' : 'Confirm'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>

                        {/* ---- Data & Privacy Section ---- */}
                        <GlassCard className="p-6">
                            <SectionHeader title="Data & Privacy" icon={Shield} />
                            <div className="space-y-2.5">
                                {/* Export */}
                                <button
                                    onClick={handleExportData}
                                    disabled={Boolean(pendingAction)}
                                    className="w-full flex items-center gap-3 p-3.5 bg-surface-50/80/60 hover:bg-surface-100 rounded-xl transition-all cursor-pointer group hover:translate-x-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-accent-50 flex items-center justify-center group-hover:bg-accent-100 transition-colors shrink-0">
                                        <Download className="w-4 h-4 text-accent-500" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-gray-700">Export My Data</p>
                                        <p className="text-[11px] text-gray-400 truncate">{pendingAction === 'export' ? 'Preparing complete export...' : 'Profile, searches, jobs, outcomes, and telemetry'}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" />
                                </button>

                                {/* Delete resume data */}
                                {!showDeleteResumeConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteResumeConfirm(true)}
                                        className="w-full flex items-center gap-3 p-3.5 bg-surface-50/80/60 hover:bg-surface-100 rounded-xl transition-all cursor-pointer group hover:translate-x-0.5"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors shrink-0">
                                            <FileText className="w-4 h-4 text-red-400" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold text-gray-700">Delete Resume Data</p>
                                            <p className="text-[11px] text-gray-400 truncate">Remove raw resume text</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" />
                                    </button>
                                ) : (
                                    <div className="p-3.5 bg-red-50 rounded-xl space-y-3">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-[12px] text-red-600 leading-relaxed">This will remove the raw resume text. Your extracted skills and profile info will remain.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowDeleteResumeConfirm(false)}
                                                className="flex-1 px-3 py-1.5 text-[12px] font-medium text-gray-600 bg-white rounded-xl hover:bg-surface-50 transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDeleteResumeData}
                                                disabled={Boolean(pendingAction)}
                                                className="flex-1 px-3 py-1.5 text-[12px] font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {pendingAction === 'resume' ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Privacy link */}
                                <a
                                    href="/privacy"
                                    className="flex items-center gap-3 p-3.5 bg-surface-50/80/60 hover:bg-surface-100 rounded-xl transition-all group hover:translate-x-0.5"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center group-hover:bg-surface-200 transition-colors shrink-0">
                                        <Shield className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-gray-700">Privacy Policy</p>
                                        <p className="text-[11px] text-gray-400 truncate">Learn how we handle your data</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" />
                                </a>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
