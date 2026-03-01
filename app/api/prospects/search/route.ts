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

  const { query } = await req.json()
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Query is required" }, { status: 400 })
  }

  try {
    // Priority 1: Google Custom Search if keys available
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY
    const googleCx = process.env.GOOGLE_SEARCH_CX
    if (googleApiKey && googleCx) {
      const res = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=10`
      )
      if (res.ok) {
        const data = await res.json()
        const results = (data.items || []).map(
          (item: { title: string; link: string; snippet: string; displayLink: string }) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet || "",
            displayLink: item.displayLink,
          })
        )
        return NextResponse.json({ results })
      }
    }

    // Priority 2: Brave Search API
    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY
    if (braveApiKey) {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=15`,
        { headers: { Accept: "application/json", "X-Subscription-Token": braveApiKey } }
      )
      if (res.ok) {
        const data = await res.json()
        const results = (data.web?.results || []).map(
          (r: { title: string; url: string; description: string }) => ({
            title: r.title,
            link: r.url,
            snippet: r.description || "",
            displayLink: (() => { try { return new URL(r.url).hostname.replace("www.", "") } catch { return r.url } })(),
          })
        )
        return NextResponse.json({ results })
      }
    }

    // Priority 3: DuckDuckGo HTML scraping (free, no API key)
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const ddgRes = await fetch(ddgUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    })

    if (!ddgRes.ok) {
      return NextResponse.json(
        { error: "Search service is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      )
    }

    const html = await ddgRes.text()

    // Step 1: Split HTML into individual result blocks using result__body
    const blocks = html.split("result__body")

    const results: Array<{
      title: string
      link: string
      snippet: string
      displayLink: string
    }> = []

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i]

      // Skip ad blocks
      if (block.includes("ad_provider") || block.includes("ad_domain") || block.includes("result--ad")) {
        continue
      }

      // Extract href from result__a link
      // Pattern: class="result__a" href="//duckduckgo.com/l/?uddg=ENCODED&amp;rut=..."
      const hrefMatch = block.match(/class="result__a"\s+href="([^"]+)"/)
      if (!hrefMatch) continue

      // Extract title text between > and </a> after result__a
      const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)/)
      if (!titleMatch) continue

      // Extract snippet from result__snippet
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)
      const snippet = snippetMatch
        ? snippetMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim()
        : ""

      // Decode the DDG redirect URL to get the real website URL
      const rawHref = hrefMatch[1].replace(/&amp;/g, "&")
      let realUrl = ""
      const uddgMatch = rawHref.match(/uddg=([^&]+)/)
      if (uddgMatch) {
        try {
          realUrl = decodeURIComponent(uddgMatch[1])
        } catch {
          continue
        }
      }
      if (!realUrl.startsWith("http")) continue
      // Skip DDG internal redirects
      if (realUrl.includes("duckduckgo.com")) continue

      let displayLink = ""
      try {
        displayLink = new URL(realUrl).hostname.replace("www.", "")
      } catch {
        displayLink = realUrl
      }

      // Filter out social media and aggregator sites
      const skipDomains = [
        "wikipedia.org", "youtube.com", "reddit.com", "facebook.com",
        "twitter.com", "instagram.com", "tiktok.com", "pinterest.com",
        "x.com", "quora.com",
      ]
      if (skipDomains.some((d) => displayLink.includes(d))) continue

      const title = titleMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim()

      results.push({ title, link: realUrl, snippet, displayLink })
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No results found. Try different or more specific keywords." },
        { status: 404 }
      )
    }

    return NextResponse.json({ results })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Search error:", errMsg)
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 })
  }
}
