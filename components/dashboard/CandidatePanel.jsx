import { Pencil, Compass } from 'lucide-react';

export function CandidatePanel({
    profile, jobTitle, setJobTitle, isEditingTitle, setIsEditingTitle,
    newSkill, setNewSkill, handleAddSkill, handleRemoveSkill,
}) {
    return (
        <>
            {/* Identity */}
            <div className="glass-panel rounded-[2rem] border border-transparent p-5">
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Candidate</div>
                <div className="font-headline text-lg font-bold text-gray-900 mb-2">{profile.name}</div>
                <div className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Target Role</div>
                {isEditingTitle ? (
                    <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingTitle(false); }}
                        autoFocus
                        className="w-full text-[14px] font-semibold text-gray-900 bg-transparent border-b-2 border-brand-500 px-1 py-1.5 outline-none transition-colors"
                        placeholder="e.g. Product Operations Specialist"
                    />
                ) : (
                    <button
                        onClick={() => setIsEditingTitle(true)}
                        className="w-full flex items-center justify-between gap-2 text-left px-1 py-1.5 border-b border-transparent hover:border-brand-200 cursor-pointer transition-all duration-200 group"
                    >
                        <span className="text-[14px] font-semibold text-gray-900 truncate">
                            {jobTitle || <span className="text-gray-400 font-normal">Click to set target role...</span>}
                        </span>
                        <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                    </button>
                )}
            </div>

            {/* Skills */}
            <div className="glass-panel rounded-[2rem] border border-transparent p-5">
                <div className="font-headline text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">Skills</div>
                <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {profile.skills.map((skill) => (
                        <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium border border-brand-100 hover:bg-brand-100 transition-colors">
                            {skill}
                            <button onClick={() => handleRemoveSkill(skill)} className="text-brand-400 hover:text-red-500 cursor-pointer text-sm leading-none">&times;</button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                        placeholder="Add skill..."
                        className="flex-1 px-3 py-2 rounded-xl border border-outline-variant/10 text-xs text-gray-700 bg-surface-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                    />
                    <button onClick={handleAddSkill} className="w-8 h-8 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-600 cursor-pointer flex items-center justify-center transition-colors font-semibold">+</button>
                </div>
            </div>
        </>
    );
}
