import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import { Check, Clock, X } from 'lucide-react';

export function DashboardPreview() {
    return (
        <section className="py-20 relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="relative mx-auto max-w-5xl">
                    {/* Glows */}
                    <div className="absolute -inset-10 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-3xl blur-3xl -z-10 opacity-40" />

                    <Card className="border-white/10 bg-[#0A0A0A]/90 overflow-hidden">
                        {/* Fake Browser Header */}
                        <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            <div className="ml-4 px-3 py-1 bg-black/40 rounded text-xs text-white/40 flex-1 font-mono">jobbot.ai/dashboard</div>
                        </div>

                        {/* Dashboard Content */}
                        <div className="p-8 grid grid-cols-3 gap-6">
                            {/* Sidebar */}
                            <div className="col-span-1 space-y-4">
                                <div className="h-24 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4">
                                    <div className="text-sm text-indigo-300 mb-1">Weekly Applications</div>
                                    <div className="text-3xl font-bold text-indigo-400">124</div>
                                </div>
                                <div className="h-24 rounded-xl bg-green-500/5 border border-green-500/10 p-4">
                                    <div className="text-sm text-green-300 mb-1">Interviews</div>
                                    <div className="text-3xl font-bold text-green-400">3</div>
                                </div>
                            </div>

                            {/* Main List */}
                            <div className="col-span-2 space-y-3">
                                {[
                                    { r: "Senior Frontend Engineer", c: "Linear", s: "Applied", d: "2m ago", i: Check, cl: "text-green-400" },
                                    { r: "Product Designer", c: "Vercel", s: "Screening", d: "1h ago", i: Clock, cl: "text-yellow-400" },
                                    { r: "Software Engineer", c: "OpenAI", s: "Applied", d: "3h ago", i: Check, cl: "text-green-400" },
                                ].map((job, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div>
                                            <div className="font-medium text-white">{job.r}</div>
                                            <div className="text-sm text-white/40">{job.c}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-white/30">{job.d}</span>
                                            <div className={`px-2 py-1 rounded text-xs bg-white/5 border border-white/10 ${job.cl} flex items-center gap-1`}>
                                                <job.i className="w-3 h-3" /> {job.s}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
}
