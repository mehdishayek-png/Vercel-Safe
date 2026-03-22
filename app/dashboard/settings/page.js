'use client';
import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@clerk/nextjs';
import {
    User, Briefcase, MapPin, Tag, Plus, X, Globe, ToggleLeft, ToggleRight,
    Download, Trash2, Shield, CheckCircle, AlertTriangle, Coins, Zap, FileText,
    Bell, TrendingUp, CreditCard, Key, ChevronRight, ExternalLink, Sparkles,
    Settings, Lock, Link2, Receipt
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

const TABS = [
    { id: 'overview', label: 'Account Overview', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'linked', label: 'Linked Accounts', icon: Link2 },
    { id: 'billing', label: 'Billing', icon: Receipt },
];

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
    const [activeTab, setActiveTab] = useState('overview');
    const [skillInput, setSkillInput] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showDeleteResumeConfirm, setShowDeleteResumeConfirm] = useState(false);
    const skillInputRef = useRef(null);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const profileVal = (key) => profile?.[key] || '';
    const updateProfile = (key, value) => {
        setProfile(prev => prev ? { ...prev, [key]: value } : { [key]: value });
    };

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

    const handleSaveProfile = () => showToast('Profile updated');
    const handleSavePreferences = () => showToast('Preferences saved');

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

    const handleClearAllData = () => {
        localStorage.clear();
        setProfile(null);
        setShowClearConfirm(false);
        window.location.reload();
    };

    const handleDeleteResumeData = () => {
        updateProfile('resume_text', '');
        setShowDeleteResumeConfirm(false);
        showToast('Resume data deleted');
    };

    return (
        <div className="min-h-screen">
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}

            <div className="flex gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Left Sidebar Navigation */}
                <aside className="hidden lg:flex flex-col w-64 shrink-0">
                    <div className="mb-8">
                        <h2 className="text-lg font-extrabold text-brand-600 dark:text-brand-400 font-headline">Premium Account</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Managing your AI Match profile</p>
                    </div>

                    <nav className="flex flex-col gap-1 flex-1">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all cursor-pointer ${
                                        isActive
                                            ? 'text-brand-600 dark:text-brand-400 bg-white dark:bg-[#1a1d27] shadow-sm'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#22252f]'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-headline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="border-t border-slate-200/50 dark:border-[#2d3140] pt-4 mt-4 space-y-2">
                        <button className="w-full py-3 bg-gradient-to-r from-brand-600 to-secondary text-white rounded-full font-bold text-sm shadow-lg shadow-brand-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer font-headline">
                            Upgrade Plan
                        </button>
                        <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-brand-600 transition-colors text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Help Center</span>
                        </a>
                        <button className="flex items-center gap-3 px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors text-sm w-full cursor-pointer">
                            <ExternalLink className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="font-headline text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Account Settings</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Refine your AI-matching parameters and manage your professional identity for the Midas Flux network.</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Left Content Column */}
                        <div className="xl:col-span-8 space-y-8">

                            {/* Profile Section */}
                            <section className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2d3140] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                            <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                        </div>
                                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 font-headline">Profile Section</h2>
                                    </div>
                                    <button
                                        onClick={handleSaveProfile}
                                        className="px-5 py-2 text-[13px] font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-full transition-colors cursor-pointer shadow-md shadow-brand-600/20 font-headline"
                                    >
                                        Save Profile
                                    </button>
                                </div>
                                <div className="p-6 space-y-5">
                                    {/* Name & Title */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">Full Name</label>
                                            <input
                                                type="text"
                                                value={profileVal('name')}
                                                onChange={(e) => updateProfile('name', e.target.value)}
                                                placeholder="Your full name"
                                                className="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-200 bg-slate-50/80 dark:bg-[#22252f] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-300 dark:placeholder:text-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">Job Title</label>
                                            <input
                                                type="text"
                                                value={jobTitle}
                                                onChange={(e) => {
                                                    setJobTitle(e.target.value);
                                                    updateProfile('headline', e.target.value);
                                                }}
                                                placeholder="e.g. Senior Software Engineer"
                                                className="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-200 bg-slate-50/80 dark:bg-[#22252f] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-300 dark:placeholder:text-gray-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Experience & Industry */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">Experience</label>
                                            <select
                                                value={experienceYears > 10 ? '10+' : `${experienceYears}`}
                                                onChange={(e) => {
                                                    const val = e.target.value === '10+' ? 15 : parseInt(e.target.value) || 0;
                                                    setExperienceYears(val);
                                                    updateProfile('experience_years', val);
                                                }}
                                                className="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-200 bg-slate-50/80 dark:bg-[#22252f] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="0">0-1 Years</option>
                                                <option value="2">2-4 Years</option>
                                                <option value="5">5-7 Years</option>
                                                <option value="8">8-10 Years</option>
                                                <option value="10+">10+ Years</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">Industry</label>
                                            <input
                                                type="text"
                                                value={profileVal('industry')}
                                                onChange={(e) => updateProfile('industry', e.target.value)}
                                                placeholder="e.g. Financial Technology"
                                                className="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-200 bg-slate-50/80 dark:bg-[#22252f] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-300 dark:placeholder:text-gray-600"
                                            />
                                        </div>
                                    </div>

                                    {/* What I Do */}
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">What I Do</label>
                                        <textarea
                                            value={whatIDo}
                                            onChange={(e) => setWhatIDo(e.target.value)}
                                            placeholder="Describe what you do day-to-day in 2-3 sentences..."
                                            className="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-200 bg-slate-50/80 dark:bg-[#22252f] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-300 dark:placeholder:text-gray-600 resize-none"
                                            rows={3}
                                            maxLength={500}
                                        />
                                        <div className="text-[10px] text-slate-300 text-right mt-1">{whatIDo.length}/500</div>
                                    </div>
                                </div>
                            </section>

                            {/* Skill Management */}
                            <section className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2d3140] flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-secondary" />
                                    </div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 font-headline">Skill Management</h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        {skills.slice(0, 3).map((skill) => (
                                            <span key={skill} className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-full text-sm font-medium">
                                                {skill}
                                                <button onClick={() => removeSkill(skill)} className="hover:text-brand-200 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                            </span>
                                        ))}
                                        {skills.slice(3).map((skill) => (
                                            <span key={skill} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-[#22252f] text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium border border-slate-200/60 dark:border-[#2d3140]">
                                                {skill}
                                                <button onClick={() => removeSkill(skill)} className="hover:text-red-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                            </span>
                                        ))}
                                        <div className="inline-flex items-center gap-1.5">
                                            <input
                                                ref={skillInputRef}
                                                type="text"
                                                value={skillInput}
                                                onChange={(e) => setSkillInput(e.target.value)}
                                                onKeyDown={handleSkillKeyDown}
                                                placeholder="+ Add Skill"
                                                className="px-3 py-2 text-sm bg-transparent border-none outline-none placeholder:text-brand-500 dark:placeholder:text-brand-400 text-gray-900 dark:text-gray-200 w-28"
                                            />
                                        </div>
                                    </div>

                                    {/* AI Insight */}
                                    <div className="bg-brand-50/50 dark:bg-brand-900/10 rounded-xl p-4 border border-brand-100/50 dark:border-brand-800/20">
                                        <p className="text-sm text-brand-700 dark:text-brand-300 italic text-center">
                                            <Sparkles className="w-4 h-4 inline mr-1" />
                                            AI Insight: Adding &ldquo;Distributed Systems&rdquo; would increase your match score by 14%.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Search Preferences */}
                            <section className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] overflow-hidden shadow-sm">
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2d3140] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                            <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                        </div>
                                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 font-headline">Search Preferences</h2>
                                    </div>
                                    <button
                                        onClick={handleSavePreferences}
                                        className="px-5 py-2 text-[13px] font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-full transition-colors cursor-pointer shadow-md shadow-brand-600/20 font-headline"
                                    >
                                        Save Preferences
                                    </button>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">Country</label>
                                            <select
                                                value={preferences.country}
                                                onChange={(e) => setPreferences(prev => ({ ...prev, country: e.target.value }))}
                                                className="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-200 bg-slate-50/80 dark:bg-[#22252f] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">All Countries</option>
                                                {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">State / Region</label>
                                            <select
                                                value={preferences.state}
                                                onChange={(e) => setPreferences(prev => ({ ...prev, state: e.target.value }))}
                                                className="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-200 bg-slate-50/80 dark:bg-[#22252f] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">All States</option>
                                                {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">City</label>
                                            <select
                                                value={preferences.city}
                                                onChange={(e) => setPreferences(prev => ({ ...prev, city: e.target.value }))}
                                                className="w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-200 bg-slate-50/80 dark:bg-[#22252f] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">All Cities</option>
                                                {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between py-3 px-4 bg-slate-50/80 dark:bg-[#22252f] rounded-xl">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Remote Only</p>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500">Only show remote positions</p>
                                        </div>
                                        <button onClick={() => setPreferences(prev => ({ ...prev, remoteOnly: !prev.remoteOnly }))} className="cursor-pointer">
                                            {preferences.remoteOnly
                                                ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                                                : <ToggleLeft className="w-8 h-8 text-gray-300" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Sidebar */}
                        <div className="xl:col-span-4 space-y-6">
                            {/* Account Summary Card */}
                            <div className="bg-brand-600 rounded-2xl p-6 text-white shadow-xl shadow-brand-600/20 relative overflow-hidden">
                                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Shield className="w-5 h-5" />
                                        <h3 className="font-headline font-bold text-lg">Account Summary</h3>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">Authenticated Email</p>
                                            <p className="text-sm font-semibold">{user?.primaryEmailAddress?.emailAddress || 'Not signed in'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">Account Name</p>
                                            <p className="text-sm font-semibold">{user?.fullName || user?.firstName || 'Not signed in'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-white/10 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/60">Tokens</p>
                                            <p className="text-2xl font-headline font-black">{tokenBalance}</p>
                                        </div>
                                        <div className="bg-white/10 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/60">Scans Left</p>
                                            <p className="text-2xl font-headline font-black">{freeScansRemaining}</p>
                                        </div>
                                    </div>

                                    <a href="/pricing" className="block w-full py-3 bg-white text-brand-600 rounded-full font-bold text-sm text-center hover:bg-brand-50 transition-colors">
                                        Purchase More Tokens
                                    </a>
                                </div>
                            </div>

                            {/* Data & Privacy */}
                            <div className="space-y-3">
                                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 font-headline px-1">Data & Privacy</h3>

                                <button
                                    onClick={handleExportData}
                                    className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#1a1d27] hover:bg-slate-50 dark:hover:bg-[#22252f] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] transition-colors cursor-pointer group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                                        <Download className="w-5 h-5 text-brand-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Export My Data</p>
                                        <p className="text-[11px] text-gray-400">Download your full match history</p>
                                    </div>
                                </button>

                                {!showDeleteResumeConfirm ? (
                                    <button
                                        onClick={() => setShowDeleteResumeConfirm(true)}
                                        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#1a1d27] hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl border border-slate-200/60 dark:border-[#2d3140] transition-colors cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                            <Trash2 className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Delete Resume Data</p>
                                            <p className="text-[11px] text-gray-400">Permanently wipe indexed records</p>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
                                        <p className="text-[12px] text-red-600 dark:text-red-400 mb-3">This will remove the raw resume text. Your extracted skills and profile info will remain.</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setShowDeleteResumeConfirm(false)} className="flex-1 px-3 py-2 text-[12px] font-medium bg-white dark:bg-[#1a1d27] rounded-lg cursor-pointer">Cancel</button>
                                            <button onClick={handleDeleteResumeData} className="flex-1 px-3 py-2 text-[12px] font-medium text-white bg-red-500 rounded-lg cursor-pointer">Delete</button>
                                        </div>
                                    </div>
                                )}

                                <a
                                    href="/privacy"
                                    className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#1a1d27] hover:bg-slate-50 dark:hover:bg-[#22252f] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Privacy Policy</p>
                                        <p className="text-[11px] text-gray-400">Updated May 2026</p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-300" />
                                </a>
                            </div>

                            {/* Security Shield Card */}
                            <div className="bg-gradient-to-br from-slate-900 to-brand-900 rounded-2xl p-6 text-white relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-secondary/20 rounded-full blur-2xl" />
                                <div className="relative z-10">
                                    <p className="text-sm font-bold mb-2">Your data is secured by Midas Shield 2.0 Encryption.</p>
                                    <p className="text-[11px] text-white/50">End-to-end encrypted. Zero data retention. GDPR compliant.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
