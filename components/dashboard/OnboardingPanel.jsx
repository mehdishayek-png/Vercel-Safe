import { Upload, Loader2, FileText, Target, Zap, TrendingUp } from 'lucide-react';

export function OnboardingPanel({ isParsing, fileInputRef, handleFileUpload }) {
    return (
        <>
            <div className="bg-white rounded-xl border border-surface-200 p-5">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="upload-zone p-6 md:p-10 text-center cursor-pointer"
                >
                    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                        {isParsing ? <Loader2 className="animate-spin text-brand-600" /> : <Upload className="text-brand-600 w-5 h-5" />}
                    </div>
                    <p className="text-sm font-medium text-gray-900">Upload Resume</p>
                    <p className="text-xs text-gray-400 mt-1">PDF &middot; Max 10MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </div>

            {/* Getting Started Guide */}
            <div className="bg-white rounded-xl border border-surface-200 p-5">
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">How it works</div>
                <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-3.5 h-3.5 text-brand-600" />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-gray-900">Upload your resume</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">We extract your skills, experience, and target role automatically.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Target className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-gray-900">Refine your profile</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Edit your target title, add or remove skills, and set your preferred location.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-lg bg-accent-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Zap className="w-3.5 h-3.5 text-accent-600" />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-gray-900">Scan the market</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Midas scores thousands of live jobs against your profile in under a minute.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-brand-50 to-accent-50 rounded-xl border border-brand-100 p-5">
                <div className="text-[10px] font-semibold tracking-widest text-brand-600 uppercase mb-3">Tips for best results</div>
                <ul className="space-y-2 text-[12px] text-gray-600">
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
