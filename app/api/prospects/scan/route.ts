import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserAIAccess, incrementUsage } from "@/lib/ai-limits"
import { generateText } from "ai"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Check AI tier access (scanning uses an AI credit)
  const access = await getUserAIAccess()
  if (!access || !access.canGenerate) {
    return NextResponse.json(
      {
        error: "You've reached your AI usage limit for this month. Upgrade your plan for more.",
        requiresUpgrade: true,
      },
      { status: 429 }
    )
  }

  const { url, companyName } = await req.json()
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  try {
    // Fetch the website content
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; VOBizSuite/1.0; +https://vobizsuite.io)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const html = await res.text()

    // Strip tags but keep text content - limit to 12000 chars for AI
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000)

    // Also extract emails via regex as a backup
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const regexEmails = [...new Set(html.match(emailRegex) || [])]
      .filter(
        (e) =>
          !e.includes("example.com") &&
          !e.includes("sentry") &&
          !e.includes("wixpress") &&
          !e.includes(".png") &&
          !e.includes(".jpg")
      )
      .slice(0, 10)

    // Use AI to intelligently extract contact info
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      system: `You are an expert at extracting business contact information from website content. 
Extract ALL contact information you can find including:
- Email addresses (especially for casting, talent, production, creative departments)
- Contact person names and their roles/titles
- Phone numbers
- Physical address
- Social media links

Focus on contacts that would be relevant for a voice actor looking to pitch their services.
Respond ONLY with valid JSON in this exact format:
{
  "contacts": [
    {
      "name": "Person Name or null",
      "role": "Their role/title or null",
      "email": "their@email.com or null",
      "phone": "phone number or null",
      "department": "casting/production/general/creative or null"
    }
  ],
  "companyInfo": {
    "description": "Brief description of what this company does",
    "specializations": ["type of work they do"],
    "address": "physical address or null",
    "mainPhone": "main phone or null",
    "socialLinks": ["any social media URLs"]
  },
  "regexEmails": ${JSON.stringify(regexEmails)}
}

If you cannot find specific contact persons, still include any emails found.
Merge the regex-found emails with any you discover in the text.
Never fabricate information - only report what is actually present in the content.`,
      prompt: `Extract contact information from this website (${companyName || url}):\n\n${textContent}`,
    })

    // Increment AI usage
    await incrementUsage(access.userId)

    // Parse the AI response
    let extractedData
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      // If AI response isn't valid JSON, return regex results
      extractedData = {
        contacts: regexEmails.map((email) => ({
          name: null,
          role: null,
          email,
          phone: null,
          department: null,
        })),
        companyInfo: {
          description: "Could not parse company info",
          specializations: [],
          address: null,
          mainPhone: null,
          socialLinks: [],
        },
      }
    }

    return NextResponse.json({
      ...extractedData,
      sourceUrl: url,
      companyName: companyName || new URL(url).hostname,
    })
  } catch (error) {
    console.error("Scan error:", error)
    return NextResponse.json(
      { error: "Could not scan this website. It may be blocking automated access." },
      { status: 500 }
    )
  }
}
