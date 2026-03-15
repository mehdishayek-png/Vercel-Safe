'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, ExternalLink, Bookmark, Check, MapPin, Building2, Clock, Sparkles, BrainCircuit, FileText, Copy, CheckCheck, Loader2, AlertCircle, Briefcase, ChevronRight, GraduationCap, Target, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/components/ui/Toast';

// ---- Utilities ----

function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
}

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
                        i < filled ? 'bg-teal-500' : 'bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );
}

function StatBox({ label, value, sublabel, icon: Icon }) {
    return (
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
            <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">{value}</div>
            {sublabel && <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>}
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
                <span className="text-[15px] font-bold" style={{ color }}>{score}</span>
            </div>
        </div>
    );
}

// ---- Main Page ----

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const toast = useToast();
    const { savedJobIds, toggleSaveJob, appliedJobIds, toggleAppliedJob, profile, apiKeys, experienceYears: userExperienceYears } = useApp();
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

    if (!job || !derived) {
        return (
            <div className="max-w-3xl mx-auto py-16 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Briefcase className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Not Found</h3>
                <p className="text-sm text-gray-400 mb-8">This job may have expired or the link is invalid.</p>
                <Link href="/dashboard/search" className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
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
                body: JSON.stringify({ job, profile, apiKey: apiKeys?.OPENROUTER_API_KEY }),
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
        <div className="max-w-[780px] mx-auto space-y-5 pb-8">
            {/* Back */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to results
            </button>

            {/* ===== HEADER CARD ===== */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Top accent */}
                <div className="h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-sky-500" />

                <div className="p-6">
                    <div className="flex items-start justify-between gap-5">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-[20px] font-semibold text-gray-900 leading-tight mb-2.5">
                                {stripHtml(job.title)}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
                                <span className="flex items-center gap-1.5 font-medium text-gray-700">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    {stripHtml(job.company)}
                                </span>
                                <span className="w-px h-4 bg-gray-200" />
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    {stripHtml(job.location) || 'Remote'}
                                </span>
                                {job.source && (
                                    <>
                                        <span className="w-px h-4 bg-gray-200" />
                                        <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 border border-gray-200 text-[11px] font-medium">
                                            via {job.source}
                                        </span>
                                    </>
                                )}
                                {job.date_posted && (
                                    <>
                                        <span className="w-px h-4 bg-gray-200" />
                                        <span className="flex items-center gap-1 text-gray-400 text-[12px]">
                                            <Clock className="w-3.5 h-3.5" />
                                            {stripHtml(job.date_posted)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <ScoreRing score={score} />
                    </div>

                    {/* Quick stats row */}
                    <div className="grid grid-cols-4 gap-3 mt-5">
                        <StatBox
                            label="Your Exp."
                            value={`${userExperienceYears || 0} yrs`}
                            sublabel={requiredExp ? `Required: ${requiredExp} yrs` : null}
                            icon={Briefcase}
                        />
                        <StatBox
                            label="Skills Matched"
                            value={skillCount}
                            sublabel={`of ${profile?.skills?.length || 0} total`}
                            icon={Target}
                        />
                        <StatBox
                            label="Match Score"
                            value={`${score}%`}
                            sublabel={score >= 75 ? 'Strong match' : score >= 50 ? 'Moderate' : 'Low'}
                            icon={BadgeCheck}
                        />
                        <StatBox
                            label="Education"
                            value={requiredEdu || 'Any'}
                            sublabel={requiredEdu ? 'Required' : 'Not specified'}
                            icon={GraduationCap}
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
                        <button
                            onClick={() => {
                                if (job.apply_url) window.open(job.apply_url, '_blank');
                                else {
                                    const q = encodeURIComponent(`${job.title} ${job.company} apply`);
                                    window.open(`https://www.google.com/search?q=${q}`, '_blank');
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
                        >
                            Apply Now <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                        </button>
                        <button
                            onClick={() => toggleSaveJob(job)}
                            className={`px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer ${
                                isSaved
                                    ? 'bg-sky-50 border-sky-200 text-sky-600'
                                    : 'bg-white border-gray-200 text-gray-500 hover:text-sky-600 hover:border-sky-200'
                            }`}
                        >
                            <Bookmark className={`w-4 h-4 inline mr-1.5 ${isSaved ? 'fill-sky-500' : ''}`} />
                            {isSaved ? 'Saved' : 'Save'}
                        </button>
                        <button
                            onClick={() => toggleAppliedJob(job)}
                            className={`px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer ${
                                isApplied
                                    ? 'bg-teal-50 border-teal-200 text-teal-600'
                                    : 'bg-white border-gray-200 text-gray-500 hover:text-teal-600 hover:border-teal-200'
                            }`}
                        >
                            <Check className={`w-4 h-4 inline mr-1.5 ${isApplied ? 'stroke-[3]' : ''}`} />
                            {isApplied ? 'Applied' : 'Mark Applied'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== TWO-COLUMN LAYOUT ===== */}
            <div className="grid grid-cols-[1fr,260px] gap-5">
                {/* Left column */}
                <div className="space-y-5">
                    {/* Job Description — FULL */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-gray-100">
                            <h2 className="text-[13px] font-semibold text-gray-900">Job Description</h2>
                        </div>
                        <div className="px-5 py-4">
                            <div className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
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
                        </div>
                    </div>

                    {/* AI Analysis */}
                    {analysis && !analysis.isBlurredTeaser && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                                <h2 className="text-[13px] font-semibold text-gray-900">AI Analysis</h2>
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
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h3 className="text-gray-700 font-medium text-[12px] mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                                        <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                                        Verdict
                                    </h3>
                                    <p className="text-[13px] text-gray-600 leading-relaxed">{analysis.verdict}</p>
                                    {analysis.salary_estimate && (
                                        <div className="mt-3 pt-3 border-t border-gray-200/60">
                                            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Estimated Salary </span>
                                            <span className="text-gray-900 font-semibold text-[13px] ml-1">{analysis.salary_estimate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cover Letter */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-teal-500" />
                            <h2 className="text-[13px] font-semibold text-gray-900">Cover Letter</h2>
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
                                            className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-teal-600 transition-colors px-3 py-1.5 rounded-md hover:bg-teal-50 cursor-pointer"
                                        >
                                            {copied ? <><CheckCheck className="w-3.5 h-3.5 text-teal-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                                        </button>
                                    </div>
                                    <div className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-100">
                                        {coverLetter}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== RIGHT SIDEBAR ===== */}
                <div className="space-y-5">
                    {/* Relevance Breakdown */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                            <BrainCircuit className="w-3.5 h-3.5 text-teal-500" />
                            <h2 className="text-[12px] font-semibold text-gray-900">Relevance</h2>
                        </div>
                        <div className="px-4 py-2">
                            {relevanceSections.map((section) => {
                                const val = multipliers[section.key] ?? multipliers[section.fallback] ?? 0.8;
                                const dots = multiplierToDots(val);
                                return (
                                    <div key={section.label} className="py-3 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[12px] font-medium text-gray-700">{section.label}</span>
                                            <DotIndicator filled={dots} />
                                        </div>
                                        <p className="text-[10px] text-gray-400 leading-snug">{section.detail}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Matched Skills */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <h2 className="text-[12px] font-semibold text-gray-900">
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
                                <p className="text-[11px] text-gray-400">No direct skill matches detected. The role may require adjacent skills.</p>
                            )}

                            {/* User's unmatched skills */}
                            {profile?.skills && profile.skills.length > 0 && matches.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <h3 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Your Other Skills</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {profile.skills
                                            .filter(s => !matches.some(m => m.skill.toLowerCase() === s.toLowerCase()))
                                            .slice(0, 10)
                                            .map((skill, i) => (
                                                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] text-gray-400 bg-gray-50 border border-gray-100">
                                                    {skill}
                                                </span>
                                            ))}
                                        {profile.skills.length - matches.length > 10 && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-300">
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
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h2 className="text-[12px] font-semibold text-gray-900">Requirements</h2>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                {requiredExp && (
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="text-gray-500">Experience</span>
                                        <span className="font-medium text-gray-700">{requiredExp} years</span>
                                    </div>
                                )}
                                {requiredEdu && (
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="text-gray-500">Education</span>
                                        <span className="font-medium text-gray-700">{requiredEdu}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-gray-500">Your Experience</span>
                                    <span className="font-medium text-gray-700">{userExperienceYears || 0} years</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Apply CTA */}
                    {!isApplied && (
                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center">
                            <p className="text-[12px] text-gray-500 mb-3">Ready to apply?</p>
                            <button
                                onClick={() => {
                                    if (job.apply_url) window.open(job.apply_url, '_blank');
                                    else {
                                        const q = encodeURIComponent(`${job.title} ${job.company} apply`);
                                        window.open(`https://www.google.com/search?q=${q}`, '_blank');
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
                            >
                                Apply Now <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
