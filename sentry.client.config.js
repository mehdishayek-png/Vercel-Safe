import * as Sentry from "@sentry/nextjs";

Sentry.init({
    // Use the DSN you provided (fallback to env var if missing)
    dsn: "https://82465e5f704140bf6002a457adfcbcad@o4510976018808832.ingest.us.sentry.io/4510976021233664" || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: false,
    enabled: process.env.NODE_ENV === "production",

    // Only capture console.error calls as logs to Sentry
    integrations: [
        Sentry.consoleLoggingIntegration({ levels: ["error"] }),
    ],
    enableLogs: false,

    // Scrub PII from error reports before sending to Sentry
    beforeSend(event) {
        if (event.request?.data) {
            try {
                const data = typeof event.request.data === 'string' ? JSON.parse(event.request.data) : event.request.data;
                if (data.profile) data.profile = '[REDACTED]';
                if (data.resume_text) data.resume_text = '[REDACTED]';
                if (data.apiKeys) data.apiKeys = '[REDACTED]';
                if (data.job?.description) data.job.description = '[REDACTED]';
                event.request.data = typeof event.request.data === 'string' ? JSON.stringify(data) : data;
            } catch {}
        }
        return event;
    },
});
