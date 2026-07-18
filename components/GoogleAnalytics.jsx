"use client";

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { GA_ID, pageview } from '@/lib/analytics';

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-10853288277';

function PageViewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!GA_ID) return;
        const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        pageview(url);
    }, [pathname, searchParams]);

    return null;
}

export function GoogleAnalytics() {
    const loaderId = GA_ID || GOOGLE_ADS_ID;
    if (!loaderId) return null;

    const analyticsConfigSnippet = GA_ID
        ? `gtag('config', '${GA_ID}', { page_path: window.location.pathname });`
        : '';

    const adsConfigSnippet = GOOGLE_ADS_ID
        ? `gtag('config', '${GOOGLE_ADS_ID}');`
        : '';

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
            />
            <Script
                id="ga4-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        ${analyticsConfigSnippet}
                        ${adsConfigSnippet}
                    `,
                }}
            />
            <Suspense fallback={null}>
                <PageViewTracker />
            </Suspense>
        </>
    );
}
