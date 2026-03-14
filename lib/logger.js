/**
 * Production-safe logger. Only emits in development or when explicitly enabled.
 * Replaces raw console.log calls across the codebase.
 */
const isDev = process.env.NODE_ENV === 'development';

export const log = (...args) => { if (isDev) console.log(...args); };
export const warn = (...args) => { if (isDev) console.warn(...args); };

// Errors always log — they indicate real problems, not debug noise
export const error = (...args) => { console.error(...args); };
