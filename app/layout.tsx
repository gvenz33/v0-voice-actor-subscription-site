import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const _inter = Inter({ subsets: ["latin"] })
const _spaceGrotesk = Space_Grotesk({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1530",
}

export const metadata: Metadata = {
  title: {
    default: 'VO Biz Suite | Build Your Voiceover Career Like a Business',
    template: '%s | VO Biz Suite',
  },
  description: 'The all-in-one CRM and business management platform built exclusively for independent voice actors. Track auditions, manage clients, send invoices, and grow your VO career with AI-powered tools.',
  keywords: [
    'voice actor CRM',
    'voiceover business management',
    'VO audition tracker',
    'voice acting career',
    'freelance voice actor tools',
    'voiceover invoicing',
    'voice talent management',
    'VO client management',
    'voice actor software',
    'voiceover marketing',
  ],
  authors: [{ name: 'VO Biz Suite' }],
  creator: 'VO Biz Suite',
  publisher: 'VO Biz Suite',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'VO Biz Suite',
    title: 'VO Biz Suite | Build Your Voiceover Career Like a Business',
    description: 'The all-in-one CRM and business management platform built exclusively for independent voice actors. Track auditions, manage clients, send invoices, and grow your VO career.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VO Biz Suite | Build Your Voiceover Career Like a Business',
    description: 'The all-in-one CRM and business management platform built exclusively for independent voice actors.',
    creator: '@vobizsuite',
  },
  metadataBase: new URL('https://vobizsuite.com'),
  alternates: {
    canonical: '/',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
