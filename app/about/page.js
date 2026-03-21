export default function About() {
    return (
        <main className="min-h-screen bg-white dark:bg-ink-950 py-16 px-4">
            <div className="max-w-3xl mx-auto">
                <a href="/" className="text-sm text-brand-600 dark:text-brand-400 hover:underline mb-8 block">&larr; Back to Midas</a>
                <h1 className="text-4xl font-bold text-ink-900 dark:text-ink-100 mb-2">About Midas Match</h1>
                <p className="text-lg text-ink-500 dark:text-ink-400 mb-10">AI-powered job matching, built for job seekers who value their time.</p>

                <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-ink-900 dark:text-ink-100 mb-3">Our Mission</h2>
                        <p className="text-ink-600 dark:text-ink-400 text-sm leading-relaxed">
                            We believe job searching shouldn&apos;t feel like a second job. Midas Match uses AI to scan thousands of openings across 8+ sources, score each one against your unique profile, and surface only the roles worth your time.
                        </p>
                        <p className="text-ink-600 dark:text-ink-400 text-sm leading-relaxed mt-3">
                            No more scrolling through irrelevant listings. No more guessing if you&apos;re qualified. Just clear, data-driven matches.
                        </p>
                    </section>

                    <hr className="border-ink-100 dark:border-[#2E2B27]" />

                    <section>
                        <h2 className="text-xl font-semibold text-ink-900 dark:text-ink-100 mb-3">How It Works</h2>
                        <ol className="list-decimal pl-5 text-sm text-ink-600 dark:text-ink-400 space-y-2 mt-2">
                            <li><strong>Upload your resume</strong> &mdash; Our AI extracts your skills, experience, and preferences.</li>
                            <li><strong>We scan the market</strong> &mdash; Google Jobs, LinkedIn, Indeed, 350+ company career pages, and more.</li>
                            <li><strong>Every job is scored</strong> &mdash; 7+ signals including skills match, seniority fit, location, and role alignment.</li>
                            <li><strong>You review only the best matches</strong> &mdash; No noise, just opportunities that fit.</li>
                        </ol>
                    </section>

                    <hr className="border-ink-100 dark:border-[#2E2B27]" />

                    <section>
                        <h2 className="text-xl font-semibold text-ink-900 dark:text-ink-100 mb-3">What Makes Us Different</h2>
                        <div className="space-y-4 mt-2">
                            <div>
                                <h3 className="text-sm font-semibold text-ink-800 dark:text-ink-200">Direct ATS Access</h3>
                                <p className="text-ink-600 dark:text-ink-400 text-sm leading-relaxed mt-1">
                                    We query 350+ company career pages directly through API integrations &mdash; surfacing jobs that never appear on traditional aggregator sites.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-ink-800 dark:text-ink-200">Privacy First</h3>
                                <p className="text-ink-600 dark:text-ink-400 text-sm leading-relaxed mt-1">
                                    Your resume is parsed in-memory and never stored on our servers. We explicitly opt out of AI training with all providers.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-ink-800 dark:text-ink-200">Transparent Scoring</h3>
                                <p className="text-ink-600 dark:text-ink-400 text-sm leading-relaxed mt-1">
                                    Every match score breaks down into skills, experience, and title fit &mdash; so you know exactly why a job was recommended.
                                </p>
                            </div>
                        </div>
                    </section>

                    <hr className="border-ink-100 dark:border-[#2E2B27]" />

                    <section>
                        <h2 className="text-xl font-semibold text-ink-900 dark:text-ink-100 mb-3">Contact</h2>
                        <p className="text-ink-600 dark:text-ink-400 text-sm leading-relaxed">
                            Questions or feedback? Reach us at <a href="mailto:midasmatchsupport@gmail.com" className="text-brand-600 dark:text-brand-400 hover:underline">midasmatchsupport@gmail.com</a>.
                        </p>
                        <p className="text-ink-600 dark:text-ink-400 text-sm leading-relaxed mt-3">
                            We read every message and typically respond within 24 hours.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
