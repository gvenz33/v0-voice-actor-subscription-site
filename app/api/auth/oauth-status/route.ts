import { NextResponse } from "next/server"
import { isGmailOAuthConfigured, isOutlookOAuthConfigured } from "@/lib/oauth-config"

export async function GET() {
  return NextResponse.json({
    gmail: isGmailOAuthConfigured(),
    outlook: isOutlookOAuthConfigured(),
  })
}
