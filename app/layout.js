import { ClerkProvider } from '@clerk/nextjs'
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';


export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.midasmatch.com'),
  title: 'Midas — AI-Powered Job Matching Engine',
  description: 'Upload your resume and instantly match with jobs from 8+ sources. AI-powered scoring, deep analysis, and location-aware matching across India, US, UK, and 190+ countries.',
  keywords: ['job matching', 'AI job search', 'resume matching', 'job finder', 'career', 'job search engine', 'AI resume'],
  authors: [{ name: 'Midas' }],
  openGraph: {
    title: 'Midas — Find Your Perfect Job with AI',
    description: '1,000 jobs scanned. Only the best delivered. Upload your resume and get AI-matched with jobs from 8+ sources and 350+ company career pages.',
    siteName: 'Midas',
    type: 'website',
    images: [
      {
        url: 'https://www.midasmatch.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Midas Match — AI-Powered Job Matching',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Midas — AI Job Matching',
    description: 'Upload your resume and get AI-matched with jobs from 8+ sources.',
    images: ['https://www.midasmatch.com/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{
            __html: `
      try {
        var t = localStorage.getItem('midas_theme');
        if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        }
      } catch(e) {}
    `,
          }} />
        </head>
        <body suppressHydrationWarning>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": "Midas Match",
                "description": "AI-powered job matching engine. Upload your resume and match with jobs from 8+ sources.",
                "url": "https://midasmatch.com",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD",
                  "description": "Free tier with 5 daily scans"
                },
                "author": {
                  "@type": "Organization",
                  "name": "Midas"
                }
              })
            }}
          />
          <ToastProvider>
            {children}
            <Analytics />
            <SpeedInsights />
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
