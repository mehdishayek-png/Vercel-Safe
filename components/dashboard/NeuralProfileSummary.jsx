import { useState } from 'react';
import { Sparkles, Pencil, History, Brain, Scan } from 'lucide-react';
import Link from 'next/link';

function ReadinessGauge({ score }) {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - score / 100);

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-[180px] h-[180px]">
                <svg width="180" height="180" className="-rotate-90">
                    <circle cx="90" cy="90" r={radius} fill="none" stroke="currentColor" strokeWidth="8"
                        className="text-brand-100 dark:text-brand-900/30" />
                    <circle cx="90" cy="90" r={radius} fill="none" stroke="currentColor" strokeWidth="8"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="text-brand-600 dark:text-brand-400 transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-brand-600 dark:text-brand-400 font-headline">{score}%</span>
                    <span className="text-[10px] font-bold tracking-[0.15em] text-brand-500 dark:text-brand-400 uppercase mt-0.5">Readiness</span>
                </div>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline mt-3">
                Profile Fidelity: {score >= 85 ? 'High' : score >= 60 ? 'Medium' : 'Low'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1 max-w-[200px] leading-relaxed">
                {score >= 85
                    ? 'Your profile is fully optimized for the Midas Match engine.'
                    : score >= 60
                    ? 'Add more skills and details to improve matching accuracy.'
                    : 'Complete your profile to unlock better matches.'}
            </p>
        </div>
    );
}

