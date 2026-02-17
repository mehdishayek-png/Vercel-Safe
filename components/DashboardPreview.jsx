import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import { Check, Clock, X } from 'lucide-react';

export function DashboardPreview() {
    return (
        <section className="py-20 relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="relative mx-auto max-w-5xl">
                    {/* Glows */}
                    <div className="absolute -inset-10 bg-gradient-to-r from-blue-200/40 to-purple-200/40 rounded-3xl blur-3xl -z-10 opacity-60" />

                    <Card className="border-gray-200 bg-white shadow-2xl overflow-hidden">
                        {/* Fake Browser Header */}
                        <div className="h-10 border-b border-gray-100 flex items-center px-4 gap-2 bg-gray-50">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                            <div className="ml-4 px-3 py-1 bg-white border border-gray-200 rounded text-xs text-gray-500 flex-1 font-mono shadow-sm">jobbot.ai/dashboard</div>
                        </div>

                        {/* Dashboard Content */}
                        <div className="p-8 grid grid-cols-3 gap-6">
                            {/* Sidebar */}
                            <div className="col-span-1 space-y-4">
                                <div className="h-24 rounded-xl bg-blue-50 border border-blue-100 p-4">
                                    <div className="text-sm text-blue-600 mb-1">Weekly Applications</div>
                                    <div className="text-3xl font-bold text-blue-700">124</div>
                                </div>
                                <div className="h-24 rounded-xl bg-green-50 border border-green-100 p-4">
                                    <div className="text-sm text-green-600 mb-1">Interviews</div>
                                    <div className="text-3xl font-bold text-green-700">3</div>
                                </div>
                            </div>

                            {/* Main List */}
                            <div className="col-span-2 space-y-3">
                                {[
                                    { r: "Senior Frontend Engineer", c: "Linear", s: "Applied", d: "2m ago", i: Check, cl: "text-green-600 bg-green-50 border-green-200" },
                                    { r: "Product Designer", c: "Vercel", s: "Screening", d: "1h ago", i: Clock, cl: "text-yellow-600 bg-yellow-50 border-yellow-200" },
                                    { r: "Software Engineer", c: "OpenAI", s: "Applied", d: "3h ago", i: Check, cl: "text-green-600 bg-green-50 border-green-200" },
                                ].map((job, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                                        <div>
                                            <div className="font-medium text-gray-900">{job.r}</div>
                                            <div className="text-sm text-gray-500">{job.c}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-400">{job.d}</span>
                                            <div className={`px-2 py-1 rounded text-xs border flex items-center gap-1 ${job.cl}`}>
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
