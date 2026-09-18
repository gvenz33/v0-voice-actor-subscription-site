import { LANDING_FAQS } from "@/lib/landing-faqs"
import { PRODUCTS } from "@/lib/products"
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SUPPORT_EMAIL,
} from "@/lib/seo/site"

export function buildHomeJsonLd() {
  const siteUrl = getSiteUrl()

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_DESCRIPTION,
        email: SITE_SUPPORT_EMAIL,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/pwa-icon-512.png`,
        },
        sameAs: ["https://x.com/vobizsuite"],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: SITE_SUPPORT_EMAIL,
          url: `${siteUrl}/contact`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "CRM",
        operatingSystem: "Web",
        url: siteUrl,
        description: SITE_DESCRIPTION,
        offers: PRODUCTS.map((p) => ({
          "@type": "Offer",
          name: `${p.name} plan`,
          price: (p.monthlyPriceInCents / 100).toFixed(2),
          priceCurrency: "USD",
          description: p.description,
          url: `${siteUrl}/#pricing`,
        })),
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: LANDING_FAQS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  }
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
) {
  const siteUrl = getSiteUrl()
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  }
}
