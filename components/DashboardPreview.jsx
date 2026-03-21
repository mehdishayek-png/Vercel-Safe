import { Zap, Layers, Brain, Gauge, ShieldCheck, Globe, SlidersHorizontal, Sparkles, Target, Filter } from 'lucide-react';

const ENGINE_STATS = [
    { value: '10', label: 'Scoring Layers', desc: 'Seniority, location, role depth, semantics', icon: SlidersHorizontal },
    { value: '5+', label: 'Job Sources', desc: 'LinkedIn, Indeed, Google Jobs, and more', icon: Globe },
    { value: 'Hybrid', label: 'AI + Heuristic', desc: 'Local scoring verified by LLM analysis', icon: Brain },
    { value: '<1s', label: 'Per 100 Jobs', desc: 'Phase 1 scores hundreds with zero API calls', icon: Gauge },
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
        <section className="py-20 bg-white dark:bg-[#1C1B19]">
            <div className="container mx-auto px-6 lg:px-10 max-w-6xl">
                <div className="mb-12 max-w-xl">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-brand-500" />
                        <span className="text-sm font-medium text-brand-600 dark:text-brand-400">Under the Hood</span>
                    </div>
                    <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3 text-ink-900 dark:text-ink-50">Precision matching, not keyword spam</h2>
                    <p className="text-ink-500 dark:text-ink-400 text-sm md:text-base">Every job is scored through independent multipliers — seniority alignment, location enforcement, role family detection, and semantic similarity.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {ENGINE_STATS.map((stat, i) => (
                        <div key={i} className="border border-ink-200 dark:border-ink-800 rounded-[10px] p-5 bg-surface-50 dark:bg-ink-900">
                            <stat.icon className="w-4 h-4 mb-3 text-brand-500 dark:text-brand-400" />
                            <div className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50 mb-0.5">{stat.value}</div>
                            <div className="text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">{stat.label}</div>
                            <div className="text-xs text-ink-400">{stat.desc}</div>
                        </div>
                    ))}
                </div>

                <div className="border border-ink-200 dark:border-ink-800 rounded-[10px] bg-white dark:bg-[#1C1B19] p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="w-4 h-4 text-ink-400" />
                        <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Active Multipliers</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {MULTIPLIERS.map((m, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-sm text-ink-600 dark:text-ink-300">
                                <m.icon className="w-3.5 h-3.5 text-ink-400" />
                                {m.name}
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/40 text-sm text-brand-700 dark:text-brand-400 font-medium">
                            +5 more
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
