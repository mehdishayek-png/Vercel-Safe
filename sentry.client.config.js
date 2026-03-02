import * as Sentry from "@sentry/nextjs";

Sentry.init({
    // Use the DSN you provided (fallback to env var if missing)
    dsn: "https://82465e5f704140bf6002a457adfcbcad@o4510976018808832.ingest.us.sentry.io/4510976021233664" || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: false,
    enabled: process.env.NODE_ENV === "production",

    // Send console.log, console.warn, and console.error calls as logs to Sentry
    integrations: [
        Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    // Enable logs to be sent to Sentry
    enableLogs: true,
});
