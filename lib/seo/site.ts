export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://vobizsuite.io").replace(/\/$/, "")
}

export const SITE_NAME = "VO Biz Suite"
export const SITE_TAGLINE = "Build Your Voiceover Career Like a Business"
export const SITE_DESCRIPTION =
  "The all-in-one CRM and business management platform built for voice actors. Track auditions, manage clients, send invoices, and grow your VO career with AI-powered tools."
export const SITE_SUPPORT_EMAIL = "hello@vobizsuite.io"
