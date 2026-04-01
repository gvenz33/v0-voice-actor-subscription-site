import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY
const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX

/** Google allows 10 per request; we page twice, then merge Bing RSS + DDG. */
const MAX_RESULTS = 25

type SearchHit = {
  title: string
  link: string
  snippet: string
  displayLink: string
}

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
    return await combinedSearch(query)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Search error:", errMsg)
    return NextResponse.json(
      { error: `Search failed: ${errMsg}` },
      { status: 500 }
    )
  }
}

function createAggregator() {
  const seen = new Set<string>()
  const aggregated: SearchHit[] = []
  const sources = new Set<string>()

  const pushResult = (item: SearchHit, source: string) => {
    const normalized = item.link.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) return
    if (
      /wikipedia\.org|youtube\.com|reddit\.com|facebook\.com|twitter\.com|x\.com|tiktok\.com/i.test(
        normalized
      )
    ) {
      return
    }
    seen.add(normalized)
    aggregated.push(item)
    sources.add(source)
  }

  return { aggregated, sources, pushResult }
}

async function combinedSearch(query: string) {
  const { aggregated, sources, pushResult } = createAggregator()

  await appendGoogleResults(query, pushResult)
  await appendBingRss(query, pushResult)
  await appendDuckDuckGo(query, pushResult)

  if (aggregated.length === 0) {
    return NextResponse.json(
      { error: "No results found. Try more specific keywords." },
      { status: 404 }
    )
  }

  return NextResponse.json({
    results: aggregated.slice(0, MAX_RESULTS),
    source: [...sources].sort().join("+") || "mixed",
  })
}

/** Up to 20 Google results (2 pages x 10) when API is configured. */
async function appendGoogleResults(
  query: string,
  pushResult: (item: SearchHit, source: string) => void
) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) return

  for (const start of [1, 11]) {
    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
        GOOGLE_API_KEY
      )}&cx=${encodeURIComponent(GOOGLE_CX)}&q=${encodeURIComponent(
        query
      )}&num=10&start=${start}`,
      { headers: { Accept: "application/json" } }
    )

    if (!googleRes.ok) break

    const data = (await googleRes.json()) as {
      items?: Array<{
        title?: string
        link?: string
        snippet?: string
        displayLink?: string
      }>
    }

    const items =
      data.items?.filter((item) => item.link?.startsWith("http")) || []
    if (items.length === 0) break

    for (const item of items) {
      const link = item.link || ""
      let displayLink = ""
      try {
        displayLink = new URL(link).hostname.replace("www.", "")
      } catch {
        displayLink = item.displayLink || link
      }
      pushResult(
        {
          title: item.title || "Untitled",
          link,
          snippet: item.snippet || "",
          displayLink: item.displayLink || displayLink,
        },
        "google"
      )
    }
  }
}

async function appendBingRss(
  query: string,
  pushResult: (item: SearchHit, source: string) => void
) {
  const bingRssRes = await fetch(
    `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml,application/xml,text/xml",
      },
      redirect: "follow",
    }
  )

  if (!bingRssRes.ok) return

  const rssXml = await bingRssRes.text()
  const itemBlocks = [...rssXml.matchAll(/<item>([\s\S]*?)<\/item>/g)]

  for (const block of itemBlocks) {
    const itemXml = block[1] || ""
    const titleMatch = itemXml.match(
      /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i
    )
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i)
    const descMatch = itemXml.match(
      /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i
    )

    const link = (linkMatch?.[1] || "").trim()
    if (!link.startsWith("http")) continue

    let displayLink = ""
    try {
      displayLink = new URL(link).hostname.replace("www.", "")
    } catch {
      displayLink = link
    }

    pushResult(
      {
        title: (titleMatch?.[1] || "Untitled")
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim(),
        link,
        snippet: (descMatch?.[1] || "")
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim(),
        displayLink,
      },
      "bing-rss"
    )
  }
}

async function appendDuckDuckGo(
  query: string,
  pushResult: (item: SearchHit, source: string) => void
) {
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
    if (/Unfortunately, bots use DuckDuckGo too/i.test(html)) {
      html = ""
      continue
    }
    if (html.length > 0) break
  }

  if (!html) return

  const liteLinkPattern =
    /rel="nofollow"\s+href="[^"]*uddg=([^&"]+)[^"]*"\s+class='result-link'>([^<]+)/g
  const liteSnippetPattern = /class='result-snippet'>\s*([\s\S]*?)<\/td>/g

  const htmlLinkPattern =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const htmlSnippetPattern =
    /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g

  const liteLinkMatches = [...html.matchAll(liteLinkPattern)]
  const liteSnippetMatches = [...html.matchAll(liteSnippetPattern)]
  const htmlLinkMatches = [...html.matchAll(htmlLinkPattern)]
  const htmlSnippetMatches = [...html.matchAll(htmlSnippetPattern)]

  const linkMatches =
    liteLinkMatches.length > 0 ? liteLinkMatches : htmlLinkMatches
  const snippetMatches =
    liteSnippetMatches.length > 0 ? liteSnippetMatches : htmlSnippetMatches

  for (let i = 0; i < linkMatches.length; i++) {
    let urlStr: string
    try {
      const rawUrl = linkMatches[i][1]
      urlStr =
        liteLinkMatches.length > 0 ? decodeURIComponent(rawUrl) : rawUrl
    } catch {
      continue
    }

    if (!urlStr.startsWith("http")) continue

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
      displayLink = new URL(urlStr).hostname.replace("www.", "")
    } catch {
      displayLink = urlStr
    }

    pushResult({ title, link: urlStr, snippet, displayLink }, "duckduckgo")
  }
}
