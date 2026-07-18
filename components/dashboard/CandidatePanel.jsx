import { BriefcaseBusiness, Pencil, Plus, UserRound, X } from 'lucide-react';

function initials(name) {
    return String(name || 'Candidate')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export function CandidatePanel({
    profile, jobTitle, setJobTitle, isEditingTitle, setIsEditingTitle,
    newSkill, setNewSkill, handleAddSkill, handleRemoveSkill,
}) {
    return (
        <div className="divide-y divide-slate-900/[0.07]">
            <section className="px-5 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 font-headline text-xs font-extrabold text-white shadow-sm">
                        {initials(profile.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            <UserRound className="h-3 w-3" /> Candidate profile
                        </div>
                        <p className="mt-1 truncate font-headline text-[15px] font-extrabold tracking-[-0.015em] text-slate-950">
                            {profile.name || 'Candidate'}
                        </p>
                    </div>
                </div>

                <div className="relative mt-5 rounded-2xl border border-brand-100 bg-brand-50/55 px-4 py-3.5 before:absolute before:bottom-3 before:left-0 before:top-3 before:w-[3px] before:rounded-r-full before:bg-brand-600">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                            <BriefcaseBusiness className="h-3 w-3" /> Matching target
                        </div>
                        {!isEditingTitle && (
                            <button
                                type="button"
                                onClick={() => setIsEditingTitle(true)}
                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold text-slate-500 transition-colors hover:bg-white hover:text-brand-700"
                            >
                                <Pencil className="h-3 w-3" /> Edit
                            </button>
                        )}
                    </div>
                    {isEditingTitle ? (
                        <input
                            id="target-role"
                            type="text"
                            value={jobTitle}
                            onChange={(event) => setJobTitle(event.target.value)}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(event) => { if (event.key === 'Enter') setIsEditingTitle(false); }}
                            autoFocus
                            aria-label="Matching target"
                            className="mt-2 w-full border-b border-brand-300 bg-transparent pb-1.5 font-headline text-[15px] font-bold text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400"
                            placeholder="e.g. Product Operations Specialist"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsEditingTitle(true)}
                            className="mt-2 block w-full truncate text-left font-headline text-[15px] font-bold tracking-[-0.01em] text-slate-950"
                        >
                            {jobTitle || <span className="font-normal text-slate-400">Set the role you want to find</span>}
                        </button>
                    )}
                </div>
            </section>

            <section className="px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">Skill signals</h2>
                        <p className="mt-1 text-[11px] text-slate-500">Used to score every role.</p>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[9px] font-semibold text-slate-500">
                        {profile.skills.length} active
                    </span>
                </div>

                <div className="mt-3 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {profile.skills.map((skill) => (
                        <span key={skill} className="group inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 shadow-[0_1px_1px_rgba(24,31,46,0.03)]">
                            {skill}
                            <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill)}
                                aria-label={`Remove ${skill}`}
                                className="text-brand-300 transition-colors hover:text-rose-500 focus-visible:text-rose-500"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>

                <div className="mt-3 flex overflow-hidden rounded-xl border border-slate-900/10 bg-surface-50 transition-colors focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
                    <input
                        value={newSkill}
                        onChange={(event) => setNewSkill(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && handleAddSkill()}
                        placeholder="Add another skill"
                        aria-label="Add another skill"
                        className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <button
                        type="button"
                        onClick={handleAddSkill}
                        aria-label="Add skill"
                        className="grid w-10 place-items-center border-l border-slate-900/10 text-brand-700 transition-colors hover:bg-brand-50"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </section>
        </div>
    );
}
