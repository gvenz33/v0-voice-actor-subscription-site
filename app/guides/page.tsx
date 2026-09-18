import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { GUIDE_PAGES } from "@/lib/seo/guides"
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld"

export const metadata: Metadata = {
  title: "Guides for Voice Actors",
  description:
    "Practical guides on voice actor CRMs, audition tracking, and VO invoicing — built to help you run your voiceover career like a business.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Guides for Voice Actors | VO Biz Suite",
    description:
      "Practical guides on voice actor CRMs, audition tracking, and VO invoicing.",
    url: "/guides",
  },
}

export default function GuidesIndexPage() {
  const jsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
  ])

  return (
    <div className="min-h-svh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            {" / Guides"}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Guides for voice actors
          </h1>
          <p className="mt-4 text-lg text-foreground/70">
            Clear, practical articles on running a VO business — useful whether you use VO Biz Suite or not.
          </p>
          <ul className="mt-12 space-y-8">
            {GUIDE_PAGES.map((guide) => (
              <li key={guide.slug} className="border-t border-border pt-8">
                <Link
                  href={`/guides/${guide.slug}`}
                  className="group block"
                >
                  <h2 className="text-2xl font-semibold text-foreground group-hover:text-foreground/80">
                    {guide.title}
                  </h2>
                  <p className="mt-2 text-foreground/70">{guide.description}</p>
                  <span className="mt-3 inline-block text-sm text-primary">Read guide →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  )
}
