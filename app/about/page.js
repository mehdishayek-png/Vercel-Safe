export default function About() {
    return (
        <main className="min-h-screen bg-white py-16 px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="max-w-3xl mx-auto">
                <a href="/" className="text-sm text-indigo-600 hover:underline mb-8 block">&larr; Back to Midas</a>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">About Midas Match</h1>
                <p className="text-lg text-gray-500 mb-10">AI-powered job matching, built for job seekers who value their time.</p>

                <div className="prose prose-gray max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">Our Mission</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            We believe job searching shouldn&apos;t feel like a second job. Midas Match uses AI to scan thousands of openings across 8+ sources, score each one against your unique profile, and surface only the roles worth your time.
                        </p>
                        <p className="text-gray-600 text-sm leading-relaxed mt-3">
                            No more scrolling through irrelevant listings. No more guessing if you&apos;re qualified. Just clear, data-driven matches.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">How It Works</h2>
                        <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-2 mt-2">
                            <li><strong>Upload your resume</strong> &mdash; Our AI extracts your skills, experience, and preferences.</li>
                            <li><strong>We scan the market</strong> &mdash; Google Jobs, LinkedIn, Indeed, 350+ company career pages, and more.</li>
                            <li><strong>Every job is scored</strong> &mdash; 7+ signals including skills match, seniority fit, location, and role alignment.</li>
                            <li><strong>You review only the best matches</strong> &mdash; No noise, just opportunities that fit.</li>
                        </ol>
                    </section>

                    <hr className="border-gray-100" />

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">What Makes Us Different</h2>
                        <div className="space-y-4 mt-2">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">Direct ATS Access</h3>
                                <p className="text-gray-600 text-sm leading-relaxed mt-1">
                                    We query 350+ company career pages directly via Greenhouse, Lever, and Ashby APIs &mdash; jobs that never appear on aggregator sites.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">Privacy First</h3>
                                <p className="text-gray-600 text-sm leading-relaxed mt-1">
                                    Your resume is parsed in-memory and never stored on our servers. We explicitly opt out of AI training with all providers.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">Transparent Scoring</h3>
                                <p className="text-gray-600 text-sm leading-relaxed mt-1">
                                    Every match score breaks down into skills, experience, and title fit &mdash; so you know exactly why a job was recommended.
                                </p>
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">Built With</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Next.js, Tailwind CSS, Clerk Auth, Upstash Redis, Vercel, Resend.
                        </p>
                        <p className="text-gray-600 text-sm leading-relaxed mt-3">
                            Powered by AI models from Anthropic and Google for deep job analysis.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Questions or feedback? Reach us at <a href="mailto:support@midasmatch.com" className="text-indigo-600 hover:underline">support@midasmatch.com</a>.
                        </p>
                        <p className="text-gray-600 text-sm leading-relaxed mt-3">
                            We read every message and typically respond within 24 hours.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
