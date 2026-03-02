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
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are a research assistant for voice actors looking for production companies to pitch their services to.

Given this search query: "${query}"

Return EXACTLY 10 real, verifiable companies that match. Each company must be a real business that currently exists. Focus on production companies, studios, agencies, and post-production houses that hire voice actors.

Return ONLY lines in this exact format with no headers, numbering, or extra text:
COMPANY NAME | https://their-real-website.com | City, State | Short 1-sentence description of what they do and why a voice actor would contact them

Example output format:
Pixar Animation Studios | https://www.pixar.com | Emeryville, CA | Award-winning animation studio producing feature films that regularly cast voice talent
Funimation | https://www.funimation.com | Flower Mound, TX | Leading anime dubbing and distribution company that frequently casts English voice actors

Return exactly 10 lines. No numbering. No headers. No blank lines. Just the pipe-separated data.`,
    })

    const lines = result.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes("|") && l.includes("http"))

    const results = lines.map((line) => {
      const parts = line.split("|").map((p) => p.trim())
      const name = parts[0] || "Unknown Company"
      const link = parts[1] || ""
      const location = parts[2] || ""
      const snippet = parts[3] || ""

      let displayLink = ""
      try {
        displayLink = new URL(link).hostname.replace("www.", "")
      } catch {
        displayLink = link
      }

      return {
        title: name,
        link,
        snippet,
        displayLink,
        location,
      }
    })

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No results found. Try different search terms." },
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
