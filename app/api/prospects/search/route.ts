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
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY
    const googleCx = process.env.GOOGLE_SEARCH_CX

    if (!googleApiKey || !googleCx) {
      console.error("[v0] Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX")
      return NextResponse.json(
        { error: "Search is not configured. Please add Google Search API credentials." },
        { status: 500 }
      )
    }

    // Debug: log key lengths and CX format (not the actual values for security)
    console.log("[v0] API key length:", googleApiKey.length, "| CX value:", googleCx, "| Query:", query)

    // Make sure CX doesn't have extra spaces or quotes
    const cleanCx = googleCx.trim().replace(/['"]/g, "")
    const cleanKey = googleApiKey.trim().replace(/['"]/g, "")

    const url = `https://www.googleapis.com/customsearch/v1?key=${cleanKey}&cx=${cleanCx}&q=${encodeURIComponent(query)}&num=10`
    console.log("[v0] Fetching URL (redacted key):", url.replace(cleanKey, "REDACTED"))
    
    const res = await fetch(url)
    const data = await res.json()

    if (!res.ok) {
      console.error("[v0] Google API error status:", res.status, "| Full error:", JSON.stringify(data))
      return NextResponse.json(
        { error: `Google Search error: ${data.error?.message || "Unknown error"}` },
        { status: res.status }
      )
    }

    console.log("[v0] Google returned", data.items?.length || 0, "results")

    const results = (data.items || []).map(
      (item: {
        title: string
        link: string
        snippet: string
        displayLink: string
        pagemap?: {
          metatags?: Array<Record<string, string>>
        }
      }) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet || "",
        displayLink: item.displayLink,
      })
    )

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No results found. Try different keywords." },
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
