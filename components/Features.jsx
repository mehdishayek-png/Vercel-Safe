import { motion } from 'framer-motion';
import { Bot, FileText, Zap, Target, BarChart3, MessageSquare } from 'lucide-react';
import { Card } from './ui/Card';

const features = [
    {
        icon: Bot,
        title: "Autonomous Agent",
        desc: "Our AI browses job boards, filters for your criteria, and submits applications on your behalf."
    },
    {
        icon: FileText,
        title: "Resume Optimizer",
        desc: "Automatically tailors your resume keywords for each specific job description to beat ATS."
    },
    {
        icon: MessageSquare,
        title: "Cover Letter Generator",
        desc: "Writes distinct, human-like cover letters in seconds based on your experience and the role."
    },
    {
        icon: Target,
        title: "Smart Matching",
        desc: "Uses LLMs to score jobs based on actual fit, not just keyword matching."
    },
    {
        icon: Zap,
        title: "One-Click Apply",
        desc: "Apply to multiple jobs at once with a single command. Speed meets precision."
    },
    {
        icon: BarChart3,
        title: "Application Tracker",
        desc: "Visualize your pipeline. Track sent applications, interviews, and offers in real-time."
    }
];

export function Features() {
    return (
        <section className="py-32 relative">
            <div className="container mx-auto px-4">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Supercharge your job search</h2>
                    <p className="text-white/60 text-xl max-w-2xl mx-auto">
                        Everything you need to land your next role, powered by next-gen AI.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <Card key={i} hover className="p-8 group">
                            <div className="mb-6 p-4 rounded-2xl bg-white/5 w-fit group-hover:bg-indigo-500/20 transition-colors">
                                <f.icon className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-semibold mb-3">{f.title}</h3>
                            <p className="text-white/60 leading-relaxed">{f.desc}</p>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
