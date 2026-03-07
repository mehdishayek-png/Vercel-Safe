import { Card } from './ui/Card';
import { Zap, Layers, Brain, Gauge, ShieldCheck, Globe, SlidersHorizontal, Sparkles, Target, Filter } from 'lucide-react';

const ENGINE_STATS = [
    { value: '10', label: 'Scoring Multipliers', desc: 'Seniority, location, role depth, semantics, and more', icon: SlidersHorizontal, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { value: '5+', label: 'Job Sources Scanned', desc: 'LinkedIn, Indeed, Google Jobs, Naukri, and others', icon: Globe, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { value: 'AI + Heuristic', label: 'Hybrid Engine', desc: 'Local scoring verified by LLM — not just keyword spam', icon: Brain, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { value: '<1s', label: 'Per 100 Jobs Scored', desc: 'Phase 1 scores hundreds of jobs with zero API calls', icon: Gauge, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
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
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-4">
                        <Zap className="w-3.5 h-3.5" />
                        Under the Hood
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">Precision matching, not keyword spam</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">Every job is scored through 10 independent multipliers — seniority alignment, location enforcement, role family detection, semantic similarity, and more. Junk gets killed. Relevant roles rise.</p>
                </div>

                <div className="relative mx-auto max-w-5xl">
                    <div className="absolute -inset-10 bg-gradient-to-r from-blue-200/40 to-purple-200/40 rounded-3xl blur-3xl -z-10 opacity-60" />

                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {ENGINE_STATS.map((stat, i) => (
                            <Card key={i} className={`border p-5 ${stat.color}`}>
                                <stat.icon className="w-5 h-5 mb-3 opacity-70" />
                                <div className="text-2xl font-bold mb-0.5">{stat.value}</div>
                                <div className="text-sm font-semibold mb-1">{stat.label}</div>
                                <div className="text-xs opacity-70">{stat.desc}</div>
                            </Card>
                        ))}
                    </div>

                    {/* Multiplier Strip */}
                    <Card className="border-gray-200 bg-white shadow-lg p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Multipliers</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {MULTIPLIERS.map((m, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-sm text-gray-700">
                                    <m.icon className="w-3.5 h-3.5 text-gray-400" />
                                    {m.name}
                                </div>
                            ))}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-sm text-indigo-600 font-medium">
                                +5 more
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
}
