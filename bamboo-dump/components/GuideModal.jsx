import { motion } from 'framer-motion';
import { X, Upload, Target, Search, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

export function GuideModal({ onClose }) {
    const steps = [
        {
            icon: Upload,
            title: "1. Upload Resume",
            desc: "Upload your PDF resume. Our AI extracts your skills, experience, and key achievements instantly. No sign-up required."
        },
        {
            icon: Target,
            title: "2. Set Targets",
            desc: "Choose your target locations (or Remote) and roles. The agent will use this to filter the noise."
        },
        {
            icon: Search,
            title: "3. Deep Scan",
            desc: "The agent scans live job boards. It then uses LLMs to read every job description and score it against your specific profile."
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
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100"
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">How JobBot AI Works</h2>
                        <p className="text-gray-500">Autonomous job hunting in 3 simple steps</p>
                    </div>

                    <div className="space-y-8 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-100" />

                        {steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="relative flex items-start gap-6"
                            >
                                <div className="relative z-10 w-12 h-12 rounded-xl bg-white border-2 border-blue-50 flex items-center justify-center shadow-sm shrink-0">
                                    <step.icon className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-10 flex justify-center">
                        <Button onClick={onClose} className="w-full sm:w-auto min-w-[200px]">
                            Got it, let's go
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
