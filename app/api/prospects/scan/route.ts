import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { url, companyName } = await req.json()
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  try {
    // Fetch the website with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json(
        { error: `Website returned status ${res.status}. Try visiting it directly.` },
        { status: 502 }
      )
    }

    const html = await res.text()

    // ---- EMAIL EXTRACTION (regex-based, completely free) ----
    // Find all email addresses in the raw HTML
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
    const rawEmails = [...new Set(html.match(emailRegex) || [])]

    // Filter out junk emails (images, scripts, tracking pixels, etc.)
    const junkPatterns = [
      "example.com", "sentry", "wixpress", "wix.com", "webpack",
      ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js",
      "noreply", "no-reply", "donotreply", "unsubscribe",
      "sentry.io", "cloudflare", "googleapis", "schema.org",
      "gravatar", "wordpress", "@2x", "@3x",
    ]
    const validEmails = rawEmails.filter(
      (email) => !junkPatterns.some((p) => email.toLowerCase().includes(p))
    )

    // ---- PHONE EXTRACTION ----
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
    const phones = [...new Set(textContent.match(phoneRegex) || [])].slice(0, 5)

    // ---- NAME & ROLE EXTRACTION ----
    // Look for common patterns like "Contact: Name" or structured data
    const contacts: Array<{
      name: string | null
      role: string | null
      email: string | null
      phone: string | null
      department: string | null
    }> = []

    // Try to find mailto: links which often have context around them
    const mailtoRegex = /(?:<[^>]*?(?:title|alt|aria-label)="([^"]*)"[^>]*)?href="mailto:([^"?]+)[^"]*"[^>]*>([^<]*)/gi
    let mailtoMatch
    while ((mailtoMatch = mailtoRegex.exec(html)) !== null) {
      const email = mailtoMatch[2].trim()
      if (junkPatterns.some((p) => email.toLowerCase().includes(p))) continue
      const contextName = mailtoMatch[3].replace(/<[^>]+>/g, "").trim()
      const isName = contextName && !contextName.includes("@") && contextName.length < 60

      contacts.push({
        name: isName ? contextName : null,
        role: null,
        email,
        phone: null,
        department: guessContactDepartment(email),
      })
    }

    // Add remaining emails not already in contacts
    const contactEmails = new Set(contacts.map((c) => c.email?.toLowerCase()))
    for (const email of validEmails) {
      if (!contactEmails.has(email.toLowerCase())) {
        contacts.push({
          name: null,
          role: null,
          email,
          phone: null,
          department: guessContactDepartment(email),
        })
      }
    }

    // If we found phones but no contacts yet, add them
    if (contacts.length === 0 && phones.length > 0) {
      contacts.push({
        name: null,
        role: null,
        email: null,
        phone: phones[0],
        department: "general",
      })
    }

    // ---- COMPANY INFO EXTRACTION ----
    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/)
      || html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"/)
    const description = metaDescMatch
      ? metaDescMatch[1].replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim()
      : ""

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const pageTitle = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").trim() : ""

    // Try to extract address from structured data or common patterns
    const addressPatterns = [
      /(?:address|location)[^>]*>([^<]{10,100}(?:street|ave|blvd|road|st|dr|suite|floor|city|state|\d{5})[^<]{0,50})/i,
      /"streetAddress"\s*:\s*"([^"]+)"/,
      /"address"\s*:\s*\{[^}]*"streetAddress"\s*:\s*"([^"]+)"/,
    ]
    let address: string | null = null
    for (const pattern of addressPatterns) {
      const match = textContent.match(pattern) || html.match(pattern)
      if (match) {
        address = match[1].replace(/\s+/g, " ").trim()
        break
      }
    }

    // ---- SOCIAL LINKS ----
    const socialRegex = /href="(https?:\/\/(?:www\.)?(?:linkedin\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|vimeo\.com|youtube\.com)\/[^"]+)"/gi
    const socialLinks = [...new Set([...html.matchAll(socialRegex)].map((m) => m[1]))].slice(0, 5)

    const resolvedCompanyName = companyName || pageTitle || (() => {
      try { return new URL(url).hostname.replace("www.", "") } catch { return url }
    })()

    return NextResponse.json({
      contacts: contacts.slice(0, 15),
      companyInfo: {
        description: description || `Website: ${resolvedCompanyName}`,
        specializations: [],
        address,
        mainPhone: phones[0] || null,
        socialLinks,
      },
      sourceUrl: url,
      companyName: resolvedCompanyName,
      totalEmailsFound: validEmails.length,
      totalPhonesFound: phones.length,
    })
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return NextResponse.json(
        { error: "Website took too long to respond. Try again or visit the site directly." },
        { status: 504 }
      )
    }
    console.error("[v0] Scan error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Could not reach this website. It may be down or blocking automated access." },
      { status: 502 }
    )
  }
}

function guessContactDepartment(email: string): string {
  const lower = email.toLowerCase()
  if (/cast|talent|audition|voice/.test(lower)) return "casting"
  if (/creative|director|produce/.test(lower)) return "creative"
  if (/info|contact|hello|general|office/.test(lower)) return "general"
  if (/sale|business|market/.test(lower)) return "sales"
  if (/hr|recruit|career|job/.test(lower)) return "hr"
  return "general"
}
