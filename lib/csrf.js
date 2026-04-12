/**
 * Simple CSRF protection via Origin header validation.
 * Checks that the request's Origin matches our app domain.
 *
 * @param {Request} request - The incoming request
 * @returns {boolean} - true if request is safe, false if suspicious
 */
export function validateOrigin(request) {
    // Skip validation in development
    if (process.env.NODE_ENV === 'development') return true;

    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // Allow requests with no origin (same-origin, server-to-server, cron jobs)
    if (!origin && !referer) return true;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://midasmatch.com';
    const appHost = new URL(appUrl).host;

    // Check origin
    if (origin) {
        try {
            const originHost = new URL(origin).host;
            const normOrigin = originHost.replace(/^www\./, '');
            const normApp = appHost.replace(/^www\./, '');
            return normOrigin === normApp || originHost === 'localhost' || originHost.startsWith('localhost:');
        } catch {
            return false;
        }
    }

    // Check referer as fallback
    if (referer) {
        try {
            const refererHost = new URL(referer).host;
            const normReferer = refererHost.replace(/^www\./, '');
            const normApp = appHost.replace(/^www\./, '');
            return normReferer === normApp || refererHost === 'localhost' || refererHost.startsWith('localhost:');
        } catch {
            return false;
        }
    }

    return true;
}
