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
    // Use Google Custom Search API if keys are available
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

    // Fallback: Use AI to find real, specific companies
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are a voice acting industry research assistant. The user is an independent voice actor looking for production companies to pitch their services to.

Based on this search query: "${query}"

Return a JSON array of 10 REAL, SPECIFIC production companies, studios, or agencies that match this query. These must be real companies that actually exist with real websites.

Return ONLY valid JSON in this exact format, no other text:
[
  {
    "name": "Company Name",
    "website": "https://example.com",
    "location": "City, State",
    "description": "What they do and why a voice actor would contact them.",
    "category": "production_company"
  }
]

category must be one of: production_company, ad_agency, studio, e_learning, podcast, animation, gaming, audiobook

Focus on companies that:
1. Actually hire voice actors or accept voice over submissions
2. Are actively producing content
3. Have contact information available on their websites
4. Range from well-known to mid-size (not just the huge players)

Be specific and accurate. Only include companies you are confident are real.`,
    })

    console.log("[v0] AI search raw response length:", text.length)

    // Parse the JSON from the AI response
    let companies: Array<{
      name: string
      website: string
      location: string
      description: string
      category: string
    }> = []

    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        companies = JSON.parse(jsonMatch[0])
      }
    } catch (parseErr) {
      console.error("[v0] Failed to parse AI response:", parseErr)
      console.error("[v0] Raw text:", text.substring(0, 500))
      return NextResponse.json(
        { error: "Failed to parse search results. Please try again." },
        { status: 500 }
      )
    }

    const results = companies.map((company) => ({
      title: company.name,
      link: company.website.startsWith("http")
        ? company.website
        : `https://${company.website}`,
      snippet: company.description,
      displayLink: company.website
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, ""),
      location: company.location,
      category: company.category,
    }))

    console.log("[v0] Returning", results.length, "search results")
    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    )
  }
}
