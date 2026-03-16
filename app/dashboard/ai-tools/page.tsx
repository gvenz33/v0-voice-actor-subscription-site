"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import useSWR from "swr"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Mail,
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  Loader2,
  Send,
  RefreshCw,
  Zap,
  Lock,
  ArrowUpRight,
  Pencil,
  Save,
  FileSignature,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface UsageData {
  tier: string
  tierLabel: string
  generationCount: number
  monthlyLimit: number
  remainingGenerations: number
  isUnlimited: boolean
  canGenerate: boolean
  hasFollowUpWriter: boolean
  hasPitchGenerator: boolean
  hasChatAssistant: boolean
}

function getUIMessageText(msg: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

// --- Usage Meter ---
function UsageMeter({ usage }: { usage: UsageData }) {
  if (usage.tier === "free") {
    return (
      <Card className="border-[oklch(0.55_0.22_295_/_0.3)] bg-[oklch(0.55_0.22_295_/_0.05)]">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <Lock className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">AI Tools Require a Subscription</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upgrade to Launch ($19/mo) to start generating AI outreach emails.
            </p>
          </div>
          <Button asChild className="mt-2 bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90">
            <Link href="/checkout/launch">
              Upgrade Now <ArrowUpRight className="ml-1 size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const percentage = usage.isUnlimited
    ? 0
    : Math.min(100, (usage.generationCount / usage.monthlyLimit) * 100)

  return (
    <Card>
      <CardContent className="flex items-center gap-6 p-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {usage.tierLabel} Plan
            </span>
            <span className="text-muted-foreground">
              {usage.isUnlimited
                ? `${usage.generationCount} used (unlimited)`
                : `${usage.generationCount} / ${usage.monthlyLimit} this month`}
            </span>
          </div>
          {!usage.isUnlimited && (
            <Progress value={percentage} className="mt-2 h-2" />
          )}
        </div>
        {!usage.isUnlimited && usage.remainingGenerations <= 5 && usage.remainingGenerations > 0 && (
          <span className="whitespace-nowrap rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
            {usage.remainingGenerations} left
          </span>
        )}
        {!usage.isUnlimited && usage.remainingGenerations === 0 && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/checkout/momentum">Upgrade</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// --- Locked Feature Overlay ---
function LockedFeature({ featureName, requiredTier, requiredTierId }: {
  featureName: string
  requiredTier: string
  requiredTierId: string
}) {
  return (
    <Card className="flex min-h-[400px] items-center justify-center">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-[oklch(0.55_0.22_295_/_0.1)]">
          <Lock className="size-8 text-[oklch(0.60_0.22_295)]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{featureName}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            This feature is available on the {requiredTier} plan and above. Upgrade to unlock it.
          </p>
        </div>
        <Button asChild className="mt-2 bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90">
          <Link href={`/checkout/${requiredTierId}`}>
            Upgrade to {requiredTier} <ArrowUpRight className="ml-1 size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// --- Limit Reached Overlay ---
function LimitReached({ usage }: { usage: UsageData }) {
  const nextTier = usage.tier === "launch" ? { name: "Momentum", id: "momentum", limit: 50 } : { name: "Command", id: "command", limit: "Unlimited" }

  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <Zap className="size-8 text-orange-400" />
        <div>
          <p className="font-medium text-foreground">Monthly Limit Reached</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {"You've"} used all {usage.monthlyLimit} AI generations this month.
            Upgrade to {nextTier.name} for {nextTier.limit === "Unlimited" ? "unlimited" : `${nextTier.limit}/mo`} generations.
          </p>
        </div>
        <Button asChild className="mt-2 bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90">
          <Link href={`/checkout/${nextTier.id}`}>
            Upgrade to {nextTier.name} <ArrowUpRight className="ml-1 size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// --- Outreach Email Writer ---
function OutreachEmailWriter({ usage, onGenerated, prefillCompany, prefillName, prefillEmail, prefillRole }: {
  usage: UsageData
  onGenerated: () => void
  prefillCompany?: string
  prefillName?: string
  prefillEmail?: string
  prefillRole?: string
}) {
  const [companyName, setCompanyName] = useState(prefillCompany || "")
  const [contactName, setContactName] = useState(prefillName || "")
  const [recipientEmail, setRecipientEmail] = useState(prefillEmail || "")
  const [genre, setGenre] = useState("")
  const [tone, setTone] = useState("professional")
  const [customNotes, setCustomNotes] = useState(prefillRole ? `Contact role: ${prefillRole}` : "")
  const [result, setResult] = useState("")
  const [editedResult, setEditedResult] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  
  // Signature state
  const [signature, setSignature] = useState("")
  const [showSignatureEditor, setShowSignatureEditor] = useState(false)
  const [signatureLoading, setSignatureLoading] = useState(false)
  const [signatureSaved, setSignatureSaved] = useState(false)
  
  // Send email state
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [sendError, setSendError] = useState("")

  // Load signature from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("vo_email_signature")
    if (saved) setSignature(saved)
  }, [])

  // Update fields if prefill values change (navigating from Prospect Finder)
  useEffect(() => {
    if (prefillCompany) setCompanyName(prefillCompany)
    if (prefillName) setContactName(prefillName)
    if (prefillEmail) setRecipientEmail(prefillEmail)
    if (prefillRole) setCustomNotes(`Contact role: ${prefillRole}`)
  }, [prefillCompany, prefillName, prefillEmail, prefillRole])

  // Sync editedResult with result when result changes
  useEffect(() => {
    setEditedResult(result)
    setIsEditing(false)
  }, [result])

  const saveSignature = () => {
    setSignatureLoading(true)
    localStorage.setItem("vo_email_signature", signature)
    setSignatureSaved(true)
    setTimeout(() => setSignatureSaved(false), 2000)
    setSignatureLoading(false)
  }

  const getFinalEmail = () => {
    // Always use editedResult since it's synced with result on generation
    // and contains any user edits
    const emailContent = editedResult || result
    return signature ? `${emailContent}\n\n${signature}` : emailContent
  }

  const handleSendEmail = async () => {
    if (!recipientEmail) return
    setSending(true)
    setSendError("")
    setSendSuccess(false)
    
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Voice Over Inquiry - ${companyName || "Collaboration Opportunity"}`,
          body: getFinalEmail(),
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setSendSuccess(true)
        setTimeout(() => setSendSuccess(false), 3000)
      } else {
        setSendError(data.error || "Failed to send email")
      }
    } catch {
      setSendError("Network error. Please try again.")
    }
    setSending(false)
  }

  if (!usage.canGenerate && usage.tier !== "free") {
    return <LimitReached usage={usage} />
  }

  const handleGenerate = async () => {
    setLoading(true)
    setResult("")
    setError("")
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "outreach_email",
          context: { companyName, contactName, genre, tone, customNotes },
        }),
      })
      const data = await res.json()
      console.log("[v0] Generate response status:", res.status, "| data:", data)
      if (!res.ok) {
        if (data.error === "limit_reached") {
          setError(`Monthly limit reached (${data.used}/${data.limit}). Upgrade for more.`)
        } else {
          setError(data.error || "Something went wrong.")
        }
      } else {
        setResult(data.text)
        onGenerated()
      }
    } catch (err) {
      console.error("[v0] Client generate error:", err)
      setError("Network error. Please try again.")
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getFinalEmail())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="size-5 text-[oklch(0.70_0.22_295)]" />
            Email Details
          </CardTitle>
          <CardDescription>
            Tell us about the company you want to reach out to and we will craft a compelling cold email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" placeholder="e.g. Acme Productions" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactName">Contact Person (optional)</Label>
            <Input id="contactName" placeholder="e.g. Sarah Johnson" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipientEmail">Recipient Email</Label>
            <Input id="recipientEmail" type="email" placeholder="e.g. casting@acmeproductions.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="genre">Genre / Niche</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="narration">Narration</SelectItem>
                <SelectItem value="e_learning">E-Learning</SelectItem>
                <SelectItem value="audiobook">Audiobook</SelectItem>
                <SelectItem value="animation">Animation / Character</SelectItem>
                <SelectItem value="video_game">Video Game</SelectItem>
                <SelectItem value="promo">Promo / Trailer</SelectItem>
                <SelectItem value="podcast">Podcast</SelectItem>
                <SelectItem value="ivr">IVR / Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tone">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly & Warm</SelectItem>
                <SelectItem value="confident">Bold & Confident</SelectItem>
                <SelectItem value="casual">Casual & Approachable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea id="notes" placeholder="Any specifics - your demo reel link, a project you admired from them, etc." value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} rows={3} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleGenerate} disabled={loading} className="min-h-[48px] bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90">
            {loading ? (<><Loader2 className="mr-2 size-4 animate-spin" /> Generating...</>) : (<><Sparkles className="mr-2 size-4" /> Generate Email</>)}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2"><Zap className="size-5 text-[oklch(0.65_0.18_265)]" /> Generated Email</span>
              {result && (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditing(!isEditing)}
                    title={isEditing ? "Done editing" : "Edit email"}
                  >
                    {isEditing ? <Check className="size-4" /> : <Pencil className="size-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</Button>
                  <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="flex flex-col gap-4">
                {isEditing ? (
                  <Textarea
                    value={editedResult}
                    onChange={(e) => setEditedResult(e.target.value)}
                    className="min-h-[200px] text-sm leading-relaxed"
                    placeholder="Edit your email here..."
                  />
                ) : (
                  <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
                    {editedResult || result}
                    {signature && (
                      <>
                        <div className="my-4 border-t border-border/50" />
                        <div className="text-muted-foreground">{signature}</div>
                      </>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-3">
                    {recipientEmail && (
                      <>
                        <Button
                          className="gap-2 bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90"
                          onClick={handleSendEmail}
                          disabled={sending}
                        >
                          {sending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : sendSuccess ? (
                            <Check className="size-4" />
                          ) : (
                            <Send className="size-4" />
                          )}
                          {sending ? "Sending..." : sendSuccess ? "Sent!" : `Send to ${recipientEmail}`}
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            const subject = encodeURIComponent(`Voice Over Inquiry - ${companyName || "Collaboration Opportunity"}`)
                            const body = encodeURIComponent(getFinalEmail())
                            window.open(`mailto:${recipientEmail}?subject=${subject}&body=${body}`, "_blank")
                          }}
                        >
                          <Mail className="size-4" />
                          Open in Mail App
                        </Button>
                      </>
                    )}
                    <Button variant="outline" className="gap-2" onClick={handleCopy}>
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied ? "Copied!" : "Copy to Clipboard"}
                    </Button>
                  </div>
                  {sendError && (
                    <p className="text-sm text-destructive">{sendError}</p>
                  )}
                  {sendSuccess && (
                    <p className="text-sm text-green-500">Email sent successfully!</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Mail className="mb-3 size-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Fill in the details and hit Generate to craft your outreach email.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Signature Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowSignatureEditor(!showSignatureEditor)}>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <FileSignature className="size-4 text-[oklch(0.65_0.18_265)]" />
                Email Signature
              </span>
              <span className="text-xs text-muted-foreground">
                {showSignatureEditor ? "Click to collapse" : "Click to expand"}
              </span>
            </CardTitle>
          </CardHeader>
          {showSignatureEditor && (
            <CardContent className="flex flex-col gap-3">
              <Textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Best regards,&#10;Your Name&#10;Voice Over Artist&#10;yourwebsite.com | (555) 123-4567"
                rows={5}
                className="text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Your signature will be automatically appended to generated emails.
                </p>
                <Button 
                  size="sm" 
                  onClick={saveSignature} 
                  disabled={signatureLoading}
                  className="gap-1.5"
                >
                  {signatureLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : signatureSaved ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {signatureSaved ? "Saved!" : "Save Signature"}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}

// --- Follow-Up Writer ---
function FollowUpWriter({ usage, onGenerated }: { usage: UsageData; onGenerated: () => void }) {
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [daysSince, setDaysSince] = useState("")
  const [previousContext, setPreviousContext] = useState("")
  const [customNotes, setCustomNotes] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  if (!usage.hasFollowUpWriter) {
    return <LockedFeature featureName="Follow-Up Writer" requiredTier="Momentum" requiredTierId="momentum" />
  }
  if (!usage.canGenerate && !usage.isUnlimited) {
    return <LimitReached usage={usage} />
  }

  const handleGenerate = async () => {
    setLoading(true)
    setResult("")
    setError("")
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "follow_up", context: { companyName, contactName, daysSince, previousContext, customNotes } }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === "limit_reached" ? `Monthly limit reached.` : (data.error || "Something went wrong."))
      } else {
        setResult(data.text)
        onGenerated()
      }
    } catch {
      setError("Something went wrong. Please try again.")
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><RefreshCw className="size-5 text-[oklch(0.70_0.22_295)]" /> Follow-Up Details</CardTitle>
          <CardDescription>Re-engage a cold lead with a warm, non-pushy follow-up email.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><Label>Company Name</Label><Input placeholder="e.g. Acme Productions" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          <div className="flex flex-col gap-1.5"><Label>Contact Person</Label><Input placeholder="e.g. Sarah Johnson" value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
          <div className="flex flex-col gap-1.5"><Label>Days Since Last Contact</Label><Input type="number" placeholder="e.g. 14" value={daysSince} onChange={(e) => setDaysSince(e.target.value)} /></div>
          <div className="flex flex-col gap-1.5"><Label>What Was Your Last Interaction?</Label><Textarea placeholder="e.g. Sent initial cold email with demo reel link" value={previousContext} onChange={(e) => setPreviousContext(e.target.value)} rows={2} /></div>
          <div className="flex flex-col gap-1.5"><Label>Additional Notes (optional)</Label><Textarea placeholder="Any new updates - new demo, recent booking, seasonal angle" value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} rows={2} /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleGenerate} disabled={loading} className="min-h-[48px] bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90">
            {loading ? (<><Loader2 className="mr-2 size-4 animate-spin" /> Writing...</>) : (<><Send className="mr-2 size-4" /> Generate Follow-Up</>)}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2"><Zap className="size-5 text-[oklch(0.65_0.18_265)]" /> Generated Follow-Up</span>
            {result && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed text-foreground">{result}</div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center"><RefreshCw className="mb-3 size-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">Fill in the details to generate a thoughtful follow-up email.</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- Pitch Generator ---
function PitchGenerator({ usage, onGenerated }: { usage: UsageData; onGenerated: () => void }) {
  const [genre, setGenre] = useState("")
  const [experience, setExperience] = useState("")
  const [strengths, setStrengths] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  if (!usage.hasPitchGenerator) {
    return <LockedFeature featureName="Elevator Pitch Generator" requiredTier="Momentum" requiredTierId="momentum" />
  }
  if (!usage.canGenerate && !usage.isUnlimited) {
    return <LimitReached usage={usage} />
  }

  const handleGenerate = async () => {
    setLoading(true)
    setResult("")
    setError("")
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pitch_generator", context: { genre, experience, strengths, targetAudience } }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === "limit_reached" ? `Monthly limit reached.` : (data.error || "Something went wrong."))
      } else {
        setResult(data.text)
        onGenerated()
      }
    } catch {
      setError("Something went wrong. Please try again.")
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="size-5 text-[oklch(0.70_0.22_295)]" /> Pitch Details</CardTitle>
          <CardDescription>Tell us about your voice and specialties, and we will create a memorable elevator pitch.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Specialization</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger><SelectValue placeholder="Select your main genre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="narration">Narration / Documentary</SelectItem>
                <SelectItem value="e_learning">E-Learning / Corporate</SelectItem>
                <SelectItem value="audiobook">Audiobook</SelectItem>
                <SelectItem value="animation">Animation / Character</SelectItem>
                <SelectItem value="video_game">Video Game</SelectItem>
                <SelectItem value="promo">Promo / Trailer</SelectItem>
                <SelectItem value="podcast">Podcast Host / Narrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Experience Level</Label>
            <Select value={experience} onValueChange={setExperience}>
              <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                <SelectItem value="professional">Professional (5+ years)</SelectItem>
                <SelectItem value="veteran">Veteran (10+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="strengths">Your Key Strengths</Label><Textarea id="strengths" placeholder="e.g. warm conversational tone, character range, quick turnarounds, home studio" value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="target">Target Clients</Label><Input id="target" placeholder="e.g. ad agencies, e-learning companies, indie game studios" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleGenerate} disabled={loading} className="min-h-[48px] bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90">
            {loading ? (<><Loader2 className="mr-2 size-4 animate-spin" /> Crafting...</>) : (<><Sparkles className="mr-2 size-4" /> Generate Pitch</>)}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2"><Zap className="size-5 text-[oklch(0.65_0.18_265)]" /> Your Elevator Pitch</span>
            {result && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-4 text-lg font-medium leading-relaxed text-foreground">{result}</div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center"><Sparkles className="mb-3 size-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">Fill in your details and we will create a punchy, memorable elevator pitch.</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- VO Business Chat Assistant ---
function VOAssistant({ usage }: { usage: UsageData }) {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  if (!usage.hasChatAssistant) {
    return <LockedFeature featureName="VO Business Assistant" requiredTier="Command" requiredTierId="command" />
  }

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="size-5 text-[oklch(0.70_0.22_295)]" /> VO Business Assistant</CardTitle>
        <CardDescription>Ask anything about marketing your VO business, rate negotiation, outreach strategies, or industry best practices.</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">How can I help your VO business today?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["How do I price my first commercial gig?", "Write a LinkedIn summary for my VO profile", "Tips for cold emailing production companies", "What are typical usage rights terms?"].map((suggestion) => (
                  <button key={suggestion} onClick={() => { sendMessage({ text: suggestion }) }} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[oklch(0.60_0.22_295)] hover:text-foreground">{suggestion}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground" : "border border-border bg-card text-card-foreground"}`}>
                    <div className="whitespace-pre-wrap">{getUIMessageText(message)}</div>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start"><div className="rounded-2xl border border-border bg-card px-4 py-2.5"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div></div>
              )}
            </div>
          )}
        </div>
        <form className="flex shrink-0 gap-2" onSubmit={(e) => { e.preventDefault(); if (!input.trim() || isLoading) return; sendMessage({ text: input }); setInput("") }}>
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about rates, outreach, marketing, industry tips..." disabled={isLoading} className="min-h-[48px] text-base" />
          <Button type="submit" disabled={!input.trim() || isLoading} className="min-h-[48px] bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90">
            <Send className="size-4" /><span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// --- Main Page ---
export default function AIToolsPage() {
  const searchParams = useSearchParams()
  const prefillCompany = searchParams.get("company") || ""
  const prefillEmail = searchParams.get("email") || ""
  const prefillName = searchParams.get("name") || ""
  const prefillRole = searchParams.get("role") || ""
  const hasPrefill = !!(prefillCompany || prefillEmail)

  const { data: usage, mutate } = useSWR<UsageData>("/api/ai/usage", fetcher, { refreshInterval: 0 })

  const refreshUsage = useCallback(() => { mutate() }, [mutate])

  if (!usage) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading AI Tools...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
          AI Tools
        </h2>
        <p className="text-sm text-muted-foreground">
          AI-powered tools to help you market yourself, craft outreach, and grow your voice over business faster.
        </p>
      </div>

      <UsageMeter usage={usage} />

      {usage.tier === "free" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Mail, name: "Outreach Email Writer", tier: "Launch", id: "launch" },
            { icon: RefreshCw, name: "Follow-Up Writer", tier: "Momentum", id: "momentum" },
            { icon: Sparkles, name: "Elevator Pitch Generator", tier: "Momentum", id: "momentum" },
            { icon: MessageSquare, name: "VO Business Assistant", tier: "Command", id: "command" },
          ].map((tool) => (
            <Card key={tool.name} className="flex flex-col items-center gap-3 p-6 text-center opacity-60">
              <Lock className="size-6 text-muted-foreground" />
              <tool.icon className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">{tool.name}</p>
              <p className="text-xs text-muted-foreground">Requires {tool.tier}+</p>
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="outreach" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="outreach" className="gap-1.5"><Mail className="size-4" /><span className="hidden sm:inline">Outreach</span> Email</TabsTrigger>
            <TabsTrigger value="followup" className="gap-1.5">
              <RefreshCw className="size-4" />
              Follow-Up
              {!usage.hasFollowUpWriter && <Lock className="ml-1 size-3" />}
            </TabsTrigger>
            <TabsTrigger value="pitch" className="gap-1.5">
              <Sparkles className="size-4" />
              <span className="hidden sm:inline">Elevator</span> Pitch
              {!usage.hasPitchGenerator && <Lock className="ml-1 size-3" />}
            </TabsTrigger>
            <TabsTrigger value="assistant" className="gap-1.5">
              <MessageSquare className="size-4" />
              Assistant
              {!usage.hasChatAssistant && <Lock className="ml-1 size-3" />}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outreach" className="mt-6"><OutreachEmailWriter usage={usage} onGenerated={refreshUsage} prefillCompany={prefillCompany} prefillName={prefillName} prefillEmail={prefillEmail} prefillRole={prefillRole} /></TabsContent>
          <TabsContent value="followup" className="mt-6"><FollowUpWriter usage={usage} onGenerated={refreshUsage} /></TabsContent>
          <TabsContent value="pitch" className="mt-6"><PitchGenerator usage={usage} onGenerated={refreshUsage} /></TabsContent>
          <TabsContent value="assistant" className="mt-6"><VOAssistant usage={usage} /></TabsContent>
        </Tabs>
      )}
    </div>
  )
}
