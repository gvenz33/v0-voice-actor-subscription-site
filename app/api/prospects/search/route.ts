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
    // Option 1: Google Custom Search if keys are available
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY
    const googleCx = process.env.GOOGLE_SEARCH_CX

    if (googleApiKey && googleCx) {
      const searchQuery = encodeURIComponent(query)
      const res = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${searchQuery}&num=10`
      )
      const data = await res.json()
      const results =
        data.items?.map(
          (item: { title: string; link: string; snippet: string; displayLink: string }) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            displayLink: item.displayLink,
          })
        ) || []
      return NextResponse.json({ results })
    }

    // Option 2: DuckDuckGo HTML scraping
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: "Search service temporarily unavailable. Please try again." },
        { status: 502 }
      )
    }

    const html = await res.text()

    // Split by web-result blocks (skip ads which have result--ad)
    const results: Array<{
      title: string
      link: string
      snippet: string
      displayLink: string
    }> = []

    // Match each result__a tag - DDG structure is:
    // <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=ENCODED_URL&...">Title</a>
    const resultAMatches = [
      ...html.matchAll(
        /class="result__a"\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
      ),
    ]

    // Match snippets separately
    const snippetMatches = [
      ...html.matchAll(
        /class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|span|div)>/g
      ),
    ]

    for (let i = 0; i < resultAMatches.length && results.length < 15; i++) {
      const rawHref = resultAMatches[i][1]
      const rawTitle = resultAMatches[i][2]

      // Extract the actual URL from DuckDuckGo's redirect wrapper
      // Format: //duckduckgo.com/l/?uddg=ENCODED_URL&rut=...
      let url = ""
      const uddgMatch = rawHref.match(/uddg=([^&]+)/)
      if (uddgMatch) {
        url = decodeURIComponent(uddgMatch[1])
      } else if (rawHref.startsWith("http")) {
        url = rawHref
      } else {
        continue // Skip if we can't extract a real URL
      }

      // Clean title (strip HTML tags and decode entities)
      const title = rawTitle
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .trim()

      // Get snippet if available at same index
      const snippet = snippetMatches[i]
        ? snippetMatches[i][1]
            .replace(/<[^>]*>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&#x27;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&#39;/g, "'")
            .replace(/<b>/g, "")
            .replace(/<\/b>/g, "")
            .trim()
        : ""

      // Extract display link
      let displayLink = ""
      try {
        displayLink = new URL(url).hostname.replace("www.", "")
      } catch {
        displayLink = url.replace(/^https?:\/\//, "").split("/")[0]
      }

      // Filter out ads, search engines, and junk
      if (
        !url.startsWith("http") ||
        url.includes("duckduckgo.com") ||
        url.includes("google.com/search") ||
        rawHref.includes("ad_provider") ||
        rawHref.includes("ad_domain") ||
        !title
      ) {
        continue
      }

      results.push({ title, link: url, snippet, displayLink })
    }

    console.log("[v0] Parsed", results.length, "results from DuckDuckGo")

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    )
  }
}
