import { motion } from 'framer-motion';
import { Upload, Search, CheckCircle } from 'lucide-react';

const steps = [
    {
        icon: Upload,
        title: "Upload Resume",
        desc: "Drop your PDF. We extract your skills, experience, and preferences instantly."
    },
    {
        icon: Search,
        title: "AI Hunts Jobs",
        desc: "Our agent scans 50+ job boards and scores matches based on your unique profile."
    },
    {
        icon: CheckCircle,
        title: "Get Interviews",
        desc: "Review high-quality matches and auto-apply. Watch the interview invites roll in."
    }
];

export function HowItWorks() {
    return (
        <section className="py-32 bg-white/0 relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">How it works</h2>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Connector Line */}
                    <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                    {steps.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="relative text-center"
                        >
                            <div className="relative mx-auto w-24 h-24 rounded-full bg-[#0A0A0A] border border-indigo-500/30 flex items-center justify-center mb-8 z-10 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]">
                                <s.icon className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">{s.title}</h3>
                            <p className="text-white/60 max-w-xs mx-auto">{s.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
