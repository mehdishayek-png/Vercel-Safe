export default function TermsOfService() {
    return (
        <main className="min-h-screen bg-white dark:bg-[#0f1117] py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <a href="/" className="text-sm text-brand-600 dark:text-brand-400 hover:underline mb-8 block">&larr; Back to Midas</a>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Terms of Service</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Last updated: March 2, 2026</p>

                <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">1. Service Description</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            Midas is an AI-powered job matching platform that analyzes your resume and preferences to find relevant job opportunities from multiple job databases and company career pages.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Token System &amp; Payments</h2>
                        <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <li>Free users receive 3 job scans per day and 3 AI deep analysis credits (lifetime).</li>
                            <li>Midas Search provides 2× result coverage and costs 2 tokens per scan (1 free per week).</li>
                            <li>Additional scans and analyses require tokens, available for purchase at ₹399 for 50 tokens.</li>
                            <li>See our <a href="/refund" className="text-brand-600 dark:text-brand-400 hover:underline">Refund & Cancellation Policy</a> for details on refunds.</li>
                            <li>Payments are processed by Razorpay.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">3. Accuracy Disclaimer</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            Job listings are sourced from third-party platforms and may not reflect real-time availability. Match scores and AI verdicts are estimates based on algorithmic analysis and should not be the sole basis for career decisions. We do not guarantee job placement or interview outcomes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">4. Acceptable Use</h2>
                        <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <li>Do not use automated tools or bots to interact with the service.</li>
                            <li>Do not attempt to bypass the token/paywall system.</li>
                            <li>Do not scrape or redistribute job listing data obtained through our platform.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">5. Limitation of Liability</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            Midas is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from the use of this service, including but not limited to missed job opportunities, inaccurate match scores, or service interruptions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">6. Contact</h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            For questions regarding these terms, contact us at <a href="mailto:midasmatchsupport@gmail.com" className="text-brand-600 dark:text-brand-400 hover:underline">midasmatchsupport@gmail.com</a>.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
