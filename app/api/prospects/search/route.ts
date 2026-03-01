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
      const data = await res.json()
      const results =
        data.items?.map(
          (item: { title: string; link: string; snippet: string; displayLink: string }) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet || "",
            displayLink: item.displayLink,
          })
        ) || []
      return NextResponse.json({ results })
    }

    // Priority 2: Brave Search API
    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY
    if (braveApiKey) {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=15`,
        {
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": braveApiKey,
          },
        }
      )
      const data = await res.json()
      const results =
        data.web?.results?.map(
          (r: { title: string; url: string; description: string }) => {
            let displayLink = ""
            try {
              displayLink = new URL(r.url).hostname.replace("www.", "")
            } catch {
              displayLink = r.url
            }
            return {
              title: r.title,
              link: r.url,
              snippet: r.description || "",
              displayLink,
            }
          }
        ) || []
      return NextResponse.json({ results })
    }

    // Priority 3: DuckDuckGo HTML scraping (no API key needed)
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

    // Extract all result__a links: <a rel="nofollow" class="result__a" href="...">TITLE</a>
    // The href is //duckduckgo.com/l/?uddg=ENCODED_URL&amp;rut=...
    const linkRegex = /class="result__a"\s+href="([^"]+)"[^>]*>([^<]+(?:<[^>]*>[^<]*)*)<\/a>/g
    const snippetRegex = /class="result__snippet"[^>]*href="[^"]*"[^>]*>([\s\S]*?)<\/a>/g

    const links: Array<{ rawUrl: string; title: string }> = []
    let linkMatch
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      links.push({
        rawUrl: linkMatch[1],
        title: linkMatch[2].replace(/<\/?b>/g, "").replace(/<[^>]*>/g, "").trim(),
      })
    }

    const snippets: string[] = []
    let snippetMatch
    while ((snippetMatch = snippetRegex.exec(html)) !== null) {
      snippets.push(
        snippetMatch[1]
          .replace(/<\/?b>/g, "")
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .trim()
      )
    }

    // Decode the DDG redirect URLs to get actual website URLs
    const results = links
      .map((link, i) => {
        // Extract the real URL from //duckduckgo.com/l/?uddg=ENCODED_URL&rut=...
        let realUrl = ""
        try {
          // The href starts with // so prepend https:
          const fullDdgUrl = link.rawUrl.startsWith("//")
            ? "https:" + link.rawUrl.replace(/&amp;/g, "&")
            : link.rawUrl.replace(/&amp;/g, "&")
          const parsed = new URL(fullDdgUrl)
          const uddg = parsed.searchParams.get("uddg")
          if (uddg) {
            realUrl = decodeURIComponent(uddg)
          } else {
            realUrl = fullDdgUrl
          }
        } catch {
          return null
        }

        // Skip non-http URLs and DDG internal links
        if (!realUrl.startsWith("http")) return null
        if (realUrl.includes("duckduckgo.com")) return null

        let displayLink = ""
        try {
          displayLink = new URL(realUrl).hostname.replace("www.", "")
        } catch {
          displayLink = realUrl
        }

        // Filter out generic aggregator/list sites
        const skipDomains = [
          "wikipedia.org", "youtube.com", "reddit.com", "facebook.com",
          "twitter.com", "instagram.com", "tiktok.com", "pinterest.com",
        ]
        if (skipDomains.some((d) => displayLink.includes(d))) return null

        return {
          title: link.title || displayLink,
          link: realUrl,
          snippet: snippets[i] || "",
          displayLink,
        }
      })
      .filter(Boolean)

    if (results.length === 0) {
      return NextResponse.json(
        {
          error:
            "No results found. Try more specific keywords like 'Pixar animation studio' or 'commercial production company Los Angeles'.",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ results })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Search error:", errMsg)
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    )
  }
}
