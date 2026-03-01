import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"

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

    // Priority 3: AI-powered company directory
    // Uses GPT to return real, verifiable companies with their actual websites
    console.log("[v0] Starting AI search for query:", query)
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      system: `You are a research assistant that helps voice actors find production companies and studios to pitch their services to.

CRITICAL RULES:
- Only return REAL companies that actually exist with their REAL website URLs
- Do NOT invent or fabricate any company or URL
- If you are not confident a company or URL is real, do not include it
- Return between 8-15 results
- Focus on companies that would hire voice actors

Return your response as a PIPE-DELIMITED list with one company per line in this exact format:
COMPANY_NAME|WEBSITE_URL|SHORT_DESCRIPTION|CITY_STATE_OR_COUNTRY|CATEGORY

Categories must be one of: production_company, ad_agency, studio, animation, e_learning, audiobook, gaming, podcast, casting

Example line:
Pixar Animation Studios|https://www.pixar.com|Award-winning animation studio known for Toy Story, Finding Nemo, and more|Emeryville, CA|animation

Do NOT include any other text, headers, numbering, or markdown. Just the pipe-delimited lines.`,
      prompt: `Find real production companies, studios, and agencies matching this search: "${query}"`,
    })

    console.log("[v0] AI response received, text length:", result.text?.length)
    console.log("[v0] AI response first 500 chars:", result.text?.substring(0, 500))

    // Parse pipe-delimited response - extremely robust
    const lines = result.text
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && line.includes("|") && line.includes("http"))

    const results = lines
      .map((line: string) => {
        const parts = line.split("|").map((p: string) => p.trim())
        if (parts.length < 3) return null

        const title = parts[0] || ""
        const link = parts[1] || ""
        const snippet = parts[2] || ""
        const location = parts[3] || ""
        const category = parts[4] || ""

        // Validate URL
        try {
          const url = new URL(link)
          return {
            title,
            link: url.href,
            snippet,
            displayLink: url.hostname.replace("www.", ""),
            location,
            category,
          }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No results found. Try different keywords like 'animation studios Los Angeles' or 'e-learning production company'." },
        { status: 404 }
      )
    }

    return NextResponse.json({ results })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : ""
    console.error("[v0] Search error message:", errMsg)
    console.error("[v0] Search error stack:", errStack)
    return NextResponse.json(
      { error: `Search failed: ${errMsg}` },
      { status: 500 }
    )
  }
}
