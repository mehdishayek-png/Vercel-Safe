import Link from 'next/link';

export const metadata = { title: 'Privacy Policy' };

const sections = [
    ['1. Information we process', [
        'Account information provided through Clerk, such as your account identifier and email address.',
        'Profile information derived from your resume or entered by you, including headline, skills, experience, location, and preferences. The original uploaded file is not retained after parsing.',
        'Search queries, per-source performance, ranking and discard decisions, ranked results, saved roles, application state, and feedback you provide.',
        'Technical and usage information such as request identifiers, rate-limit keys, errors, page views, device information, and approximate network location.',
        'Historical payment records needed to verify and support prior Razorpay transactions. Midas does not receive full card or bank credentials.',
    ]],
    ['2. How we use information', [
        'To retrieve job listings, build and improve your ranked shortlist, and provide requested career tools.',
        'To persist your workspace across devices, prevent abuse, diagnose source and matching failures, measure false positives and false negatives, and maintain service security.',
        'To measure product usage, performance, and conversion events and to communicate service-related information.',
    ]],
    ['3. Service providers', [
        'Clerk provides authentication. Railway hosts the application and PostgreSQL database. Upstash Redis supports rate limiting and legacy account operations.',
        'Job search providers, employer systems, and Apify actors receive the query and location needed to retrieve listings.',
        'AI providers may receive limited profile and job text when a classification, semantic refinement, or requested generation feature runs.',
        'Sentry supports error and diagnostic monitoring; Google Analytics measures product usage; Resend supports email delivery; Razorpay supports historical payment verification.',
    ]],
    ['4. Storage and retention', [
        'Signed-in profile data, searches, results, saved jobs, and pipeline activity may be stored in PostgreSQL. Some interface state may also be cached in your browser.',
        'Search decision telemetry is retained for up to 90 days. Other operational logs and diagnostics follow the applicable hosting and monitoring service settings and are retained only as long as reasonably needed for the product, security, legal obligations, and dispute resolution.',
    ]],
    ['5. Your choices', [
        'You may edit profile data from the product and clear local browser data. You may request access to or deletion of account-linked data by contacting support.',
        'You can control analytics cookies through browser controls and supported consent mechanisms. Deleting data may limit or remove cross-device history and saved workflow features.',
    ]],
    ['6. Security and limitations', [
        'We use access controls, transport encryption, input validation, rate limits, request-origin checks, and production monitoring. No internet service can guarantee absolute security.',
        'Midas provides decision support. Match scores, salary estimates, and generated advice may be incomplete or inaccurate and should be independently reviewed.',
    ]],
];

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-surface-50 px-4 py-16 text-slate-900">
            <article className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm font-semibold text-brand-700 hover:text-brand-900">&larr; Back to Midas</Link>
                <span className="mm-kicker mt-12">Legal</span>
                <h1 className="mt-5 font-headline text-4xl font-extrabold tracking-[-0.04em] text-slate-950 md:text-5xl">Privacy policy</h1>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">Last updated: July 18, 2026</p>
                <p className="mt-8 text-sm leading-6 text-slate-600">This policy explains how Midas Match processes information when you use the website and career workspace.</p>
                <div className="mt-10 space-y-9">
                    {sections.map(([title, items]) => <section key={title}><h2 className="text-lg font-bold text-slate-950">{title}</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{items.map(item => <li key={item}>{item}</li>)}</ul></section>)}
                    <section><h2 className="text-lg font-bold text-slate-950">7. Contact</h2><p className="mt-3 text-sm leading-6 text-slate-600">For privacy requests, email <a href="mailto:midasmatchsupport@gmail.com" className="font-bold text-brand-700">midasmatchsupport@gmail.com</a>. We may need to verify account ownership before fulfilling a request.</p></section>
                </div>
            </article>
        </main>
    );
}
