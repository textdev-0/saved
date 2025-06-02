import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Link Manager',
  description: 'Organise all of your links in one place.',
  keywords: 'link manager, bookmark organizer, website organizer, bookmark manager, link collection, bookmark export, bookmark import, productivity tool, link, bookmark',
  authors: [{ name: 'Link Manager' }],
  creator: 'Link Manager',
  publisher: 'Link Manager',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Link Manager',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Link Manager',
    title: 'Link Manager - Organize Your Favorite Websites & Bookmarks',
    description: 'A powerful web-based link manager to organize, categorize, and manage your favorite websites and bookmarks. Import browser bookmarks, export collections, and access your links anywhere.',
    url: 'https://your-domain.com', // Replace with your actual domain
    images: [
      {
        url: '/icon-512x512.svg',
        width: 512,
        height: 512,
        alt: 'Link Manager Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Link Manager - Organize Your Favorite Websites & Bookmarks',
    description: 'A powerful web-based link manager to organize, categorize, and manage your favorite websites and bookmarks.',
    images: ['/icon-512x512.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: 'your-google-verification-code',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Link Manager',
  description: 'A powerful web-based link manager to organize, categorize, and manage your favorite websites and bookmarks.',
  url: 'https://your-domain.com', // Replace with your actual domain
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Organization',
    name: 'Link Manager',
  },
  featureList: [
    'Organize and manage favorite links',
    'Import browser bookmarks',
    'Export link collections',
    'Star and categorize links',
    'Search and filter functionality',
    'Dark and light theme support',
    'Mobile-friendly interface',
    'Offline-first approach'
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Basic Meta Tags */}
        <meta name="application-name" content="Link Manager" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Link Manager" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* SEO Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        <meta name="rating" content="General" />
        
        {/* Canonical URL*/}
        <link rel="canonical" href="https://links-manager.com" />
        
        {/* Icons */}
        <link rel="apple-touch-icon" href="/icon-192x192.svg" />
        <link rel="icon" type="image/svg+xml" sizes="32x32" href="/icon-32x32.svg" />
        <link rel="icon" type="image/svg+xml" sizes="16x16" href="/icon-16x16.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
} 