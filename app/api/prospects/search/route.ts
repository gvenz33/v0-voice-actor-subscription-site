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

    // Priority 2: Try multiple SearXNG public instances (JSON API, free, no key)
    const searxngInstances = [
      "https://search.sapti.me",
      "https://searx.tiekoetter.com",
      "https://search.bus-hit.me",
      "https://searx.be",
      "https://search.ononoki.org",
    ]

    for (const instance of searxngInstances) {
      try {
        const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general&engines=google,bing,duckduckgo&language=en`

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        const res = await fetch(searchUrl, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!res.ok) {
          console.log(`[v0] SearXNG instance ${instance} returned ${res.status}, trying next...`)
          continue
        }

        const data = await res.json()

        if (!data.results || data.results.length === 0) {
          console.log(`[v0] SearXNG instance ${instance} returned 0 results, trying next...`)
          continue
        }

        const results = data.results
          .filter((r: { url: string }) => {
            // Filter out search engines, aggregators, and non-company pages
            const url = r.url || ""
            return (
              url.startsWith("http") &&
              !url.includes("google.com") &&
              !url.includes("bing.com") &&
              !url.includes("duckduckgo.com") &&
              !url.includes("wikipedia.org/wiki/List") &&
              !url.includes("reddit.com")
            )
          })
          .slice(0, 15)
          .map((r: { title: string; url: string; content: string }) => {
            let displayLink = ""
            try {
              displayLink = new URL(r.url).hostname.replace("www.", "")
            } catch {
              displayLink = r.url
            }
            return {
              title: (r.title || "").replace(/<[^>]*>/g, ""),
              link: r.url,
              snippet: (r.content || "").replace(/<[^>]*>/g, ""),
              displayLink,
            }
          })

        console.log(`[v0] SearXNG (${instance}) returned ${results.length} results`)
        return NextResponse.json({ results })
      } catch (err) {
        console.log(`[v0] SearXNG instance ${instance} failed:`, err instanceof Error ? err.message : err)
        continue
      }
    }

    // Priority 3: Brave Search API (free tier: 2000 queries/month)
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

    // All search methods failed
    return NextResponse.json(
      {
        error:
          "Search service is temporarily unavailable. Please try again in a moment.",
      },
      { status: 503 }
    )
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    )
  }
}
