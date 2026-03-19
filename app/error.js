'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-950 overflow-hidden">
      {/* Decorative gradient blob */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-red-500/20 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center px-6">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/25">
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          Something went wrong
        </h1>

        <p className="mt-3 max-w-md mx-auto text-gray-400 text-base sm:text-lg">
          An unexpected error occurred. Please try again or return to the home page.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 font-semibold text-sm hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-gray-700 text-gray-300 font-semibold text-sm hover:border-gray-500 hover:text-white transition-all"
          >
            Go Home
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Still having trouble? Reach out to us at{' '}
          <a href="mailto:midasmatchsupport@gmail.com" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">
            midasmatchsupport@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
