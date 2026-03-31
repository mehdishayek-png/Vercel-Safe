import { Zap, Layers, Brain, Gauge, ShieldCheck, Globe, SlidersHorizontal, Sparkles, Target, Filter } from 'lucide-react';

const ENGINE_STATS = [
    { value: '10', label: 'Scoring Signals', desc: 'Skills, seniority, location, role depth, and more', icon: SlidersHorizontal, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/20 dark:text-brand-400 border-brand-100 dark:border-brand-800/30' },
    { value: '8+', label: 'Job Sources', desc: 'LinkedIn, Indeed, Google Jobs, career pages', icon: Globe, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-400 border-sky-100 dark:border-sky-800/30' },
    { value: 'Hybrid', label: 'AI + Heuristic', desc: 'Fast local scoring verified by LLM analysis', icon: Brain, color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/20 dark:text-accent-400 border-accent-100 dark:border-accent-800/30' },
    { value: '<1s', label: 'Per 100 Jobs', desc: 'Phase 1 scores hundreds with zero API calls', icon: Gauge, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30' },
];

const MULTIPLIERS = [
    { name: 'Keyword Density', icon: Target },
    { name: 'Seniority Fit', icon: Layers },
    { name: 'Location Match', icon: Globe },
    { name: 'Role Family', icon: Filter },
    { name: 'Semantic Affinity', icon: Sparkles },
];

export function DashboardPreview() {
    return (
        <section className="py-24 relative overflow-hidden bg-surface-50 dark:bg-[#0f1117]">
            <div className="container mx-auto px-4 max-w-5xl">
                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800/30 text-brand-600 dark:text-brand-400 text-xs font-medium mb-4">
                        <Zap className="w-3.5 h-3.5" />
                        Under the Hood
                    </div>
                    <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight mb-3 text-gray-900 dark:text-white">Precision matching, not keyword spam</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-sm md:text-base">Every job is scored through independent signals — seniority alignment, location enforcement, role family detection, and semantic similarity.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    {ENGINE_STATS.map((stat, i) => (
                        <div key={i} className={`border rounded-2xl p-6 ${stat.color}`}>
                            <stat.icon className="w-5 h-5 mb-3 opacity-70" />
                            <div className="font-headline text-2xl font-bold mb-0.5">{stat.value}</div>
                            <div className="text-sm font-semibold mb-1">{stat.label}</div>
                            <div className="text-xs opacity-60">{stat.desc}</div>
                        </div>
                    ))}
                </div>

                <div className="glass-card dark:bg-slate-950/70 border border-outline-variant/10 dark:border-slate-800/50 rounded-2xl shadow-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Multipliers</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {MULTIPLIERS.map((m, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-50 dark:bg-slate-800/50 border border-outline-variant/10 dark:border-slate-800/50 text-sm text-gray-600 dark:text-gray-400">
                                <m.icon className="w-3.5 h-3.5 text-gray-400" />
                                {m.name}
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/30 text-sm text-brand-600 dark:text-brand-400 font-medium">
                            +5 more
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
