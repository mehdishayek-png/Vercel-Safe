import { useState } from 'react';
import { X, Sparkles, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { useTokenStore } from '@/stores/token-store';
import { useRazorpay } from '@/lib/useRazorpay';
import { useToast } from '@/components/ui/Toast';

export function TokenPurchaseModal() {
    const { isPurchaseModalOpen, closePurchaseModal, refreshTokens } = useTokenStore();
    const toast = useToast();
    const [selectedPackage, setSelectedPackage] = useState('jobhunt');

    const { initiatePayment, isProcessing } = useRazorpay({
        onSuccess: async () => {
            await refreshTokens();
            toast('Tokens securely credited!', 'success');
            closePurchaseModal();
        },
        onError: (err) => {
            toast(err.message || 'Payment failed. Please try again.', 'error');
        }
    });

    if (!isPurchaseModalOpen) return null;

    const packages = [
        {
            id: 'starter',
            name: 'Starter',
            tokens: 25,
            price: 199,
            pricePerToken: 7.96,
            description: 'Perfect for testing the waters and applying to a few top roles.',
            popular: false,
        },
        {
            id: 'jobhunt',
            name: 'Job Hunt',
            tokens: 60,
            price: 399,
            pricePerToken: 6.65,
            description: 'Ideal for an active job search. Get deep intelligence on multiple roles.',
            popular: true,
        },
        {
            id: 'advantage',
            name: 'Unfair Advantage',
            tokens: 150,
            price: 799,
            pricePerToken: 5.32,
            description: 'Massive value. Out-compete the market with total coverage.',
            popular: false,
        }
    ];

    const handlePurchase = () => {
        initiatePayment(selectedPackage);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={closePurchaseModal}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Left side info panel */}
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-6 md:p-8 md:w-2/5 flex flex-col justify-center border-r border-teal-100">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-teal-100 flex items-center justify-center mb-6">
                         <Sparkles className="w-6 h-6 text-teal-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Invest in your career leverage.</h2>
                    <p className="text-[14px] text-gray-600 mb-8 leading-relaxed">
                        Top startups receive thousands of applications. Midas Tokens unlock our AI engine to reveal exactly how to position yourself as the undeniable top candidate.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800">Deep Scan Requirements</h4>
                                <p className="text-[12px] text-gray-500 mt-0.5">Identify hidden signals and red flags.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800">Salary Leverage Data</h4>
                                <p className="text-[12px] text-gray-500 mt-0.5">Know exactly what to ask for based on local market metrics.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800">Perfect Cover Letters</h4>
                                <p className="text-[12px] text-gray-500 mt-0.5">Auto-generate highly tailored pitches.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side pricing grid */}
                <div className="p-6 md:p-8 md:w-3/5 bg-white">
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Choose your token package</h3>
                        <p className="text-sm text-gray-500 mt-1">Secure payment processing via Razorpay</p>
                    </div>

                    <div className="grid gap-4 mb-8">
                        {packages.map((pkg) => (
                            <div 
                                key={pkg.id} 
                                onClick={() => setSelectedPackage(pkg.id)}
                                className={`relative cursor-pointer rounded-xl border-2 transition-all duration-200 p-4 flex items-center justify-between ${
                                    selectedPackage === pkg.id 
                                        ? 'border-teal-500 bg-teal-50/30 shadow-md ring-4 ring-teal-500/10' 
                                        : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                                }`}
                            >
                                {pkg.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                                        Most Popular
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-4">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        selectedPackage === pkg.id ? 'border-teal-500' : 'border-gray-300'
                                    }`}>
                                        {selectedPackage === pkg.id && <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />}
                                    </div>
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <h4 className="text-base font-semibold text-gray-900">{pkg.tokens} Tokens</h4>
                                            <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                                                ₹{pkg.pricePerToken.toFixed(2)}/ea
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-gray-500 mt-1">{pkg.description}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                    <div className="text-xl font-bold text-gray-900">₹{pkg.price}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handlePurchase}
                        disabled={isProcessing}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-gray-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Connecting to Razorpay...</>
                        ) : (
                            <>Secure Checkout • ₹{packages.find(p => p.id === selectedPackage)?.price}</>
                        )}
                    </button>
                    
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                         <ShieldAlert className="w-3.5 h-3.5" /> 100% secure encrypted payments
                    </div>
                </div>
            </div>
        </div>
    );
}
