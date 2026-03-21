import { Upload, Loader2, FileText, Target, Zap, TrendingUp, BrainCircuit, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function OnboardingPanel({ isParsing, fileInputRef, handleFileUpload }) {
    return (
        <div className="space-y-5">
            {/* Hero Upload Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-secondary-DEFAULT/5 dark:from-brand-900/20 dark:via-[#1a1d27] dark:to-secondary-DEFAULT/10 rounded-2xl border border-brand-100/60 dark:border-brand-800/30 shadow-sm">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-brand-200/20 to-secondary-DEFAULT/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-gradient-to-tr from-emerald-200/15 to-sky-200/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative p-8 md:p-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:gap-10">
                        {/* Left — messaging */}
                        <div className="flex-1 min-w-0 mb-6 lg:mb-0">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30 mb-4">
                                <Sparkles className="w-3 h-3" />
                                AI Intelligence Engine
                            </span>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 font-headline tracking-tight leading-tight">
                                Upload your resume to<br className="hidden sm:block" />
                                <span className="text-brand-600 dark:text-brand-400">activate neural matching.</span>
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-md leading-relaxed">
                                Our AI engine extracts your skills, experience, and career trajectory — then scores thousands of live opportunities against your profile in under 60 seconds.
                            </p>
                        </div>

                        {/* Right — upload zone */}
                        <div className="lg:w-[280px] shrink-0">
                            <div
                                role="button"
                                tabIndex={0}
                                aria-label="Upload resume PDF"
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                                className="group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-brand-200 dark:border-brand-800/50 bg-white/60 dark:bg-[#1a1d27]/60 backdrop-blur-sm hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1d27]"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/40 dark:to-brand-800/20 flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
                                    {isParsing ? (
                                        <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
                                    ) : (
                                        <Upload className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                                    )}
                                </div>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">
                                    {isParsing ? 'Analyzing...' : 'Upload Resume'}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">PDF &middot; Max 10MB</p>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} aria-label="Choose PDF resume file" />
                        </div>
                    </div>
                </div>
            </div>

            {/* How It Works + Tips in a grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* How it works */}
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                            <BrainCircuit className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase font-headline">How it works</span>
                    </div>
                    <div className="space-y-5">
                        {[
                            { icon: FileText, iconBg: 'bg-brand-50 dark:bg-brand-900/20', iconColor: 'text-brand-600 dark:text-brand-400', title: 'Upload your resume', desc: 'We extract your skills, experience, and target role automatically.' },
                            { icon: Target, iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400', title: 'Refine your profile', desc: 'Edit your target title, add or remove skills, and set your preferred location.' },
                            { icon: Zap, iconBg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-secondary-DEFAULT dark:text-violet-400', title: 'Scan the market', desc: 'Midas scores thousands of live jobs against your profile in under a minute.' },
                        ].map((step, i) => (
                            <div key={i} className="flex gap-3.5 items-start">
                                <div className="relative">
                                    <div className={`w-9 h-9 rounded-xl ${step.iconBg} flex items-center justify-center shrink-0`}>
                                        <step.icon className={`w-4.5 h-4.5 ${step.iconColor}`} />
                                    </div>
                                    {i < 2 && (
                                        <div className="absolute top-9 left-1/2 -translate-x-1/2 w-px h-5 bg-slate-200 dark:bg-[#2d3140]" />
                                    )}
                                </div>
                                <div className="pt-0.5">
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">{step.title}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tips for best results */}
                <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase font-headline">Tips for best results</span>
                    </div>
                    <div className="space-y-4">
                        {[
                            { text: <>Use a <strong className="text-gray-900 dark:text-gray-100">specific target title</strong> — &ldquo;Product Operations Specialist&rdquo; beats &ldquo;Manager&rdquo;</> },
                            { text: <>Add <strong className="text-gray-900 dark:text-gray-100">tools you use</strong> as skills (Zendesk, Jira, Workato) — not just soft skills</> },
                            { text: <>Set your <strong className="text-gray-900 dark:text-gray-100">experience level</strong> accurately to filter out roles that are too senior or junior</> },
                            { text: <>Try <strong className="text-gray-900 dark:text-gray-100">Explore Adjacent Roles</strong> to discover opportunities outside your exact title</> },
                        ].map((tip, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <Sparkles className="w-3 h-3 text-brand-500 dark:text-brand-400" />
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{tip.text}</p>
                            </div>
                        ))}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-[#2d3140]">
                        <div className="text-center">
                            <p className="text-xl font-extrabold text-brand-600 dark:text-brand-400 font-headline">7</p>
                            <p className="text-[9px] font-bold tracking-[0.1em] text-gray-400 uppercase mt-0.5">Scoring Signals</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-headline">4</p>
                            <p className="text-[9px] font-bold tracking-[0.1em] text-gray-400 uppercase mt-0.5">Job Sources</p>
                        </div>
                        <div className="text-xl text-center">
                            <p className="font-extrabold text-secondary-DEFAULT dark:text-violet-400 font-headline">&lt;60s</p>
                            <p className="text-[9px] font-bold tracking-[0.1em] text-gray-400 uppercase mt-0.5">Scan Time</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
