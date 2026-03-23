import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY
const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX

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
    // Use Google Custom Search API if configured
    if (GOOGLE_API_KEY && GOOGLE_CX) {
      const googleUrl = new URL("https://www.googleapis.com/customsearch/v1")
      googleUrl.searchParams.set("key", GOOGLE_API_KEY)
      googleUrl.searchParams.set("cx", GOOGLE_CX)
      googleUrl.searchParams.set("q", query)
      googleUrl.searchParams.set("num", "10")

      const googleRes = await fetch(googleUrl.toString())
      
      if (!googleRes.ok) {
        const errorData = await googleRes.json().catch(() => ({}))
        console.error("[v0] Google Search API error:", errorData)
        // Fall back to DuckDuckGo if Google fails
        return await fallbackSearch(query)
      }

      const data = await googleRes.json()

      if (!data.items || data.items.length === 0) {
        return NextResponse.json(
          { error: "No results found. Try different keywords." },
          { status: 404 }
        )
      }

      const results = data.items
        .filter((item: any) => {
          const url = item.link || ""
          return !/wikipedia\.org|youtube\.com|reddit\.com|facebook\.com|twitter\.com|tiktok\.com/i.test(url)
        })
        .map((item: any) => ({
          title: item.title || "",
          link: item.link || "",
          snippet: item.snippet || "",
          displayLink: item.displayLink || "",
        }))

      return NextResponse.json({ results, source: "google" })
    }

    // Fallback to DuckDuckGo if no Google API configured
    return await fallbackSearch(query)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Search error:", errMsg)
    return NextResponse.json(
      { error: `Search failed: ${errMsg}` },
      { status: 500 }
    )
  }
}

async function fallbackSearch(query: string) {
  // Use DuckDuckGo Lite - free, no API key, returns real results
  const ddgRes = await fetch(
    `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    }
  )

  if (!ddgRes.ok) {
    return NextResponse.json(
      { error: "Search service temporarily unavailable." },
      { status: 502 }
    )
  }

  const html = await ddgRes.text()

  // Parse result links
  const linkPattern =
    /rel="nofollow"\s+href="[^"]*uddg=([^&"]+)[^"]*"\s+class='result-link'>([^<]+)/g
  const linkMatches = [...html.matchAll(linkPattern)]

  const snippetPattern = /class='result-snippet'>\s*([\s\S]*?)<\/td>/g
  const snippetMatches = [...html.matchAll(snippetPattern)]

  const results: Array<{
    title: string
    link: string
    snippet: string
    displayLink: string
  }> = []

  for (let i = 0; i < linkMatches.length; i++) {
    let url: string
    try {
      url = decodeURIComponent(linkMatches[i][1])
    } catch {
      continue
    }

    if (!url.startsWith("http")) continue
    if (
      /wikipedia\.org|youtube\.com|reddit\.com|facebook\.com|twitter\.com|tiktok\.com/i.test(
        url
      )
    ) {
      continue
    }

    const title = linkMatches[i][2]
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .trim()

    const snippet = snippetMatches[i]
      ? snippetMatches[i][1]
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim()
      : ""

    let displayLink = ""
    try {
      displayLink = new URL(url).hostname.replace("www.", "")
    } catch {
      displayLink = url
    }

    results.push({ title, link: url, snippet, displayLink })
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: "No results found. Try more specific keywords." },
      { status: 404 }
    )
  }

  return NextResponse.json({ results, source: "duckduckgo" })
}
