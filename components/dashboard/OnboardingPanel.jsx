import { useState } from 'react';
import { Upload, Loader2, FileText, Target, Zap, TrendingUp, Search } from 'lucide-react';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';

export function OnboardingPanel({ isParsing, fileInputRef, handleFileUpload, handleQuickStart }) {
    const [quickTitle, setQuickTitle] = useState('');
    const [quickSkills, setQuickSkills] = useState('');
    const [quickLocation, setQuickLocation] = useState('');

    const onQuickSubmit = (e) => {
        e.preventDefault();
        if (!quickTitle.trim()) return;
        const skillsArray = quickSkills.split(',').map(s => s.trim()).filter(Boolean);
        handleQuickStart(quickTitle, skillsArray, quickLocation.trim());
    };

    return (
        <>
            <div className="glass-panel rounded-[2rem] overflow-hidden border border-transparent shadow-2xl shadow-brand-500/10">
                <div className="h-1 bg-flow-gradient" />
                <div className="p-5">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative p-6 md:p-10 text-center cursor-pointer rounded-[2rem] border-2 border-dashed border-white/40 hover:border-brand-400 bg-brand-50/30 hover:bg-brand-50/60 transition-all duration-200 group"
                    >
                        <div className="w-14 h-14 bg-flow-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow group-hover:scale-105 transition-transform duration-200">
                            {isParsing ? <Loader2 className="animate-spin text-white w-6 h-6" /> : <Upload className="text-white w-6 h-6" />}
                        </div>
                        <p className="font-headline text-sm font-semibold text-gray-900">Upload Resume</p>
                        <p className="text-xs text-gray-400 mt-1">PDF &middot; Max 10MB</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                    
                    <div className="mt-6 border-t border-gray-100 pt-6">
                        <div className="text-center mb-4">
                            <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Or quick start manually</span>
                        </div>
                        <form onSubmit={onQuickSubmit} className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Target Job Title (e.g. Frontend Engineer)"
                                    className="w-full text-sm py-2.5 px-3 rounded-lg border border-gray-200 bg-surface-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 text-gray-900"
                                    value={quickTitle}
                                    onChange={(e) => setQuickTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Top 3 Skills (comma separated)"
                                    className="w-full text-sm py-2.5 px-3 rounded-lg border border-gray-200 bg-surface-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 text-gray-900"
                                    value={quickSkills}
                                    onChange={(e) => setQuickSkills(e.target.value)}
                                />
                            </div>
                            <div>
                                <LocationAutocomplete
                                    value={quickLocation}
                                    onChange={(val) => setQuickLocation(val)}
                                    placeholder="Location (e.g. Austin, TX or Remote)"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!quickTitle.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <Search className="w-4 h-4" />
                                Start Scanning
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Getting Started Guide */}
            <div className="glass-panel rounded-[2rem] p-5 border border-transparent">
                <div className="font-headline text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-4">How it works</div>
                <div className="space-y-4">
                    <div className="flex gap-3.5 items-start">
                        <div className="w-8 h-8 rounded-full bg-flow-gradient flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-gray-900">Upload your resume</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">We extract your skills, experience, and target role automatically.</p>
                        </div>
                    </div>
                    <div className="flex gap-3.5 items-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-gray-900">Refine your profile</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">Edit your target title, add or remove skills, and set your preferred location.</p>
                        </div>
                    </div>
                    <div className="flex gap-3.5 items-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-gray-900">Scan the market</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">Midas scores thousands of live jobs against your profile in under a minute.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="glass-panel rounded-[2rem] border border-transparent p-5">
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
