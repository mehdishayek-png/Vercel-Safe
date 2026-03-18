'use client';
import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@clerk/nextjs';
import {
    User, Briefcase, MapPin, Tag, Plus, X, Globe, ToggleLeft, ToggleRight,
    Download, Trash2, Shield, CheckCircle, AlertTriangle, Coins, Zap, FileText
} from 'lucide-react';

function Toast({ message, onClose }) {
    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-900 text-white text-[13px] px-4 py-2.5 rounded-xl shadow-lg animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

function SectionCard({ title, icon: Icon, children }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <h2 className="text-[13px] font-semibold text-gray-900">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function FieldLabel({ children }) {
    return <label className="block text-[12px] font-medium text-gray-500 mb-1.5">{children}</label>;
}

function TextInput({ value, onChange, placeholder, type = 'text', ...props }) {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-[13px] text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-gray-300"
            {...props}
        />
    );
}

function SelectInput({ value, onChange, children }) {
    return (
        <select
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 text-[13px] text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors appearance-none cursor-pointer"
        >
            {children}
        </select>
    );
}

export default function SettingsPage() {
    const { user } = useUser();
    const {
        profile, setProfile,
        experienceYears, setExperienceYears,
        jobTitle, setJobTitle,
        whatIDo, setWhatIDo,
        preferences, setPreferences,
        countries, states, cities,
        tokenBalance, freeScansRemaining, FREE_DAILY_SCANS,
        savedJobsData, appliedJobsData,
    } = useApp();

    const [toast, setToast] = useState(null);
    const [skillInput, setSkillInput] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showDeleteResumeConfirm, setShowDeleteResumeConfirm] = useState(false);
    const skillInputRef = useRef(null);

    const showToast = (message) => {
        setToast(message);
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
    const handleSaveProfile = () => {
        showToast('Profile updated');
    };

    // Save preferences
    const handleSavePreferences = () => {
        showToast('Preferences saved');
    };

    // Export data
    const handleExportData = () => {
        const data = {
            exportedAt: new Date().toISOString(),
            profile: profile || {},
            savedJobs: savedJobsData || [],
            appliedJobs: appliedJobsData || [],
            preferences,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `midas-match-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported');
    };

    // Clear all data
    const handleClearAllData = () => {
        localStorage.clear();
        setProfile(null);
        setShowClearConfirm(false);
        window.location.reload();
    };

    // Delete resume text
    const handleDeleteResumeData = () => {
        updateProfile('resume_text', '');
        setShowDeleteResumeConfirm(false);
        showToast('Resume data deleted');
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}

            <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
                {/* Page header */}
                <div>
                    <h1 className="text-[18px] font-bold text-gray-900">Settings</h1>
                    <p className="text-[13px] text-gray-400 mt-0.5">Manage your profile, preferences, and data</p>
                </div>

                {/* ---- Profile Section ---- */}
                <SectionCard title="Profile" icon={User}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                        {/* What I Do */}
                        <div>
                            <FieldLabel>What I Do <span className="text-gray-300 font-normal">(optional)</span></FieldLabel>
                            <textarea
                                value={whatIDo}
                                onChange={(e) => setWhatIDo(e.target.value)}
                                placeholder="Describe what you do day-to-day in 2-3 sentences. E.g., 'I help SaaS companies onboard enterprise clients. I run QBRs, build playbooks, and reduce churn.'"
                                className="w-full px-3 py-2 text-[13px] text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-gray-300 resize-none dark:bg-[#22252f] dark:border-[#2d3140] dark:text-gray-200 dark:placeholder:text-gray-600"
                                rows={3}
                                maxLength={500}
                            />
                            <div className="text-[10px] text-gray-300 text-right mt-1">{whatIDo.length}/500</div>
                        </div>

                        {/* Skills */}
                        <div>
                            <FieldLabel>Skills</FieldLabel>
                            <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg min-h-[44px]">
                                {skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-md text-[12px] font-medium text-gray-700 group"
                                    >
                                        {skill}
                                        <button
                                            onClick={() => removeSkill(skill)}
                                            className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    ref={skillInputRef}
                                    type="text"
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={handleSkillKeyDown}
                                    placeholder={skills.length === 0 ? 'Type a skill and press Enter' : 'Add more...'}
                                    className="flex-1 min-w-[120px] px-1 py-1 text-[12px] bg-transparent border-none outline-none placeholder:text-gray-300"
                                />
                            </div>
                            <p className="text-[11px] text-gray-300 mt-1">Press Enter to add, Backspace to remove last</p>
                        </div>

                        <div className="flex justify-end pt-1">
                            <button
                                onClick={handleSaveProfile}
                                className="px-4 py-2 text-[13px] font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                            >
                                Save Profile
                            </button>
                        </div>
                    </div>
                </SectionCard>

                {/* ---- Search Preferences Section ---- */}
                <SectionCard title="Search Preferences" icon={Globe}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <FieldLabel>Country</FieldLabel>
                                <SelectInput
                                    value={preferences.country}
                                    onChange={(e) => setPreferences(prev => ({ ...prev, country: e.target.value }))}
                                >
                                    <option value="">All Countries</option>
                                    {countries.map(c => (
                                        <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div>
                                <FieldLabel>State / Region</FieldLabel>
                                <SelectInput
                                    value={preferences.state}
                                    onChange={(e) => setPreferences(prev => ({ ...prev, state: e.target.value }))}
                                >
                                    <option value="">All States</option>
                                    {states.map(s => (
                                        <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                                    ))}
                                </SelectInput>
                            </div>
                            <div>
                                <FieldLabel>City</FieldLabel>
                                <SelectInput
                                    value={preferences.city}
                                    onChange={(e) => setPreferences(prev => ({ ...prev, city: e.target.value }))}
                                >
                                    <option value="">All Cities</option>
                                    {cities.map(c => (
                                        <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                </SelectInput>
                            </div>
                        </div>

                        {/* Remote toggle */}
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-[13px] font-medium text-gray-700">Remote Only</p>
                                <p className="text-[11px] text-gray-400">Only show remote positions in search results</p>
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

                        <div className="flex justify-end pt-1">
                            <button
                                onClick={handleSavePreferences}
                                className="px-4 py-2 text-[13px] font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                            >
                                Save Preferences
                            </button>
                        </div>
                    </div>
                </SectionCard>

                {/* ---- Account Section ---- */}
                <SectionCard title="Account" icon={Briefcase}>
                    <div className="space-y-4">
                        {/* User info from Clerk */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Email</FieldLabel>
                                <div className="px-3 py-2 text-[13px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                                    {user?.primaryEmailAddress?.emailAddress || 'Not signed in'}
                                </div>
                            </div>
                            <div>
                                <FieldLabel>Account Name</FieldLabel>
                                <div className="px-3 py-2 text-[13px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                                    {user?.fullName || user?.firstName || 'Not signed in'}
                                </div>
                            </div>
                        </div>

                        {/* Token balance & scans */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <Coins className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[12px] text-gray-400">Token Balance</p>
                                    <p className="text-[15px] font-semibold text-gray-900">{tokenBalance}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-teal-500" />
                                </div>
                                <div>
                                    <p className="text-[12px] text-gray-400">Free Scans Today</p>
                                    <p className="text-[15px] font-semibold text-gray-900">{freeScansRemaining} / {FREE_DAILY_SCANS}</p>
                                </div>
                            </div>
                        </div>

                        {/* Clear data */}
                        <div className="pt-2 border-t border-gray-100">
                            {!showClearConfirm ? (
                                <button
                                    onClick={() => setShowClearConfirm(true)}
                                    className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear All Data
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                    <p className="text-[12px] text-red-600 flex-1">This will clear all local data including your profile, saved jobs, and preferences. This cannot be undone.</p>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => setShowClearConfirm(false)}
                                            className="px-3 py-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleClearAllData}
                                            className="px-3 py-1.5 text-[12px] font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </SectionCard>

                {/* ---- Data & Privacy Section ---- */}
                <SectionCard title="Data & Privacy" icon={Shield}>
                    <div className="space-y-3">
                        {/* Export */}
                        <button
                            onClick={handleExportData}
                            className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors cursor-pointer group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                                <Download className="w-4 h-4 text-violet-500" />
                            </div>
                            <div className="text-left flex-1">
                                <p className="text-[13px] font-medium text-gray-700">Export My Data</p>
                                <p className="text-[11px] text-gray-400">Download profile, saved jobs, and applications as JSON</p>
                            </div>
                        </button>

                        {/* Delete resume data */}
                        {!showDeleteResumeConfirm ? (
                            <button
                                onClick={() => setShowDeleteResumeConfirm(true)}
                                className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors cursor-pointer group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                    <FileText className="w-4 h-4 text-red-400" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-[13px] font-medium text-gray-700">Delete Resume Data</p>
                                    <p className="text-[11px] text-gray-400">Remove the raw resume text from your profile</p>
                                </div>
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                <p className="text-[12px] text-red-600 flex-1">This will remove the raw resume text. Your extracted skills and profile info will remain.</p>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => setShowDeleteResumeConfirm(false)}
                                        className="px-3 py-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteResumeData}
                                        className="px-3 py-1.5 text-[12px] font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Privacy link */}
                        <a
                            href="/privacy"
                            className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                <Shield className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="text-left flex-1">
                                <p className="text-[13px] font-medium text-gray-700">Privacy Policy</p>
                                <p className="text-[11px] text-gray-400">Learn how we handle your data</p>
                            </div>
                        </a>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
