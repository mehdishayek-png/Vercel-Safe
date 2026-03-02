import { ClerkProvider } from '@clerk/nextjs'
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://midasmatch.com'),
  title: 'Midas — AI-Powered Job Matching Engine',
  description: 'Upload your resume and instantly match with jobs from 8+ sources. AI-powered scoring, deep analysis, and location-aware matching across India, US, UK, and 190+ countries.',
  keywords: ['job matching', 'AI job search', 'resume matching', 'job finder', 'career', 'job search engine', 'AI resume'],
  authors: [{ name: 'Midas' }],
  openGraph: {
    title: 'Midas — Find Your Perfect Job with AI',
    description: 'Upload your resume and get matched with thousands of jobs from Google, LinkedIn, and 8+ sources. AI scoring + deep analysis.',
    siteName: 'Midas',
    type: 'website',
    images: [
      {
        url: '/og-image.png', // Must be an absolute URL in production, Next.js handles relative in app router if metadataBase is set or transforms it. Let's use metadataBase just in case or absolute via env
        width: 1200,
        height: 630,
        alt: 'Midas Preview',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Midas — AI Job Matching',
    description: 'Upload your resume and get AI-matched with jobs from 8+ sources.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <ToastProvider>
            {children}
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
