import { ClerkProvider } from '@clerk/nextjs'
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';


export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.midasmatch.com'),
  title: {
    default: 'Midas Match — Evidence-led job search',
    template: '%s | Midas Match',
  },
  description: 'Turn your resume into a focused market search and a defensible shortlist with multi-source retrieval, explainable scoring, and semantic ranking.',
  keywords: ['job matching', 'AI job search', 'resume matching', 'job finder', 'career', 'job search engine', 'AI resume'],
  authors: [{ name: 'Midas' }],
  openGraph: {
    title: 'Midas Match — Evidence-led job search',
    description: 'Search beyond one job board and understand why every recommended role fits your profile.',
    siteName: 'Midas Match',
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
    title: 'Midas Match — Evidence-led job search',
    description: 'Search beyond one job board and understand why every recommended role fits your profile.',
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
  themeColor: '#f7f6f2',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
        </head>
        <body suppressHydrationWarning>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": "Midas Match",
                "description": "Evidence-led job search with multi-source retrieval and explainable ranking.",
                "url": "https://midasmatch.com",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
                "author": {
                  "@type": "Organization",
                  "name": "Midas Match"
                }
              })
            }}
          />
          <GoogleAnalytics />
          <ToastProvider>
            {children}

          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
