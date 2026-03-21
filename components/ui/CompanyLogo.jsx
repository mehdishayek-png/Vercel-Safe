'use client';
import { useState } from 'react';

const AVATAR_COLORS = [
    'bg-teal-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-pink-500',
    'bg-cyan-500', 'bg-fuchsia-500', 'bg-orange-500', 'bg-lime-600',
];

/**
 * Attempts to derive a domain from a company name or apply URL.
 * Falls back to null if nothing useful can be found.
 */
function guessDomain(company, applyUrl) {
    // Try to extract domain from apply URL first
    if (applyUrl) {
        try {
            const url = new URL(applyUrl);
            const host = url.hostname.replace(/^www\./, '');
            // Skip generic job board domains — we want the company's own domain
            const genericDomains = [
                'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com',
                'ziprecruiter.com', 'dice.com', 'angel.co', 'wellfound.com',
                'lever.co', 'greenhouse.io', 'workday.com', 'smartrecruiters.com',
                'jobvite.com', 'icims.com', 'taleo.net', 'brassring.com',
                'myworkdayjobs.com', 'jobs.lever.co', 'boards.greenhouse.io',
                'google.com', 'naukri.com', 'shine.com', 'timesjobs.com',
                'foundit.in', 'internshala.com', 'simplyhired.com',
            ];
            if (!genericDomains.some(d => host.endsWith(d))) {
                return host;
            }
            // For lever/greenhouse, extract company subdomain
            if (host === 'jobs.lever.co' || host === 'boards.greenhouse.io') {
                const parts = url.pathname.split('/').filter(Boolean);
                if (parts[0]) return parts[0] + '.com';
            }
        } catch {}
    }

    // Try to build domain from company name
    if (company) {
        const clean = company
            .replace(/<[^>]*>/g, '') // strip HTML
            .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?|Limited|Technologies|Technology|Solutions|Group|Holdings|International|Services|Software|Labs?|Pvt\.?)\s*/gi, '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        if (clean.length >= 2) return clean + '.com';
    }

    return null;
}

/**
 * A company logo component that tries multiple sources, falling back to initials.
 *
 * Sources tried in order:
 * 1. Google Favicon API (fast, reliable for most domains)
 * 2. Clearbit Logo API (higher quality, but sometimes 404s)
 * 3. Fallback: colored circle with company initials
 */
export function CompanyLogo({ company, applyUrl, size = 36, colorIndex = 0, className = '' }) {
    const [imgError, setImgError] = useState(false);
    const [imgSrc, setImgSrc] = useState(() => {
        const domain = guessDomain(company, applyUrl);
        if (!domain) return null;
        return `https://logo.clearbit.com/${domain}`;
    });

    const cleanCompany = (company || '').replace(/<[^>]*>/g, '').trim();
    const words = cleanCompany.split(/\s+/).filter(Boolean);
    const initial = (words[0] || '?').charAt(0).toUpperCase();
    const secondInitial = words[1]?.charAt(0)?.toUpperCase() || '';

    const bgColor = AVATAR_COLORS[Math.abs(colorIndex) % AVATAR_COLORS.length];

    const handleError = () => {
        // If clearbit failed, try Google Favicon
        if (imgSrc && imgSrc.includes('clearbit')) {
            const domain = guessDomain(company, applyUrl);
            if (domain) {
                setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
                return;
            }
        }
        setImgError(true);
    };

    const sizeClass = size <= 24 ? 'text-[9px]' : size <= 32 ? 'text-[10px]' : size <= 40 ? 'text-[12px]' : 'text-[14px]';

    if (imgSrc && !imgError) {
        return (
            <div
                className={`rounded-full overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center ${className}`}
                style={{ width: size, height: size }}
            >
                <img
                    src={imgSrc}
                    alt={cleanCompany}
                    width={size - 4}
                    height={size - 4}
                    className="object-contain"
                    onError={handleError}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            </div>
        );
    }

    // Fallback: colored initials
    return (
        <div
            className={`rounded-full ${bgColor} flex items-center justify-center text-white ${sizeClass} font-semibold tracking-tight shrink-0 ${className}`}
            style={{ width: size, height: size }}
        >
            {initial}{secondInitial}
        </div>
    );
}
