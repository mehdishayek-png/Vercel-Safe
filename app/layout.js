import { ClerkProvider } from '@clerk/nextjs'
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata = {
  title: 'JobBot AI — AI-Powered Job Matching Engine',
  description: 'Upload your resume and instantly match with jobs from 8+ sources. AI-powered scoring, deep analysis, and location-aware matching across India, US, UK, and 190+ countries.',
  keywords: ['job matching', 'AI job search', 'resume matching', 'job finder', 'career', 'job search engine', 'AI resume'],
  authors: [{ name: 'JobBot AI' }],
  openGraph: {
    title: 'JobBot AI — Find Your Perfect Job with AI',
    description: 'Upload your resume and get matched with thousands of jobs from Google, LinkedIn, and 8+ sources. AI scoring + deep analysis.',
    siteName: 'JobBot AI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobBot AI — AI Job Matching',
    description: 'Upload your resume and get AI-matched with jobs from 8+ sources.',
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
