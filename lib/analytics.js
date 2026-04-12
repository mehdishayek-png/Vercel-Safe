"use client";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';

export function pageview(url) {
    if (!GA_ID || !window.gtag) return;
    window.gtag('config', GA_ID, { page_path: url });
}

export function event(action, params = {}) {
    if (!GA_ID || !window.gtag) return;
    window.gtag('event', action, params);
}

export function trackSignup(method = 'clerk') {
    event('sign_up', { method });
}
