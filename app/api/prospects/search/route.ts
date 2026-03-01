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

    // Option 2: Use Bing Web Search via scraping the HTML
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    console.log("[v0] Fetching DuckDuckGo:", searchUrl)

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
      console.error("[v0] DuckDuckGo returned status:", res.status)
      return NextResponse.json(
        { error: "Search service temporarily unavailable. Please try again." },
        { status: 502 }
      )
    }

    const html = await res.text()
    console.log("[v0] DuckDuckGo HTML length:", html.length)

    // Parse the DuckDuckGo HTML results page
    // Each result is inside a <div class="result results_links results_links_deep web-result">
    // with an <a class="result__a" href="...">Title</a>
    // and <a class="result__snippet">description</a>
    const results: Array<{
      title: string
      link: string
      snippet: string
      displayLink: string
    }> = []

    // Extract each result block using result__a for the link/title and result__snippet for description
    const resultBlocks = html.split(/class="result__body"/)

    for (let i = 1; i < resultBlocks.length && results.length < 15; i++) {
      const block = resultBlocks[i]

      // Extract the URL from result__a href
      const hrefMatch = block.match(
        /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/
      )
      if (!hrefMatch) continue

      let url = hrefMatch[1]
      // DuckDuckGo wraps URLs in a redirect, extract the actual URL
      const uddgMatch = url.match(/uddg=([^&]+)/)
      if (uddgMatch) {
        url = decodeURIComponent(uddgMatch[1])
      }

      // Clean HTML tags from title
      const title = hrefMatch[2].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim()

      // Extract snippet
      const snippetMatch = block.match(
        /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/
      )
      const snippet = snippetMatch
        ? snippetMatch[1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim()
        : ""

      // Extract display link
      let displayLink = ""
      try {
        displayLink = new URL(url).hostname.replace("www.", "")
      } catch {
        displayLink = url.replace(/^https?:\/\//, "").split("/")[0]
      }

      // Skip obviously bad results (search engines, directories, etc)
      if (
        !url.startsWith("http") ||
        url.includes("duckduckgo.com") ||
        url.includes("google.com/search") ||
        !title
      ) {
        continue
      }

      results.push({ title, link: url, snippet, displayLink })
    }

    console.log("[v0] Parsed", results.length, "results from DuckDuckGo")

    if (results.length === 0) {
      // If parsing failed, return a helpful message
      return NextResponse.json({
        results: [],
        error: "No results found. Try more specific terms like 'Pixar animation studio' or 'e-learning production company New York'.",
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    )
  }
}
