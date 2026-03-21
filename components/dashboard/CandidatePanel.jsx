import { Pencil, Compass } from 'lucide-react';

export function CandidatePanel({
    profile, jobTitle, setJobTitle, isEditingTitle, setIsEditingTitle,
    newSkill, setNewSkill, handleAddSkill, handleRemoveSkill,
}) {
    return (
        <>
            {/* Identity */}
            <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] p-5">
                <div className="text-[10px] font-semibold tracking-widest text-ink-400 uppercase mb-1">Candidate</div>
                <div className="text-lg font-bold text-ink-900 dark:text-ink-100 mb-1.5">{profile.name}</div>
                <div className="text-[11px] font-semibold tracking-widest text-ink-400 uppercase mb-1">Target Role</div>
                {isEditingTitle ? (
                    <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingTitle(false); }}
                        autoFocus
                        className="w-full text-[14px] font-semibold text-ink-900 dark:text-ink-100 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg px-3 py-2 outline-none focus:border-brand-400 transition-colors"
                        placeholder="e.g. Product Operations Specialist"
                    />
                ) : (
                    <button
                        onClick={() => setIsEditingTitle(true)}
                        className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg border border-ink-200 dark:border-[#2E2B27] bg-surface-50 dark:bg-[#252420] hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-200 cursor-pointer transition-colors group"
                    >
                        <span className="text-[14px] font-semibold text-ink-900 dark:text-ink-100 truncate">
                            {jobTitle || <span className="text-ink-400 font-normal">Click to set target role...</span>}
                        </span>
                        <Pencil className="w-3.5 h-3.5 text-ink-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                    </button>
                )}
            </div>

            {/* Skills */}
            <div className="bg-white dark:bg-[#1C1B19] rounded-[10px] border border-ink-200 dark:border-[#2E2B27] p-5">
                <div className="text-[10px] font-semibold tracking-widest text-ink-400 uppercase mb-3">Skills</div>
                <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {profile.skills.map((skill) => (
                        <span key={skill} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-50 dark:bg-[#252420] border border-ink-200 dark:border-[#2E2B27] text-xs text-ink-700 dark:text-ink-300 font-medium">
                            {skill}
                            <button onClick={() => handleRemoveSkill(skill)} className="text-ink-400 hover:text-red-500 cursor-pointer text-sm leading-none">&times;</button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                        placeholder="Add skill..."
                        className="flex-1 px-3 py-2 rounded-lg border border-ink-200 dark:border-[#2E2B27] text-xs text-ink-700 dark:text-ink-200 bg-surface-50 dark:bg-[#252420] outline-none focus:border-brand-500 transition-colors"
                    />
                    <button onClick={handleAddSkill} className="w-8 h-8 rounded-lg border border-ink-200 dark:border-[#2E2B27] bg-surface-50 dark:bg-[#252420] hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 cursor-pointer text-ink-500 flex items-center justify-center transition-colors">+</button>
                </div>
            </div>
        </>
    );
}
