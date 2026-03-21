import { Card } from './ui/Card';
import { Zap, Layers, Brain, Gauge, ShieldCheck, Globe, SlidersHorizontal, Sparkles, Target, Filter } from 'lucide-react';

const ENGINE_STATS = [
    { value: '10', label: 'Scoring Layers', desc: 'Seniority, location, role depth, semantics', icon: SlidersHorizontal, color: 'text-brand-600 bg-brand-50 border-brand-100' },
    { value: '5+', label: 'Job Sources', desc: 'LinkedIn, Indeed, Google Jobs, and more', icon: Globe, color: 'text-sky-600 bg-sky-50 border-sky-100' },
    { value: 'Hybrid', label: 'AI + Heuristic', desc: 'Local scoring verified by LLM analysis', icon: Brain, color: 'text-accent-600 bg-accent-50 border-accent-100' },
    { value: '<1s', label: 'Per 100 Jobs', desc: 'Phase 1 scores hundreds with zero API calls', icon: Gauge, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
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
        <section className="py-20 relative overflow-hidden">
            <div className="container mx-auto px-4 max-w-5xl">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-medium mb-4">
                        <Zap className="w-3.5 h-3.5" />
                        Under the Hood
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-gray-900">Precision matching, not keyword spam</h2>
                    <p className="text-gray-900 dark:text-white max-w-2xl mx-auto text-sm md:text-base">Every job is scored through independent multipliers — seniority alignment, location enforcement, role family detection, and semantic similarity.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                    {ENGINE_STATS.map((stat, i) => (
                        <div key={i} className={`border rounded-xl p-5 ${stat.color}`}>
                            <stat.icon className="w-5 h-5 mb-3 opacity-70" />
                            <div className="text-2xl font-bold mb-0.5">{stat.value}</div>
                            <div className="text-sm font-semibold mb-1">{stat.label}</div>
                            <div className="text-xs opacity-60">{stat.desc}</div>
                        </div>
                    ))}
                </div>

                <div className="bg-white border border-surface-200 rounded-xl shadow-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="w-4 h-4 text-gray-900 dark:text-white" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Active Multipliers</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {MULTIPLIERS.map((m, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200 text-sm text-gray-900 dark:text-white">
                                <m.icon className="w-3.5 h-3.5 text-gray-900 dark:text-white" />
                                {m.name}
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-100 text-sm text-brand-600 font-medium">
                            +5 more
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
