export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-white py-16 px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="max-w-3xl mx-auto">
                <a href="/" className="text-sm text-indigo-600 hover:underline mb-8 block">&larr; Back to JobBot</a>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                <p className="text-sm text-gray-400 mb-8">Last updated: March 2, 2026</p>

                <div className="prose prose-gray max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            When you use JobBot AI, we process the following data:
                        </p>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mt-2">
                            <li><strong>Resume Data:</strong> Your uploaded PDF is parsed in-memory to extract skills, experience, and job preferences. We do NOT store your resume file on our servers.</li>
                            <li><strong>Search Preferences:</strong> Location, job title, experience level, and skills you provide are used to query job search APIs.</li>
                            <li><strong>Account Data:</strong> When you sign in via Clerk (Google/email), your authentication ID is used to track your token balance and scan usage on our servers.</li>
                            <li><strong>Usage Data:</strong> Token balance, daily scan count, and deep scan usage are stored server-side in a secure Redis database (Upstash), tied to your authenticated account.</li>
                            <li><strong>Payment Data:</strong> Processed entirely by Razorpay. We never see or store your card details, UPI ID, or bank information.</li>
                            <li><strong>Local Storage:</strong> Profile data and search results are cached locally in your browser&apos;s localStorage for convenience. This data never leaves your device unless you initiate a search.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Data</h2>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                            <li>To match you with relevant job listings from Google Jobs, WeWorkRemotely, Lever, RemoteOK, and other sources.</li>
                            <li>To generate AI-powered match analysis using LLM providers (OpenRouter/Claude).</li>
                            <li>To process payments via Razorpay for token purchases.</li>
                            <li>To enforce usage limits and track your token balance server-side.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Third-Party Services</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            We use the following third-party services:
                        </p>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mt-2">
                            <li><strong>SerpAPI:</strong> For fetching Google Jobs results. Your search query and location are sent to their API.</li>
                            <li><strong>OpenRouter / Claude:</strong> For AI-powered job analysis. Anonymized job data and skill summaries are sent for scoring.</li>
                            <li><strong>Clerk:</strong> For authentication. Clerk&apos;s privacy policy applies to account data.</li>
                            <li><strong>Razorpay:</strong> For payment processing. Razorpay&apos;s privacy policy governs all payment data.</li>
                            <li><strong>Upstash Redis:</strong> For server-side storage of token balances and usage counters. Data is encrypted in transit and at rest.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. AI Training Disclaimer</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            <strong>Your resume data is NOT used to train any AI models.</strong> All processing is in-memory and ephemeral. Job descriptions and your skills are sent to LLM APIs solely for generating match scores, and are not retained by those services for training purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Profile data and search results are stored in your browser&apos;s localStorage and can be cleared at any time using the &quot;Clear Data&quot; button. Server-side data (token balance, scan counters) is tied to your authenticated account and retained as long as your account exists. Daily scan counters automatically reset every 24 hours.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            You may request deletion of your server-side data (token balance, scan history) at any time by contacting us. You can clear all local data instantly via the dashboard.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            For privacy-related inquiries, contact us at <a href="mailto:privacy@jobbot.ai" className="text-indigo-600 hover:underline">privacy@jobbot.ai</a>.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
