"use server"

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
    // Use Google Custom Search or fall back to a simple scrape approach
    const searchQuery = encodeURIComponent(query)
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY
    const googleCx = process.env.GOOGLE_SEARCH_CX

    let results: Array<{
      title: string
      link: string
      snippet: string
      displayLink: string
    }> = []

    if (googleApiKey && googleCx) {
      // Use Google Custom Search API
      const res = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${searchQuery}&num=10`
      )
      const data = await res.json()
      results =
        data.items?.map(
          (item: { title: string; link: string; snippet: string; displayLink: string }) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            displayLink: item.displayLink,
          })
        ) || []
    } else {
      // Fallback: use DuckDuckGo instant answer API (no key needed)
      const res = await fetch(
        `https://html.duckduckgo.com/html/?q=${searchQuery}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; VOBizSuite/1.0; +https://vobizsuite.io)",
          },
        }
      )
      const html = await res.text()

      // Parse basic results from DDG HTML
      const resultRegex =
        /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
      let match
      while ((match = resultRegex.exec(html)) !== null && results.length < 10) {
        const link = decodeURIComponent(
          match[1].replace(/\/\/duckduckgo\.com\/l\/\?uddg=/, "").split("&")[0]
        )
        results.push({
          title: match[2].replace(/<[^>]+>/g, "").trim(),
          link,
          snippet: match[3].replace(/<[^>]+>/g, "").trim(),
          displayLink: new URL(link).hostname,
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    )
  }
}
