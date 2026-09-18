import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo/site'
import './globals.css'

const _inter = Inter({ subsets: ["latin"] })
const _spaceGrotesk = Space_Grotesk({ subsets: ["latin"] })

const siteUrl = getSiteUrl()

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1a1530" },
    { media: "(prefers-color-scheme: light)", color: "#f4f2f8" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} | Build Your Voiceover Career Like a Business`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
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
    'AI voiceover tools',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
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
    url: siteUrl,
    locale: 'en_US',
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Build Your Voiceover Career Like a Business`,
    description:
      'The all-in-one CRM and business management platform built for voice actors. Track auditions, manage clients, send invoices, and grow your VO career.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Build Your Voiceover Career Like a Business`,
    description: 'The all-in-one CRM and business management platform built for voice actors.',
    site: '@vobizsuite',
    creator: '@vobizsuite',
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="vobiz-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
