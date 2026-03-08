import { motion } from 'framer-motion';
import { Brain, FileText, Zap, Target, Globe, ShieldCheck } from 'lucide-react';
import { Card } from './ui/Card';

const features = [
    {
        icon: Brain,
        title: "10-Layer Scoring Engine",
        desc: "Every job is scored through 10 independent multipliers — seniority, location, role family, semantic similarity, and more."
    },
    {
        icon: FileText,
        title: "Instant Resume Parsing",
        desc: "Drop your PDF and we extract skills, experience level, and job preferences in seconds using AI."
    },
    {
        icon: Globe,
        title: "Multi-Source Aggregation",
        desc: "Pulls jobs from LinkedIn, Indeed, Google Jobs, Naukri, and more — all scored against your profile."
    },
    {
        icon: Target,
        title: "AI Deep Scan",
        desc: "Get a detailed fit analysis on any job — skill gaps, salary estimates, and an honest verdict powered by LLMs."
    },
    {
        icon: Zap,
        title: "Hybrid AI + Heuristic",
        desc: "Local scoring handles speed. LLM verification handles nuance. Combined for accuracy you can trust."
    },
    {
        icon: ShieldCheck,
        title: "Noise Elimination",
        desc: "Scams, wrong-country postings, irrelevant roles, and seniority mismatches are killed before you see them."
    }
];

export function Features() {
    return (
        <section className="py-32 relative">
            <div className="container mx-auto px-4">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Supercharge your job search</h2>
                    <p className="text-gray-500 text-xl max-w-2xl mx-auto">
                        Everything you need to land your next role, powered by next-gen AI.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <Card key={i} hover className="p-8 group bg-white border-gray-200 hover:border-blue-300">
                            <div className="mb-6 p-4 rounded-2xl bg-blue-50 w-fit group-hover:bg-blue-100 transition-colors">
                                <f.icon className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-semibold mb-3 text-gray-900">{f.title}</h3>
                            <p className="text-gray-500 leading-relaxed text-lg">{f.desc}</p>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
