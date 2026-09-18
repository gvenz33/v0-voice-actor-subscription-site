import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { getGuideBySlug, GUIDE_PAGES } from "@/lib/seo/guides"
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld"
import { getSiteUrl, SITE_NAME } from "@/lib/seo/site"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return GUIDE_PAGES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) return {}

  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
      url: `/guides/${guide.slug}`,
      type: "article",
    },
  }
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) notFound()

  const siteUrl = getSiteUrl()
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${siteUrl}/pwa-icon-512.png` },
    },
    mainEntityOfPage: `${siteUrl}/guides/${guide.slug}`,
  }
  const breadcrumbLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: guide.title, path: `/guides/${guide.slug}` },
  ])

  return (
    <div className="min-h-svh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Navbar />
      <main className="px-6 py-16 md:py-24">
        <article className="mx-auto max-w-3xl">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            {" / "}
            <Link href="/guides" className="hover:text-foreground">
              Guides
            </Link>
            {` / ${guide.title}`}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-6 text-xl leading-relaxed text-foreground/80">{guide.summary}</p>

          {guide.sections.map((section) => (
            <section key={section.heading} className="mt-12">
              <h2 className="text-2xl font-semibold text-foreground">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="mt-4 text-foreground/70 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <aside className="mt-16 border-t border-border pt-10">
            <h2 className="text-xl font-semibold text-foreground">Ready to run your VO business in one place?</h2>
            <p className="mt-3 text-foreground/70">
              VO Biz Suite helps voice actors track auditions, manage clients, invoice work, and grow outreach with AI tools.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/#pricing"
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                View pricing
              </Link>
              <Link
                href="/guides"
                className="inline-flex h-10 items-center text-sm text-muted-foreground hover:text-foreground"
              >
                More guides
              </Link>
            </div>
          </aside>
        </article>
      </main>
      <Footer />
    </div>
  )
}
