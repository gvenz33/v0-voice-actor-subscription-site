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
    if (GOOGLE_API_KEY && GOOGLE_CX) {
      return await googleSearch(query)
    }

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

async function googleSearch(query: string) {
  const googleRes = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
      GOOGLE_API_KEY as string
    )}&cx=${encodeURIComponent(GOOGLE_CX as string)}&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" } }
  )

  if (!googleRes.ok) {
    // If Google is configured but fails, still try free fallback
    return await fallbackSearch(query)
  }

  const data = (await googleRes.json()) as {
    items?: Array<{ title?: string; link?: string; snippet?: string; displayLink?: string }>
  }

  const results =
    data.items
      ?.filter((item) => item.link?.startsWith("http"))
      .map((item) => ({
        title: item.title || "Untitled",
        link: item.link || "",
        snippet: item.snippet || "",
        displayLink: item.displayLink || "",
      })) || []

  if (results.length === 0) {
    return NextResponse.json(
      { error: "No results found. Try more specific keywords." },
      { status: 404 }
    )
  }

  return NextResponse.json({ results, source: "google" })
}

async function fallbackSearch(query: string) {
  const ddgUrls = [
    `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
  ]

  let html = ""
  for (const url of ddgUrls) {
    const ddgRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    })

    if (!ddgRes.ok) continue
    html = await ddgRes.text()
    if (html.length > 0) break
  }

  if (!html) {
    return NextResponse.json(
      { error: "Search service temporarily unavailable." },
      { status: 502 }
    )
  }

  // Parse result links
  const liteLinkPattern =
    /rel="nofollow"\s+href="[^"]*uddg=([^&"]+)[^"]*"\s+class='result-link'>([^<]+)/g
  const liteSnippetPattern = /class='result-snippet'>\s*([\s\S]*?)<\/td>/g

  const htmlLinkPattern = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const htmlSnippetPattern = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g

  const liteLinkMatches = [...html.matchAll(liteLinkPattern)]
  const liteSnippetMatches = [...html.matchAll(liteSnippetPattern)]
  const htmlLinkMatches = [...html.matchAll(htmlLinkPattern)]
  const htmlSnippetMatches = [...html.matchAll(htmlSnippetPattern)]

  const linkMatches = liteLinkMatches.length > 0 ? liteLinkMatches : htmlLinkMatches
  const snippetMatches = liteSnippetMatches.length > 0 ? liteSnippetMatches : htmlSnippetMatches

  const results: Array<{
    title: string
    link: string
    snippet: string
    displayLink: string
  }> = []

  for (let i = 0; i < linkMatches.length; i++) {
    let url: string
    try {
      const rawUrl = linkMatches[i][1]
      url =
        liteLinkMatches.length > 0 ? decodeURIComponent(rawUrl) : rawUrl
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
