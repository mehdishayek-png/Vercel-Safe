import { Upload, Loader2, FileText, Target, Zap, TrendingUp } from 'lucide-react';

export function OnboardingPanel({ isParsing, fileInputRef, handleFileUpload }) {
    return (
        <>
            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload resume PDF"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                    className="upload-zone p-6 md:p-10 text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-[#1a1d27] rounded-xl"
                >
                    <div className="w-14 h-14 bg-gradient-to-br from-brand-100 to-secondary-DEFAULT/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        {isParsing ? <Loader2 className="animate-spin text-brand-600 w-6 h-6" /> : <Upload className="text-brand-600 w-6 h-6" />}
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-headline">Upload Resume</p>
                    <p className="text-xs text-slate-400 mt-1">PDF &middot; Max 10MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} aria-label="Choose PDF resume file" />
            </div>

            {/* Getting Started Guide */}
            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-4 font-headline">How it works</div>
                <div className="space-y-4">
                    <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-4 h-4 text-brand-600" />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 font-headline">Upload your resume</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">We extract your skills, experience, and target role automatically.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Target className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 font-headline">Refine your profile</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Edit your target title, add or remove skills, and set your preferred location.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-xl bg-secondary-DEFAULT/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Zap className="w-4 h-4 text-secondary-DEFAULT" />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 font-headline">Scan the market</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Midas scores thousands of live jobs against your profile in under a minute.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-brand-50 to-secondary-DEFAULT/5 dark:from-brand-900/20 dark:to-secondary-DEFAULT/10 rounded-2xl border border-brand-100 dark:border-brand-800/30 p-5">
                <div className="text-[10px] font-bold tracking-[0.15em] text-brand-600 uppercase mb-3 font-headline">Tips for best results</div>
                <ul className="space-y-2.5 text-[12px] text-gray-600 dark:text-gray-300">
                    <li className="flex gap-2 items-start">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                        <span>Use a <strong>specific target title</strong> &mdash; &ldquo;Product Operations Specialist&rdquo; beats &ldquo;Manager&rdquo;</span>
                    </li>
                    <li className="flex gap-2 items-start">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                        <span>Add <strong>tools you use</strong> as skills (Zendesk, Jira, Workato) &mdash; not just soft skills</span>
                    </li>
                    <li className="flex gap-2 items-start">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                        <span>Set your <strong>experience level</strong> accurately to filter out roles that are too senior or junior</span>
                    </li>
                    <li className="flex gap-2 items-start">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                        <span>Try <strong>Explore Adjacent Roles</strong> to discover opportunities outside your exact title</span>
                    </li>
                </ul>
            </div>
        </>
    );
}
