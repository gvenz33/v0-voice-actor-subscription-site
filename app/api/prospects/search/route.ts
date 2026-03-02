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

    // Parse result links: <a rel="nofollow" href="//duckduckgo.com/l/?uddg=ENCODED_URL&..." class='result-link'>TITLE</a>
    const linkPattern =
      /rel="nofollow"\s+href="[^"]*uddg=([^&"]+)[^"]*"\s+class='result-link'>([^<]+)/g
    const linkMatches = [...html.matchAll(linkPattern)]

    // Parse snippets: <td class='result-snippet'>TEXT</td>
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

      // Skip non-http and aggregator sites
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

      results.push({
        title,
        link: url,
        snippet,
        displayLink,
      })
    }

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
      { error: `Search failed: ${errMsg}` },
      { status: 500 }
    )
  }
}