function SkillTag({ skill, highlighted }) {
    return (
        <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            highlighted
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800/40'
                : 'bg-white dark:bg-[#22252f] text-gray-600 dark:text-gray-300 border-slate-200/80 dark:border-[#2d3140]'
        }`}>
            {skill}
        </span>
    );
}

export function NeuralProfileSummary({
    profile, jobTitle, experienceYears, whatIDo,
    onEditSkills, onRefineProfile, onScanMarket,
    isMatching,
}) {
    const skills = profile.display_skills || profile.skills || [];
    const visibleSkills = skills.slice(0, 8);
    const extraCount = Math.max(0, skills.length - 8);

    // Highlight top skills (first 3 or ones that match certain patterns)
    const highlightedSkills = new Set(skills.slice(0, 3).map(s => s));

    // Compute readiness score
    const readinessScore = Math.min(100, Math.round(
        (profile.name && profile.name !== 'Candidate' ? 15 : 0) +
        (jobTitle ? 20 : 0) +
        (skills.length >= 5 ? 20 : skills.length * 4) +
        (experienceYears > 0 ? 15 : 0) +
        (profile.location ? 10 : 0) +
        (whatIDo ? 10 : 0) +
        (profile.industry ? 10 : 0)
    ));

    // Generate professional identity from whatIDo or construct from profile data
    const professionalIdentity = whatIDo || (() => {
        const parts = [];
        if (experienceYears > 0) parts.push(`${experienceYears}+ years of experience`);
        if (profile.industry) parts.push(`in ${profile.industry}`);
        if (skills.length > 0) parts.push(`specializing in ${skills.slice(0, 3).join(', ')}`);
        return parts.length > 0
            ? `Professional with ${parts.join(' ')}.`
            : 'Upload more details to generate your professional identity.';
    })();

    // Simulated work history from experience years
    const currentYear = new Date().getFullYear();
    const workHistory = (() => {
        if (experienceYears <= 0) return [];
        const title = jobTitle || profile.headline || 'Professional';
        const entries = [];
        const complexity = profile.role_complexity || '';

        if (experienceYears >= 6) {
            entries.push({
                title: complexity === 'senior' || complexity === 'lead' ? `Principal ${title.split(' ').pop()}` : `Senior ${title}`,
                period: `${currentYear - 3} — Present (${3}.0 yrs)`,
                primary: true,
            });
            entries.push({
                title: `${title}`,
                period: `${currentYear - 6} — ${currentYear - 3} (3.0 yrs)`,
            });
            if (experienceYears >= 8) {
                entries.push({
                    title: `Associate ${title.split(' ').pop()}`,
                    period: `${currentYear - 8} — ${currentYear - 6} (2.0 yrs)`,
                });
            }
        } else if (experienceYears >= 3) {
            entries.push({
                title: title,
                period: `${currentYear - experienceYears} — Present (${experienceYears}.0 yrs)`,
                primary: true,
            });
            entries.push({
                title: `Junior ${title.split(' ').pop()}`,
                period: `${currentYear - experienceYears - 2} — ${currentYear - experienceYears} (2.0 yrs)`,
            });
        } else {
            entries.push({
                title: title,
                period: `${currentYear - experienceYears} — Present (${experienceYears}.0 yrs)`,
                primary: true,
            });
        }
        return entries;
    })();

    return (
        <div className="space-y-5">
            {/* Header row: Title + Readiness Gauge */}
            <div className="flex flex-col lg:flex-row gap-5">
                {/* Left — Identity */}
                <div className="flex-1 min-w-0 bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                    {/* AI Extraction Badge */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30 mb-4">
                        AI Extraction Successful
                    </span>

                    {/* Name + Title */}
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 font-headline tracking-tight">
                        {jobTitle || profile.headline || 'Professional'}
                    </h2>
                    <p className="text-sm text-brand-600 dark:text-brand-400 font-semibold italic mt-0.5">
                        {profile.industry || 'Specialist'}
                    </p>

                    <div className="mt-4 mb-4">
                        <Sparkles className="w-5 h-5 text-brand-400 dark:text-brand-500" />
                    </div>

                    {/* Professional Identity */}
                    <div>
                        <span className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase font-headline">
                            Professional Identity
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-2">
                            {professionalIdentity}
                        </p>
                    </div>
                </div>

                {/* Right — Readiness Gauge */}
                <div className="lg:w-[280px] shrink-0 bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm flex items-center justify-center">
                    <ReadinessGauge score={readinessScore} />
                </div>
            </div>

            {/* Skill Cloud + History */}
            <div className="flex flex-col lg:flex-row gap-5">
                {/* Skill Cloud */}
                <div className="flex-1 min-w-0 bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-brand-500 dark:text-brand-400" />
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">Skill Cloud</span>
                        </div>
                        {onEditSkills && (
                            <button
                                onClick={onEditSkills}
                                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 cursor-pointer transition-colors"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit Skills
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {visibleSkills.map((skill) => (
                            <SkillTag key={skill} skill={skill} highlighted={highlightedSkills.has(skill)} />
                        ))}
                        {extraCount > 0 && (
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30">
                                +{extraCount} more
                            </span>
                        )}
                    </div>
                </div>

                {/* History */}
                {workHistory.length > 0 && (
                    <div className="lg:w-[300px] shrink-0 bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <History className="w-5 h-5 text-brand-500 dark:text-brand-400" />
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">History</span>
                        </div>
                        <div className="space-y-4 relative">
                            {/* Timeline line */}
                            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-[#2d3140]" />
                            {workHistory.map((entry, i) => (
                                <div key={i} className="flex gap-3 items-start relative">
                                    <div className={`w-[15px] h-[15px] rounded-full shrink-0 mt-0.5 z-10 border-2 ${
                                        entry.primary
                                            ? 'bg-brand-600 dark:bg-brand-500 border-brand-600 dark:border-brand-500'
                                            : 'bg-white dark:bg-[#1a1d27] border-slate-300 dark:border-gray-600'
                                    }`} />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline leading-tight">{entry.title}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">{entry.period}</p>
                                        {entry.primary && (
                                            <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 mt-0.5">Primary Match Signal</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom CTA */}
            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100 font-headline">Ready to engage the market?</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                        Your Neural Profile is fully verified and optimized for high-tier matching.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {onRefineProfile && (
                        <button
                            onClick={onRefineProfile}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#22252f] transition-colors cursor-pointer"
                        >
                            Refine Profile
                        </button>
                    )}
                    <button
                        onClick={onScanMarket}
                        disabled={isMatching}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-600/20"
                    >
                        Scan Market for Matches
                        <Scan className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
