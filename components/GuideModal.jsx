import { motion } from 'framer-motion';
import { X, Upload, Target, Search, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

export function GuideModal({ onClose }) {
    const steps = [
        {
            icon: Upload,
            title: "1. Upload Resume",
            desc: "Upload your PDF resume. Our AI extracts your skills, experience, and key achievements instantly."
        },
        {
            icon: Target,
            title: "2. Set Targets",
            desc: "Choose your target locations (or Remote) and roles. The agent will filter the noise for you."
        },
        {
            icon: Search,
            title: "3. Deep Scan",
            desc: "The agent scans live job boards, reads every description, and scores each against your profile."
        }
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="relative bg-white rounded-2xl shadow-elevated max-w-lg w-full overflow-hidden border border-surface-200"
            >
                <div className="h-1 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer"
                >
                    <X size={18} />
                </button>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">How Midas Works</h2>
                        <p className="text-sm text-gray-500">Three steps to your next role.</p>
                    </div>

                    <div className="space-y-5">
                        {steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-start gap-4"
                            >
                                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                                    <step.icon className="w-4 h-4 text-brand-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{step.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-center">
                        <Button onClick={onClose} className="w-full sm:w-auto min-w-[180px]">
                            Got it
                            <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
