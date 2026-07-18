import Link from 'next/link';

export const metadata = { title: 'Terms of Service' };

const sections = [
    ['1. Service', 'Midas Match provides job retrieval, ranking, saved-workspace, and AI-assisted career tools. Results are informational and do not guarantee an interview, offer, compensation level, or job availability. Listings may be changed or removed by their original publishers.'],
    ['2. Accounts and access', 'You must provide accurate account information and protect access to your account. The current workspace is included for signed-in users and new token checkout is paused. Midas may apply reasonable rate limits, suspend abusive traffic, or change future access terms with clear notice.'],
    ['3. Acceptable use', 'Do not probe or bypass security controls, automate excessive requests, resell retrieved data, interfere with job sources, impersonate another person, upload content you do not have the right to use, or use generated content unlawfully or deceptively.'],
    ['4. Your content', 'You retain ownership of profile and resume information you provide. You grant Midas the limited permission needed to process that information to operate, secure, and improve the service. You are responsible for reviewing generated applications and messages before using them.'],
    ['5. Third-party services', 'Midas relies on third-party authentication, hosting, database, job data, AI, analytics, monitoring, email, and historical payment services. Their availability and policies may affect portions of the product. External job links are governed by the destination site.'],
    ['6. Availability and changes', 'Sources can time out, rate-limit, return thin data, or become unavailable. Midas may change, pause, or discontinue features and integrations. We aim to preserve partial results and provide fallbacks, but uninterrupted operation is not guaranteed.'],
    ['7. Disclaimer and liability', 'The service is provided on an as-available basis. To the fullest extent permitted by law, Midas disclaims implied warranties and is not liable for indirect, incidental, consequential, or employment-related losses arising from use of the service.'],
    ['8. Termination', 'You may stop using the service at any time. Midas may restrict or terminate access for material breach, abuse, security risk, or legal requirements. Provisions that by nature should survive termination will continue to apply.'],
];

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-surface-50 px-4 py-16 text-slate-900">
            <article className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm font-semibold text-brand-700 hover:text-brand-900">&larr; Back to Midas</Link>
                <span className="mm-kicker mt-12">Legal</span>
                <h1 className="mt-5 font-headline text-4xl font-extrabold tracking-[-0.04em] text-slate-950 md:text-5xl">Terms of service</h1>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">Last updated: July 18, 2026</p>
                <p className="mt-8 text-sm leading-6 text-slate-600">By accessing Midas Match, you agree to these terms. If you do not agree, do not use the service.</p>
                <div className="mt-10 space-y-9">{sections.map(([title, body]) => <section key={title}><h2 className="text-lg font-bold text-slate-950">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{body}</p></section>)}</div>
                <p className="mt-10 border-t border-slate-900/10 pt-8 text-sm text-slate-600">Questions: <a href="mailto:midasmatchsupport@gmail.com" className="font-bold text-brand-700">midasmatchsupport@gmail.com</a></p>
            </article>
        </main>
    );
}
