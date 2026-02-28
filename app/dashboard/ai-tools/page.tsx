"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
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
} from "lucide-react"

function getUIMessageText(msg: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

// --- Outreach Email Writer ---
function OutreachEmailWriter() {
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [genre, setGenre] = useState("")
  const [tone, setTone] = useState("professional")
  const [customNotes, setCustomNotes] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setResult("")
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
      setResult(data.text)
    } catch {
      setResult("Something went wrong. Please try again.")
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
            <Input
              id="companyName"
              placeholder="e.g. Acme Productions"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactName">Contact Person (optional)</Label>
            <Input
              id="contactName"
              placeholder="e.g. Sarah Johnson"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="genre">Genre / Niche</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger>
                <SelectValue placeholder="Select genre" />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
            <Textarea
              id="notes"
              placeholder="Any specifics - your demo reel link, a project you admired from them, etc."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90"
          >
            {loading ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="mr-2 size-4" /> Generate Email</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Zap className="size-5 text-[oklch(0.65_0.18_265)]" />
              Generated Email
            </span>
            {result && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
              {result}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Fill in the details and hit Generate to craft your outreach email.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- Pitch Generator ---
function PitchGenerator() {
  const [genre, setGenre] = useState("")
  const [experience, setExperience] = useState("")
  const [strengths, setStrengths] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setResult("")
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pitch_generator",
          context: { genre, experience, strengths, targetAudience },
        }),
      })
      const data = await res.json()
      setResult(data.text)
    } catch {
      setResult("Something went wrong. Please try again.")
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
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-[oklch(0.70_0.22_295)]" />
            Pitch Details
          </CardTitle>
          <CardDescription>
            Tell us about your voice and specialties, and we will create a memorable elevator pitch.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Specialization</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger>
                <SelectValue placeholder="Select your main genre" />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Select experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                <SelectItem value="professional">Professional (5+ years)</SelectItem>
                <SelectItem value="veteran">Veteran (10+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="strengths">Your Key Strengths</Label>
            <Textarea
              id="strengths"
              placeholder="e.g. warm conversational tone, character range, quick turnarounds, home studio"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="target">Target Clients</Label>
            <Input
              id="target"
              placeholder="e.g. ad agencies, e-learning companies, indie game studios"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90"
          >
            {loading ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Crafting...</>
            ) : (
              <><Sparkles className="mr-2 size-4" /> Generate Pitch</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Zap className="size-5 text-[oklch(0.65_0.18_265)]" />
              Your Elevator Pitch
            </span>
            {result && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-4 text-lg font-medium leading-relaxed text-foreground">
              {result}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Fill in your details and we will create a punchy, memorable elevator pitch.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- Follow-Up Writer ---
function FollowUpWriter() {
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [daysSince, setDaysSince] = useState("")
  const [previousContext, setPreviousContext] = useState("")
  const [customNotes, setCustomNotes] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setResult("")
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "follow_up",
          context: { companyName, contactName, daysSince, previousContext, customNotes },
        }),
      })
      const data = await res.json()
      setResult(data.text)
    } catch {
      setResult("Something went wrong. Please try again.")
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
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="size-5 text-[oklch(0.70_0.22_295)]" />
            Follow-Up Details
          </CardTitle>
          <CardDescription>
            Re-engage a cold lead with a warm, non-pushy follow-up email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Company Name</Label>
            <Input
              placeholder="e.g. Acme Productions"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Contact Person</Label>
            <Input
              placeholder="e.g. Sarah Johnson"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Days Since Last Contact</Label>
            <Input
              type="number"
              placeholder="e.g. 14"
              value={daysSince}
              onChange={(e) => setDaysSince(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>What Was Your Last Interaction?</Label>
            <Textarea
              placeholder="e.g. Sent initial cold email with demo reel link"
              value={previousContext}
              onChange={(e) => setPreviousContext(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Additional Notes (optional)</Label>
            <Textarea
              placeholder="Any new updates - new demo, recent booking, seasonal angle"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90"
          >
            {loading ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Writing...</>
            ) : (
              <><Send className="mr-2 size-4" /> Generate Follow-Up</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Zap className="size-5 text-[oklch(0.65_0.18_265)]" />
              Generated Follow-Up
            </span>
            {result && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
              {result}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Fill in the details to generate a thoughtful follow-up email.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- VO Business Chat Assistant ---
function VOAssistant() {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="size-5 text-[oklch(0.70_0.22_295)]" />
          VO Business Assistant
        </CardTitle>
        <CardDescription>
          Ask anything about marketing your VO business, rate negotiation, outreach strategies, or industry best practices.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">How can I help your VO business today?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  "How do I price my first commercial gig?",
                  "Write a LinkedIn summary for my VO profile",
                  "Tips for cold emailing production companies",
                  "What are typical usage rights terms?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion)
                      sendMessage({ text: suggestion })
                      setInput("")
                    }}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[oklch(0.60_0.22_295)] hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground"
                        : "border border-border bg-card text-card-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{getUIMessageText(message)}</div>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-border bg-card px-4 py-2.5">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <form
          className="flex shrink-0 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!input.trim() || isLoading) return
            sendMessage({ text: input })
            setInput("")
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about rates, outreach, marketing, industry tips..."
            disabled={isLoading}
            className="min-h-[48px] text-base"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="min-h-[48px] bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90"
          >
            <Send className="size-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// --- Main Page ---
export default function AIToolsPage() {
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

      <Tabs defaultValue="outreach" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="outreach" className="gap-1.5">
            <Mail className="size-4" />
            <span className="hidden sm:inline">Outreach</span> Email
          </TabsTrigger>
          <TabsTrigger value="followup" className="gap-1.5">
            <RefreshCw className="size-4" />
            Follow-Up
          </TabsTrigger>
          <TabsTrigger value="pitch" className="gap-1.5">
            <Sparkles className="size-4" />
            <span className="hidden sm:inline">Elevator</span> Pitch
          </TabsTrigger>
          <TabsTrigger value="assistant" className="gap-1.5">
            <MessageSquare className="size-4" />
            Assistant
          </TabsTrigger>
        </TabsList>
        <TabsContent value="outreach" className="mt-6">
          <OutreachEmailWriter />
        </TabsContent>
        <TabsContent value="followup" className="mt-6">
          <FollowUpWriter />
        </TabsContent>
        <TabsContent value="pitch" className="mt-6">
          <PitchGenerator />
        </TabsContent>
        <TabsContent value="assistant" className="mt-6">
          <VOAssistant />
        </TabsContent>
      </Tabs>
    </div>
  )
}
