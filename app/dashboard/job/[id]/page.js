'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, ExternalLink, Bookmark, Check, MapPin, Building2, Clock, Sparkles, BrainCircuit, FileText, Copy, CheckCheck, Loader2, AlertCircle, Briefcase, ChevronRight, GraduationCap, Target, BadgeCheck, Eye, ChevronDown, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/components/ui/Toast';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { stripHtmlForDisplay as stripHtml } from '@/lib/strip-html';

// ---- Utilities ----

function extractExperienceFromDescription(text) {
    if (!text) return null;
    const patterns = [
        /(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i,
        /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i,
        /experience\s*[:of]*\s*(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)/i,
        /experience\s*[:of]*\s*(\d+)\+?\s*(?:years?|yrs?)/i,
        /minimum\s*(\d+)\s*(?:years?|yrs?)/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[2]) return `${match[1]}-${match[2]}`;
            return `${match[1]}+`;
        }
    }
    return null;
}

function extractEducationFromDescription(text) {
    if (!text) return null;
    const patterns = [
        /\b(B\.?E\.?|B\.?Tech|B\.?S\.?c?|Bachelor'?s?)\b/i,
        /\b(M\.?E\.?|M\.?Tech|M\.?S\.?c?|Master'?s?|MBA)\b/i,
        /\b(Ph\.?D|Doctorate)\b/i,
    ];
    const found = [];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && !found.includes(match[1])) found.push(match[1]);
    }
    return found.length > 0 ? found.join(' / ') : null;
}

function multiplierToDots(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return 3;
    if (num >= 1.1) return 5;
    if (num >= 1.0) return 4;
    if (num >= 0.8) return 3;
    if (num >= 0.5) return 2;
    return 1;
}

// ---- Sub-components ----

function DotIndicator({ filled, total = 5 }) {
    return (
        <div className="flex items-center gap-[5px]">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`w-[9px] h-[9px] rounded-full transition-colors ${
                        i < filled ? 'bg-teal-500' : 'bg-ink-200 dark:bg-[#2E2B27]'
                    }`}
                />
            ))}
        </div>
    );
}

