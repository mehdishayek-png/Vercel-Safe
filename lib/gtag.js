"use client";

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
const CONVERSION_LABEL = '_diMCID27J8cENWSoLco';

/**
 * Fire a Google Ads conversion event for a successful resume upload.
 * Safe to call anywhere on the client — silently no-ops if gtag
 * or the Ads ID is unavailable.
 */
export function trackResumeUpload() {
  if (typeof window === 'undefined') return;
  if (!window.gtag) return;
  if (!GOOGLE_ADS_ID) return;
  window.gtag('event', 'conversion', {
    send_to: `${GOOGLE_ADS_ID}/${CONVERSION_LABEL}`,
  });
}
