import { Pencil } from 'lucide-react';

export function CandidatePanel({
    profile, jobTitle, setJobTitle, isEditingTitle, setIsEditingTitle,
    newSkill, setNewSkill, handleAddSkill, handleRemoveSkill,
}) {
    return (
        <>
            {/* Identity */}
            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1 font-headline">Candidate</div>
                <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100 mb-2 font-headline">{profile.name}</div>
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1.5 font-headline">Target Role</div>
                {isEditingTitle ? (
                    <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingTitle(false); }}
                        autoFocus
                        className="w-full text-[14px] font-semibold text-gray-900 dark:text-gray-100 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl px-3 py-2.5 outline-none focus:border-brand-400 transition-colors"
                        placeholder="e.g. Product Operations Specialist"
                    />
                ) : (
                    <button
                        onClick={() => setIsEditingTitle(true)}
                        className="w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-xl border border-slate-200/60 dark:border-[#2d3140] bg-midas-surface-low/50 dark:bg-[#22252f] hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-200 cursor-pointer transition-colors group"
                    >
                        <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate font-headline">
                            {jobTitle || <span className="text-slate-400 font-normal">Click to set target role...</span>}
                        </span>
                        <Pencil className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                    </button>
                )}
            </div>

            {/* Skills */}
            <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                <div className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-3 font-headline">Skills</div>
                <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {profile.skills.map((skill) => (
                        <span key={skill} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-midas-surface-low dark:bg-[#22252f] border border-slate-200/60 dark:border-[#2d3140] text-xs text-gray-700 dark:text-gray-300 font-medium">
                            {skill}
                            <button onClick={() => handleRemoveSkill(skill)} className="text-slate-400 hover:text-red-500 cursor-pointer text-sm leading-none">&times;</button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                        placeholder="Add skill..."
                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200/60 dark:border-[#2d3140] text-xs text-gray-700 dark:text-gray-200 bg-midas-surface-low/50 dark:bg-[#22252f] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                    />
                    <button onClick={handleAddSkill} className="w-9 h-9 rounded-xl border border-slate-200/60 dark:border-[#2d3140] bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 text-brand-600 cursor-pointer flex items-center justify-center transition-colors font-bold">+</button>
                </div>
            </div>
        </>
    );
}
