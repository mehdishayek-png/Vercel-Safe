import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-950 overflow-hidden">
      {/* Decorative gradient blob */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center px-6">
        <h1 className="text-[10rem] sm:text-[12rem] font-black leading-none tracking-tight bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent select-none">
          404
        </h1>

        <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-white">
          Page not found
        </h2>

        <p className="mt-3 max-w-md mx-auto text-gray-400 text-base sm:text-lg">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 font-semibold text-sm hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/25"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-gray-700 text-gray-300 font-semibold text-sm hover:border-gray-500 hover:text-white transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