function StatBox({ label, value, sublabel, icon: Icon, accentColor = 'teal' }) {
    const colorMap = {
        teal: 'bg-teal-50 border-teal-100 text-teal-600',
        sky: 'bg-sky-50 border-sky-100 text-sky-600',
        violet: 'bg-violet-50 border-violet-100 text-violet-600',
        amber: 'bg-amber-50 border-amber-100 text-amber-600',
    };
    const iconColor = colorMap[accentColor] || colorMap.teal;
    return (
        <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] p-4 text-center border border-ink-100 dark:border-[#2E2B27] hover:border-ink-200 dark:hover:border-[#3A3732] transition-colors">
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconColor}`}>
                    <Icon className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-medium text-ink-400 dark:text-ink-500 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-xl font-semibold text-ink-900 dark:text-ink-100">{value}</div>
            {sublabel && <p className="text-[10px] text-ink-400 dark:text-ink-500 mt-0.5">{sublabel}</p>}
        </div>
    );
}

function ScoreRing({ score, size = 64 }) {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    const color = score >= 75 ? '#14b8a6' : score >= 55 ? '#f59e0b' : '#9ca3af';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f3f4f6" strokeWidth={strokeWidth} fill="transparent" />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke={color} strokeWidth={strokeWidth} fill="transparent"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[15px] font-bold" style={{ color }}>{Math.round(score)}</span>
            </div>
        </div>
    );
}

function ScoreGauge({ score, heuristicBreakdown, profile }) {
    const size = 90;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    const color = score >= 75 ? '#14b8a6' : score >= 55 ? '#f59e0b' : '#9ca3af';
    const gradientId = `gauge-grad-${score}`;

    // Sub-scores
    const matches = heuristicBreakdown?.matches || [];
    const multipliers = heuristicBreakdown?.multipliers || {};
    const profileSkillsCount = profile?.skills?.length || 1;
    const skillsScore = Math.round(Math.min((matches.length / profileSkillsCount) * 100, 100));
    const experienceScore = Math.round(Math.min(parseFloat(multipliers.seniority || 0) * 100, 100));
    const titleScore = Math.round(Math.min(parseFloat(multipliers.coherence || multipliers.roleFamily || 0) * 100, 100));

    const subScores = [
        { label: 'Skills', value: skillsScore },
        { label: 'Experience', value: experienceScore },
        { label: 'Title', value: titleScore },
    ];

    const barColor = (v) => v >= 75 ? 'bg-teal-400' : v >= 55 ? 'bg-amber-400' : 'bg-ink-300';

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Radial gauge */}
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            {score >= 75 ? (
                                <>
                                    <stop offset="0%" stopColor="#14b8a6" />
                                    <stop offset="100%" stopColor="#0d9488" />
                                </>
                            ) : score >= 55 ? (
                                <>
                                    <stop offset="0%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#d97706" />
                                </>
                            ) : (
                                <>
                                    <stop offset="0%" stopColor="#9ca3af" />
                                    <stop offset="100%" stopColor="#6b7280" />
                                </>
                            )}
                        </linearGradient>
                    </defs>
                    <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f3f4f6" strokeWidth={strokeWidth} fill="transparent" />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} fill="transparent"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[22px] font-bold" style={{ color }}>{Math.round(score)}</span>
                </div>
            </div>

            {/* Sub-scores row */}
            <div className="flex items-center gap-3">
                {subScores.map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] font-medium text-ink-400 uppercase tracking-wider">{label}</span>
                        <div className="w-12 h-1 rounded-full bg-ink-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor(value)}`}
                                style={{ width: `${value}%` }}
                            />
                        </div>
                        <span className="text-[9px] font-semibold text-ink-500">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SimilarJobCard({ job, index, onSave, isSaved }) {
    const score = job.analysis?.fit_score || job.match_score || 0;
    const accentColors = ['border-l-teal-400', 'border-l-sky-400', 'border-l-violet-400', 'border-l-amber-400', 'border-l-rose-400', 'border-l-indigo-400'];
    const accent = accentColors[index % accentColors.length];

    return (
        <div className={`bg-white dark:bg-[#1C1B19] rounded-lg border border-ink-100 dark:border-[#2E2B27] hover:border-ink-200 dark:hover:border-[#3A3732] hover:shadow-sm transition-all p-4 border-l-[3px] ${accent}`}>
            <div className="flex items-start gap-3">
                <CompanyLogo
                    company={job.company}
                    applyUrl={job.apply_url}
                    size={32}
                    colorIndex={index}
                />
                <div className="flex-1 min-w-0">
                    <Link
                        href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                        onClick={() => {
                            try {
                                const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                localStorage.setItem(key, JSON.stringify(job));
                            } catch (e) { /* ignore */ }
                        }}
                        className="text-[13px] font-medium text-ink-900 dark:text-ink-100 hover:text-teal-600 transition-colors line-clamp-1"
                    >
                        {stripHtml(job.title)}
                    </Link>
                    <p className="text-[11px] text-ink-400 mt-0.5 truncate">
                        {stripHtml(job.company)}
                        {job.location && <> &middot; {stripHtml(job.location)}</>}
                    </p>
                </div>
                {score > 0 && (
                    <span className={`text-[11px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md ${
                        score >= 75 ? 'bg-teal-50 text-teal-600' : score >= 55 ? 'bg-amber-50 text-amber-600' : 'bg-ink-50 text-ink-500'
                    }`}>
                        {Math.round(score)}%
                    </span>
                )}
            </div>

            {/* Skill tags */}
            {job.heuristic_breakdown?.matches?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5 ml-[44px]">
                    {job.heuristic_breakdown.matches.slice(0, 3).map((m, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] bg-ink-50 dark:bg-[#252420] border border-ink-100 dark:border-[#2E2B27] text-ink-500 dark:text-ink-400 font-medium">
                            {m.skill}
                        </span>
                    ))}
                    {job.heuristic_breakdown.matches.length > 3 && (
                        <span className="px-1 py-0.5 rounded text-[9px] text-ink-300">
                            +{job.heuristic_breakdown.matches.length - 3}
                        </span>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between mt-3 ml-[44px]">
                {job.source && (
                    <span className="text-[10px] text-ink-300">{job.source}</span>
                )}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onSave(job)}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                            isSaved ? 'text-sky-500 bg-sky-50' : 'text-ink-300 hover:text-sky-500 hover:bg-sky-50'
                        }`}
                        title={isSaved ? 'Saved' : 'Save'}
                    >
                        <Bookmark className={`w-3 h-3 ${isSaved ? 'fill-sky-500' : ''}`} />
                    </button>
                    <Link
                        href={`/dashboard/job/${encodeURIComponent(btoa(job.apply_url || job.title))}`}
                        onClick={() => {
                            try {
                                const key = `job_detail_${btoa(job.apply_url || job.title)}`;
                                localStorage.setItem(key, JSON.stringify(job));
                            } catch (e) { /* ignore */ }
                        }}
                        className="flex items-center gap-1 text-[10px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
                    >
                        View <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ---- Main Page ----

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const toast = useToast();
    const {
        savedJobIds, toggleSaveJob, appliedJobIds, toggleAppliedJob,
        profile, apiKeys, experienceYears: userExperienceYears,
        jobs, savedJobsData, recommendations
    } = useApp();
    const [job, setJob] = useState(null);
    const [coverLetter, setCoverLetter] = useState(null);
    const [isLoadingCoverLetter, setIsLoadingCoverLetter] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);

    useEffect(() => {
        try {
            const id = decodeURIComponent(params.id);
            const stored = localStorage.getItem(`job_detail_${id}`);
            if (stored) setJob(JSON.parse(stored));
        } catch (e) {
            console.error('Failed to load job detail:', e);
        }
    }, [params.id]);

    // Derived data
    const derived = useMemo(() => {
        if (!job) return null;
        const multipliers = job.heuristic_breakdown?.multipliers || {};
        const matches = job.heuristic_breakdown?.matches || [];
        const analysis = job.analysis;
        const score = analysis?.fit_score || job.match_score || 0;
        const skillCount = matches.length;
        const rawDescription = job.description || job.summary || '';
        const cleanDescription = stripHtml(rawDescription);
        const requiredExp = extractExperienceFromDescription(cleanDescription);
        const requiredEdu = extractEducationFromDescription(cleanDescription);

        return { multipliers, matches, analysis, score, skillCount, cleanDescription, requiredExp, requiredEdu };
    }, [job]);

    // Similar jobs — find from cached search results + recommendations
    const similarJobs = useMemo(() => {
        if (!job) return [];
        const currentUrl = job.apply_url;
        const currentTitle = stripHtml(job.title).toLowerCase();
        const currentSkills = (job.heuristic_breakdown?.matches || []).map(m => m.skill.toLowerCase());
        const currentCompany = stripHtml(job.company).toLowerCase();

        // Collect all candidate jobs
        const allJobs = [
            ...(jobs || []),
            ...(savedJobsData || []),
            ...(recommendations || []),
        ];

        // Deduplicate by apply_url
        const seen = new Set([currentUrl]);
        const candidates = [];
        for (const j of allJobs) {
            if (!j.apply_url || seen.has(j.apply_url)) continue;
            seen.add(j.apply_url);
            candidates.push(j);
        }

        // Score similarity
        const scored = candidates.map(candidate => {
            let sim = 0;
            const cTitle = stripHtml(candidate.title).toLowerCase();
            const cCompany = stripHtml(candidate.company).toLowerCase();
            const cSkills = (candidate.heuristic_breakdown?.matches || []).map(m => m.skill.toLowerCase());

            // Title word overlap
            const titleWords = currentTitle.split(/\s+/).filter(w => w.length > 2);
            const cTitleWords = cTitle.split(/\s+/).filter(w => w.length > 2);
            const titleOverlap = titleWords.filter(w => cTitleWords.includes(w)).length;
            sim += titleOverlap * 3;

            // Skill overlap
            const skillOverlap = currentSkills.filter(s => cSkills.includes(s)).length;
            sim += skillOverlap * 2;

            // Same company slight boost
            if (cCompany === currentCompany) sim += 1;

            // Match score factor
            const cScore = candidate.analysis?.fit_score || candidate.match_score || 0;
            sim += cScore / 50;

            return { ...candidate, _similarity: sim };
        });

        return scored
            .filter(j => j._similarity > 1)
            .sort((a, b) => b._similarity - a._similarity)
            .slice(0, 6);
    }, [job, jobs, savedJobsData, recommendations]);

    if (!job || !derived) {
        return (
            <div className="max-w-3xl mx-auto py-16 text-center">
                <div className="w-16 h-16 bg-ink-50 dark:bg-[#252420] rounded-[14px] flex items-center justify-center mx-auto mb-5">
                    <Briefcase className="w-8 h-8 text-ink-300 dark:text-ink-600" />
                </div>
                <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100 mb-2">Job Not Found</h3>
                <p className="text-sm text-ink-400 dark:text-ink-500 mb-8">This job may have expired or the link is invalid.</p>
                <Link href="/dashboard/search" className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Search
                </Link>
            </div>
        );
    }

    const { multipliers, matches, analysis, score, skillCount, cleanDescription, requiredExp, requiredEdu } = derived;

    const isSaved = savedJobIds.has(job.apply_url);
    const isApplied = appliedJobIds.has(job.apply_url);

    const relevanceSections = [
        {
            label: 'Skill Relevance',
            key: 'semantic', fallback: 'depth',
            detail: skillCount > 0
                ? `${skillCount} matched: ${matches.slice(0, 6).map(m => m.skill).join(', ')}`
                : 'No direct skill overlaps detected',
        },
        {
            label: 'Title Relevance',
            key: 'coherence', fallback: 'roleFamily',
            detail: profile?.headline
                ? `"${profile.headline}" vs "${stripHtml(job.title)}"`
                : `Comparing against "${stripHtml(job.title)}"`,
        },
        {
            label: 'Experience Level',
            key: 'seniority',
            detail: (() => {
                const s = parseFloat(multipliers.seniority);
                if (s >= 1.1) return 'Great fit for your experience level';
                if (s >= 0.8) return 'Slight stretch — reachable';
                if (s >= 0.4) return 'May require more experience';
                return 'Significant experience gap';
            })(),
        },
        {
            label: 'Location Match',
            key: 'location',
            detail: stripHtml(job.location) || 'Remote / Not specified',
        },
        {
            label: 'Career Track',
            key: 'roleFamily',
            detail: (() => {
                const r = parseFloat(multipliers.roleFamily);
                if (r >= 1.0) return 'Aligned with your career path';
                if (r >= 0.6) return 'Adjacent field — transferable skills apply';
                return 'Different career track';
            })(),
        },
    ];

    const handleCoverLetter = async () => {
        if (coverLetter) return;
        setIsLoadingCoverLetter(true);
        try {
            const res = await fetch('/api/cover-letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job, profile }),
            });
            if (!res.ok) throw new Error('Failed to generate');
            const data = await res.json();
            setCoverLetter(data.letter);
        } catch (err) {
            toast(err.message || 'Cover letter failed', 'error');
        } finally {
            setIsLoadingCoverLetter(false);
        }
    };

    const handleCopy = async () => {
        if (!coverLetter) return;
        await navigator.clipboard.writeText(coverLetter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Description truncation
    const DESC_PREVIEW_LENGTH = 800;
    const isDescriptionLong = cleanDescription.length > DESC_PREVIEW_LENGTH;
    const displayDescription = showFullDescription
        ? cleanDescription
        : cleanDescription.slice(0, DESC_PREVIEW_LENGTH);

    return (
        <div className="max-w-[1200px] space-y-5 pb-8 px-4 lg:px-0">
            {/* Back */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-700 transition-colors cursor-pointer"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to results
            </button>

            {/* ===== HEADER CARD ===== */}
            <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] overflow-hidden">
                {/* Top accent */}
                <div className="h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-sky-500" />

                <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-5">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                            <CompanyLogo
                                company={job.company}
                                applyUrl={job.apply_url}
                                size={48}
                                colorIndex={0}
                            />
                            <div className="flex-1 min-w-0">
                                <h1 className="text-[17px] sm:text-[20px] font-semibold text-ink-900 dark:text-ink-100 leading-tight mb-2.5">
                                    {stripHtml(job.title)}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-500 dark:text-ink-400">
                                    <span className="flex items-center gap-1.5 font-medium text-ink-700 dark:text-ink-300">
                                        <Building2 className="w-4 h-4 text-ink-400" />
                                        {stripHtml(job.company)}
                                    </span>
                                    <span className="w-px h-4 bg-ink-200" />
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-ink-400" />
                                        {stripHtml(job.location) || 'Remote'}
                                    </span>
                                    {job.source && (
                                        <>
                                            <span className="w-px h-4 bg-ink-200" />
                                            <span className="px-2 py-0.5 rounded-md bg-ink-50 dark:bg-[#252420] text-ink-500 dark:text-ink-400 border border-ink-200 dark:border-[#2E2B27] text-[11px] font-medium">
                                                via {job.source}
                                            </span>
                                        </>
                                    )}
                                    {job.date_posted && (
                                        <>
                                            <span className="w-px h-4 bg-ink-200" />
                                            <span className="flex items-center gap-1 text-ink-400 text-[12px]">
                                                <Clock className="w-3.5 h-3.5" />
                                                {stripHtml(job.date_posted)}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <ScoreGauge score={score} heuristicBreakdown={job.heuristic_breakdown} profile={profile} />
                    </div>

                    {/* Quick stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-5">
                        <StatBox
                            label="Your Exp."
                            value={`${userExperienceYears || 0} yrs`}
                            sublabel={requiredExp ? `Required: ${requiredExp} yrs` : null}
                            icon={Briefcase}
                            accentColor="teal"
                        />
                        <StatBox
                            label="Skills Matched"
                            value={skillCount}
                            sublabel={`of ${profile?.skills?.length || 0} total`}
                            icon={Target}
                            accentColor="sky"
                        />
                        <StatBox
                            label="Match Score"
                            value={`${Math.round(score)}%`}
                            sublabel={score >= 75 ? 'Strong match' : score >= 50 ? 'Moderate' : 'Low'}
                            icon={BadgeCheck}
                            accentColor="violet"
                        />
                        <StatBox
                            label="Education"
                            value={requiredEdu || 'Any'}
                            sublabel={requiredEdu ? 'Required' : 'Not specified'}
                            icon={GraduationCap}
                            accentColor="amber"
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-5 pt-5 border-t border-ink-100 dark:border-[#2E2B27]">
                        <button
                            onClick={() => {
                                if (job.apply_url) window.open(job.apply_url, '_blank');
                                else {
                                    const q = encodeURIComponent(`${job.title} ${job.company} apply`);
                                    window.open(`https://www.google.com/search?q=${q}`, '_blank');
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-500 text-white rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
                        >
                            Apply Now <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                        </button>
                        <button
                            onClick={() => toggleSaveJob(job)}
                            className={`px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer ${
                                isSaved
                                    ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400'
                                    : 'bg-white dark:bg-[#1C1B19] border-ink-200 dark:border-[#2E2B27] text-ink-500 dark:text-ink-400 hover:text-sky-600 hover:border-sky-200'
                            }`}
                        >
                            <Bookmark className={`w-4 h-4 inline mr-1.5 ${isSaved ? 'fill-sky-500' : ''}`} />
                            {isSaved ? 'Saved' : 'Save'}
                        </button>
                        <button
                            onClick={() => toggleAppliedJob(job)}
                            className={`px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer ${
                                isApplied
                                    ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400'
                                    : 'bg-white dark:bg-[#1C1B19] border-ink-200 dark:border-[#2E2B27] text-ink-500 dark:text-ink-400 hover:text-teal-600 hover:border-teal-200'
                            }`}
                        >
                            <Check className={`w-4 h-4 inline mr-1.5 ${isApplied ? 'stroke-[3]' : ''}`} />
                            {isApplied ? 'Applied' : 'Mark Applied'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== THREE-COLUMN LAYOUT ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px,280px] gap-5">
                {/* Left column — Main content */}
                <div className="space-y-5">
                    {/* Why this fits you — AI insight card */}
                    {analysis && !analysis.isBlurredTeaser && (
                        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-[10px] p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center">
                                    <Lightbulb className="w-3.5 h-3.5 text-teal-600" />
                                </div>
                                <h2 className="text-[13px] font-semibold text-teal-900">Why this fits you</h2>
                            </div>
                            <p className="text-[13px] text-teal-800/80 leading-relaxed mb-3">
                                {analysis.verdict || (analysis.strong_signals?.length > 0
                                    ? analysis.strong_signals.join('. ') + '.'
                                    : 'This role aligns with your profile based on our analysis.')}
                            </p>
                            {matches.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {matches.slice(0, 10).map((m, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-100/70 text-teal-700 border border-teal-200/50"
                                        >
                                            {m.skill}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Job Description — FULL */}
                    <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-ink-100 dark:border-[#2E2B27]">
                            <h2 className="text-[13px] font-semibold text-ink-900 dark:text-ink-100">Job Description</h2>
                        </div>
                        <div className="px-5 py-4">
                            {cleanDescription ? (
                                <>
                                    <div className="text-[13px] text-ink-600 dark:text-ink-400 leading-relaxed whitespace-pre-wrap break-words">
                                        {displayDescription}
                                        {isDescriptionLong && !showFullDescription && '...'}
                                    </div>
                                    {isDescriptionLong && (
                                        <button
                                            onClick={() => setShowFullDescription(!showFullDescription)}
                                            className="mt-3 text-[12px] font-medium text-teal-600 hover:text-teal-700 cursor-pointer"
                                        >
                                            {showFullDescription ? 'Show less' : 'Read full description'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <AlertCircle className="w-8 h-8 text-ink-300 dark:text-ink-600 mx-auto mb-2" />
                                    <p className="text-[13px] text-ink-400 dark:text-ink-500 mb-1">No description available for this listing.</p>
                                    <p className="text-[11px] text-ink-300 dark:text-ink-600">Try viewing the full listing on the source site.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Analysis */}
                    {analysis && !analysis.isBlurredTeaser && (
                        <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-ink-100 dark:border-[#2E2B27] flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                                <h2 className="text-[13px] font-semibold text-ink-900 dark:text-ink-100">AI Analysis</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Strong Signals */}
                                    <div className="bg-teal-50/50 p-4 rounded-lg border border-teal-100">
                                        <h3 className="text-teal-700 font-medium text-[12px] mb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
                                            <Check className="w-3.5 h-3.5" />
                                            Strong Signals
                                        </h3>
                                        <ul className="space-y-1.5">
                                            {analysis.strong_signals?.map((s, i) => (
                                                <li key={i} className="text-[12px] text-teal-700/80 flex items-start gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Gaps */}
                                    {analysis.gaps?.length > 0 && (
                                        <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100">
                                            <h3 className="text-amber-700 font-medium text-[12px] mb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Gaps to Address
                                            </h3>
                                            <ul className="space-y-1.5">
                                                {analysis.gaps?.map((g, i) => (
                                                    <li key={i} className="text-[12px] text-amber-700/80 flex items-start gap-2">
                                                        <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                                        {g}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Verdict */}
                                <div className="bg-ink-50 dark:bg-[#252420] p-4 rounded-lg border border-ink-100 dark:border-[#2E2B27]">
                                    <h3 className="text-ink-700 dark:text-ink-300 font-medium text-[12px] mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                                        <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                                        Verdict
                                    </h3>
                                    <p className="text-[13px] text-ink-600 dark:text-ink-400 leading-relaxed">{analysis.verdict}</p>
                                    {analysis.salary_estimate && (
                                        <div className="mt-3 pt-3 border-t border-ink-200/60 dark:border-[#2E2B27]">
                                            <span className="text-[10px] uppercase tracking-wider text-ink-400 font-medium">Estimated Salary </span>
                                            <span className="text-ink-900 dark:text-ink-100 font-semibold text-[13px] ml-1">{analysis.salary_estimate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cover Letter */}
                    <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-ink-100 dark:border-[#2E2B27] flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-teal-500" />
                            <h2 className="text-[13px] font-semibold text-ink-900 dark:text-ink-100">Cover Letter</h2>
                        </div>
                        <div className="p-5">
                            {!coverLetter ? (
                                <button
                                    onClick={handleCoverLetter}
                                    disabled={isLoadingCoverLetter}
                                    className="flex items-center gap-2 text-[13px] font-medium text-teal-600 hover:text-teal-700 transition-colors py-2 px-4 rounded-lg hover:bg-teal-50 cursor-pointer disabled:opacity-50"
                                >
                                    {isLoadingCoverLetter ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                    ) : (
                                        <><FileText className="w-4 h-4" /> Generate Cover Letter</>
                                    )}
                                </button>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-end mb-3">
                                        <button
                                            onClick={handleCopy}
                                            className="flex items-center gap-1.5 text-[11px] font-medium text-ink-400 hover:text-teal-600 transition-colors px-3 py-1.5 rounded-md hover:bg-teal-50 cursor-pointer"
                                        >
                                            {copied ? <><CheckCheck className="w-3.5 h-3.5 text-teal-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                                        </button>
                                    </div>
                                    <div className="text-[13px] text-ink-600 dark:text-ink-400 leading-relaxed whitespace-pre-wrap break-words bg-ink-50 dark:bg-[#252420] rounded-lg p-4 border border-ink-100 dark:border-[#2E2B27]">
                                        {coverLetter}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== MIDDLE SIDEBAR — Relevance & Skills ===== */}
                <div className="space-y-5">
                    {/* Relevance Breakdown */}
                    <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] overflow-hidden">
                        <div className="px-4 py-3 border-b border-ink-100 dark:border-[#2E2B27] flex items-center gap-2">
                            <BrainCircuit className="w-3.5 h-3.5 text-teal-500" />
                            <h2 className="text-[12px] font-semibold text-ink-900 dark:text-ink-100">Relevance</h2>
                        </div>
                        <div className="px-4 py-2">
                            {relevanceSections.map((section) => {
                                const val = multipliers[section.key] ?? multipliers[section.fallback] ?? 0.8;
                                const dots = multiplierToDots(val);
                                return (
                                    <div key={section.label} className="py-3 border-b border-ink-50 dark:border-[#2E2B27]/50 last:border-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[12px] font-medium text-ink-700 dark:text-ink-300">{section.label}</span>
                                            <DotIndicator filled={dots} />
                                        </div>
                                        <p className="text-[10px] text-ink-400 dark:text-ink-500 leading-snug">{section.detail}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Matched Skills */}
                    <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] overflow-hidden">
                        <div className="px-4 py-3 border-b border-ink-100 dark:border-[#2E2B27]">
                            <h2 className="text-[12px] font-semibold text-ink-900 dark:text-ink-100">
                                Matched Skills
                                {skillCount > 0 && <span className="ml-1.5 text-teal-500 font-normal">({skillCount})</span>}
                            </h2>
                        </div>
                        <div className="px-4 py-3">
                            {matches.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {matches.map((m, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-teal-50 border border-teal-100 text-[11px] text-teal-700 font-medium">
                                            {m.skill}
                                            <span className="ml-1 text-teal-400 font-mono text-[9px]">+{m.value}</span>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-ink-400">No direct skill matches detected. The role may require adjacent skills.</p>
                            )}

                            {/* User's unmatched skills */}
                            {profile?.skills && profile.skills.length > 0 && matches.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-ink-100 dark:border-[#2E2B27]">
                                    <h3 className="text-[10px] font-medium text-ink-400 dark:text-ink-500 uppercase tracking-wider mb-2">Your Other Skills</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {profile.skills
                                            .filter(s => !matches.some(m => m.skill.toLowerCase() === s.toLowerCase()))
                                            .slice(0, 10)
                                            .map((skill, i) => (
                                                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] text-ink-400 dark:text-ink-500 bg-ink-50 dark:bg-[#252420] border border-ink-100 dark:border-[#2E2B27]">
                                                    {skill}
                                                </span>
                                            ))}
                                        {profile.skills.length - matches.length > 10 && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] text-ink-300">
                                                +{profile.skills.length - matches.length - 10} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Requirements (extracted) */}
                    {(requiredExp || requiredEdu) && (
                        <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] overflow-hidden">
                            <div className="px-4 py-3 border-b border-ink-100 dark:border-[#2E2B27]">
                                <h2 className="text-[12px] font-semibold text-ink-900 dark:text-ink-100">Requirements</h2>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                {requiredExp && (
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="text-ink-500 dark:text-ink-400">Experience</span>
                                        <span className="font-medium text-ink-700 dark:text-ink-300">{requiredExp} years</span>
                                    </div>
                                )}
                                {requiredEdu && (
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="text-ink-500 dark:text-ink-400">Education</span>
                                        <span className="font-medium text-ink-700 dark:text-ink-300">{requiredEdu}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-ink-500 dark:text-ink-400">Your Experience</span>
                                    <span className="font-medium text-ink-700 dark:text-ink-300">{userExperienceYears || 0} years</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Apply CTA */}
                    {!isApplied && (
                        <div className="bg-ink-50 dark:bg-[#252420] rounded-[10px] border border-ink-100 dark:border-[#2E2B27] p-4 text-center">
                            <p className="text-[12px] text-ink-500 dark:text-ink-400 mb-3">Ready to apply?</p>
                            <button
                                onClick={() => {
                                    if (job.apply_url) window.open(job.apply_url, '_blank');
                                    else {
                                        const q = encodeURIComponent(`${job.title} ${job.company} apply`);
                                        window.open(`https://www.google.com/search?q=${q}`, '_blank');
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-500 text-white rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
                            >
                                Apply Now <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                            </button>
                        </div>
                    )}
                </div>

                {/* ===== RIGHT SIDEBAR — Similar Jobs ===== */}
                <div className="space-y-5">
                    <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] overflow-hidden">
                        <div className="px-4 py-3.5 border-b border-ink-100 dark:border-[#2E2B27]">
                            <h2 className="text-[13px] font-semibold text-ink-900 dark:text-ink-100 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                                While you&apos;re here
                            </h2>
                            <p className="text-[10px] text-ink-400 dark:text-ink-500 mt-0.5">Jobs similar to this one</p>
                        </div>

                        {similarJobs.length > 0 ? (
                            <div className="p-3 space-y-2.5">
                                {similarJobs.map((sj, i) => (
                                    <SimilarJobCard
                                        key={sj.apply_url || i}
                                        job={sj}
                                        index={i}
                                        onSave={toggleSaveJob}
                                        isSaved={savedJobIds.has(sj.apply_url)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center">
                                <div className="w-10 h-10 bg-ink-50 dark:bg-[#252420] rounded-[10px] flex items-center justify-center mx-auto mb-3">
                                    <Briefcase className="w-5 h-5 text-ink-300 dark:text-ink-600" />
                                </div>
                                <p className="text-[12px] text-ink-400 dark:text-ink-500 mb-1">No similar jobs found yet</p>
                                <p className="text-[11px] text-ink-300 dark:text-ink-600 leading-relaxed">
                                    Run a search first to build your job pool. Similar jobs will appear here automatically.
                                </p>
                                <Link
                                    href="/dashboard/search"
                                    className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
                                >
                                    Search Jobs <ChevronRight className="w-3 h-3" />
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Company info card */}
                    <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] overflow-hidden">
                        <div className="px-4 py-3 border-b border-ink-100 dark:border-[#2E2B27]">
                            <h2 className="text-[12px] font-semibold text-ink-900 dark:text-ink-100">About the Company</h2>
                        </div>
                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <CompanyLogo
                                    company={job.company}
                                    applyUrl={job.apply_url}
                                    size={40}
                                    colorIndex={0}
                                />
                                <div>
                                    <h3 className="text-[13px] font-medium text-ink-900 dark:text-ink-100">{stripHtml(job.company)}</h3>
                                    <p className="text-[11px] text-ink-400 dark:text-ink-500">{stripHtml(job.location) || 'Remote'}</p>
                                </div>
                            </div>

                            {/* Other jobs from same company */}
                            {(() => {
                                const companyName = stripHtml(job.company).toLowerCase();
                                const sameCompany = [...(jobs || []), ...(savedJobsData || [])]
                                    .filter(j => j.apply_url !== job.apply_url && stripHtml(j.company).toLowerCase() === companyName)
                                    .slice(0, 3);

                                if (sameCompany.length === 0) return null;

                                return (
                                    <div className="mt-3 pt-3 border-t border-ink-100 dark:border-[#2E2B27]">
                                        <h4 className="text-[10px] font-medium text-ink-400 dark:text-ink-500 uppercase tracking-wider mb-2">
                                            More from {stripHtml(job.company)}
                                        </h4>
                                        <div className="space-y-2">
                                            {sameCompany.map((sj, i) => (
                                                <Link
                                                    key={i}
                                                    href={`/dashboard/job/${encodeURIComponent(btoa(sj.apply_url || sj.title))}`}
                                                    onClick={() => {
                                                        try {
                                                            const key = `job_detail_${btoa(sj.apply_url || sj.title)}`;
                                                            localStorage.setItem(key, JSON.stringify(sj));
                                                        } catch (e) { /* ignore */ }
                                                    }}
                                                    className="block text-[12px] text-ink-600 dark:text-ink-400 hover:text-teal-600 transition-colors truncate"
                                                >
                                                    {stripHtml(sj.title)}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {job.apply_url && (
                                <a
                                    href={job.apply_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 mt-3 pt-3 border-t border-ink-100 dark:border-[#2E2B27] text-[12px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
                                >
                                    View original listing <ExternalLink className="w-3 h-3 opacity-50" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
