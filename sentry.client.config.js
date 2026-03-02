import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Capture 10% of transactions in production for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Only print debug info in development
    debug: false,

    // Don't send errors from localhost
    enabled: process.env.NODE_ENV === "production",
});
