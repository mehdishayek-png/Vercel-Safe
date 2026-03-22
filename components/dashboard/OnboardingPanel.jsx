import { useState, useEffect } from 'react';
import { Upload, Loader2, FileText, SlidersHorizontal, Scan, Sparkles, TrendingUp } from 'lucide-react';

function LivePulse() {
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Scanning market liquidity...');

    useEffect(() => {
        const messages = [
            'Scanning market liquidity...',
            'Indexing new postings...',
            'Calibrating neural weights...',
            'Monitoring job boards...',
        ];
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % messages.length;
            setMessage(messages[i]);
            setProgress(prev => Math.min(prev + 15, 85));
        }, 3000);
        setProgress(25);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute bottom-4 right-4 bg-white dark:bg-[#1a1d27] rounded-xl border border-slate-200/60 dark:border-[#2d3140] shadow-lg p-3 w-[200px] z-10">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold tracking-[0.15em] text-gray-400 uppercase">Live Pulse</span>
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1.5">
                <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-[10px] text-gray-400 truncate">{message}</p>
        </div>
    );
}

export function OnboardingPanel({ isParsing, fileInputRef, handleFileUpload }) {
    return (
        <div className="space-y-6">
            {/* Hero Upload Section */}
            <div className="relative bg-gradient-to-br from-brand-50/80 via-white to-violet-50/40 dark:from-brand-900/10 dark:via-[#1a1d27] dark:to-violet-900/10 rounded-2xl border border-slate-200/60 dark:border-[#2d3140] shadow-sm overflow-hidden">
                {/* Background decoration */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-brand-100/30 to-violet-100/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-emerald-100/20 to-sky-100/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative p-8 md:p-10">
                    {/* Title */}
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 font-headline tracking-tight text-center leading-tight mb-2">
                        Upload your resume to<br />
                        <span className="text-brand-600 dark:text-brand-400">activate neural matching.</span>
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-lg mx-auto leading-relaxed mb-8">
                        Our AI engine extracts your skills, experience, and career trajectory
                        — then scores thousands of live opportunities against your profile in under 60 seconds.
                    </p>

                    {/* Upload Zone — centered */}
                    <div className="max-w-md mx-auto">
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Upload resume PDF"
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                            className="group flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2d3140] bg-white/70 dark:bg-[#1a1d27]/70 backdrop-blur-sm hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1d27]"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                                {isParsing ? (
                                    <Loader2 className="w-6 h-6 text-brand-600 dark:text-brand-400 animate-spin" />
                                ) : (
                                    <Upload className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                )}
                            </div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">
                                {isParsing ? 'Analyzing...' : 'Drag and drop your file'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1 mb-4">PDF &middot; Max 10MB</p>
                            <span className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors shadow-sm">
                                Select File
                            </span>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} aria-label="Choose PDF resume file" />
                    </div>
                </div>

                {/* Live Pulse Widget */}
                <LivePulse />
            </div>

            {/* How It Works — horizontal cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    {
                        icon: FileText,
                        iconBg: 'bg-brand-50 dark:bg-brand-900/20',
                        iconColor: 'text-brand-600 dark:text-brand-400',
                        step: '1',
                        title: 'Upload your resume',
                        desc: 'We extract your skills, experience, and target role automatically.',
                    },
                    {
                        icon: SlidersHorizontal,
                        iconBg: 'bg-violet-50 dark:bg-violet-900/20',
                        iconColor: 'text-violet-600 dark:text-violet-400',
                        step: '2',
                        title: 'Refine your profile',
                        desc: 'Edit your target title, add or remove skills, and set your preferred location.',
                    },
                    {
                        icon: Scan,
                        iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
                        iconColor: 'text-emerald-600 dark:text-emerald-400',
                        step: '3',
                        title: 'Scan the market',
                        desc: 'Midas scores thousands of live jobs against your profile in under a minute.',
                    },
                ].map((step) => (
                    <div key={step.step} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                        <div className={`w-10 h-10 rounded-xl ${step.iconBg} flex items-center justify-center mb-3`}>
                            <step.icon className={`w-5 h-5 ${step.iconColor}`} />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline mb-1">
                            {step.step}. {step.title}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{step.desc}</p>
                    </div>
                ))}
            </div>

            {/* Tips for Best Results */}
            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-5">
                    <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline tracking-tight">Tips for Best Results</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {[
                        { text: <>Use a <strong className="text-gray-900 dark:text-gray-100">specific target title</strong> — &ldquo;Product Operations Specialist&rdquo; beats &ldquo;Manager&rdquo;.</> },
                        { text: <>Add <strong className="text-gray-900 dark:text-gray-100">tools you use</strong> as skills (Zendesk, Jira, Workato) — not just soft skills.</> },
                        { text: <>Set your <strong className="text-gray-900 dark:text-gray-100">experience level</strong> accurately to filter out roles that are too senior or junior.</> },
                        { text: <>Try <strong className="text-gray-900 dark:text-gray-100">Explore Adjacent Roles</strong> to discover opportunities outside your exact title.</> },
                    ].map((tip, i) => (
                        <div key={i} className="flex gap-3 items-start">
                            <div className="w-5 h-5 rounded-md bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0 mt-0.5">
                                <TrendingUp className="w-3 h-3 text-brand-500 dark:text-brand-400" />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{tip.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-8 px-2">
                {[
                    { value: '7', label: 'Scoring Signals' },
                    { value: '4', label: 'Job Sources' },
                    { value: '<60s', label: 'Scan Time' },
                ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3">
                        {i > 0 && <div className="w-px h-8 bg-slate-200 dark:bg-[#2d3140] -ml-3" />}
                        <div className={i > 0 ? 'ml-2' : ''}>
                            <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline">{stat.value}</p>
                            <p className="text-[9px] font-bold tracking-[0.12em] text-gray-400 uppercase">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
