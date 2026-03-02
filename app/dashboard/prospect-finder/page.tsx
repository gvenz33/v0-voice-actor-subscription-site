"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { mutate } from "swr"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Globe,
  Mail,
  Phone,
  User,
  Building2,
  Loader2,
  ExternalLink,
  UserPlus,
  Sparkles,
  MapPin,
  ScanSearch,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react"

interface SearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
  location?: string
  category?: string
}

interface ExtractedContact {
  name: string | null
  role: string | null
  email: string | null
  phone: string | null
  department: string | null
}

interface CompanyInfo {
  description: string
  specializations: string[]
  address: string | null
  mainPhone: string | null
  socialLinks: string[]
}

interface ScanResult {
  contacts: ExtractedContact[]
  companyInfo: CompanyInfo
  sourceUrl: string
  companyName: string
}

export default function ProspectFinder() {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState("")

  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanningUrl, setScanningUrl] = useState("")
  const [scanError, setScanError] = useState("")
  const [detailOpen, setDetailOpen] = useState(false)

  const [savedContacts, setSavedContacts] = useState<Set<string>>(new Set())
  const [savingContact, setSavingContact] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setSearchError("")
    setResults([])

    try {
      const res = await fetch("/api/prospects/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.results || [])
      if (data.results?.length === 0) {
        setSearchError("No results found. Try different keywords.")
      }
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Search failed. Please try again."
      )
    } finally {
      setIsSearching(false)
    }
  }

  const handleScan = async (url: string, title: string) => {
    setIsScanning(true)
    setScanningUrl(url)
    setScanError("")
    setScanResult(null)
    setDetailOpen(true)

    try {
      const res = await fetch("/api/prospects/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, companyName: title }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScanResult(data)
    } catch (err) {
      setScanError(
        err instanceof Error
          ? err.message
          : "Could not scan this website."
      )
    } finally {
      setIsScanning(false)
    }
  }

  const handleSaveContact = async (
    contact: ExtractedContact,
    companyName: string,
    website: string
  ) => {
    const contactKey = contact.email || contact.name || ""
    setSavingContact(contactKey)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from("contacts").insert({
        user_id: user.id,
        company_name: companyName,
        contact_name: contact.name,
        email: contact.email,
        phone: contact.phone,
        website: website,
        category: "production_company",
        status: "prospect",
        notes: contact.role
          ? `Role: ${contact.role}${contact.department ? ` | Dept: ${contact.department}` : ""}\nFound via Prospect Finder`
          : "Found via Prospect Finder",
      })

      setSavedContacts((prev) => new Set(prev).add(contactKey))
      mutate("contacts")
      mutate("dashboard-stats")
    } catch {
      // silently handle
    } finally {
      setSavingContact(null)
    }
  }

  const handleSaveCompany = async (companyName: string, website: string, info: CompanyInfo) => {
    setSavingContact("company-" + companyName)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Save with first contact email if available
      const firstEmail = scanResult?.contacts?.find((c) => c.email)?.email || null

      await supabase.from("contacts").insert({
        user_id: user.id,
        company_name: companyName,
        contact_name: null,
        email: firstEmail,
        phone: info.mainPhone,
        website: website,
        category: "production_company",
        status: "prospect",
        notes: `${info.description}\nSpecializations: ${info.specializations.join(", ")}\nFound via Prospect Finder`,
      })

      setSavedContacts((prev) => new Set(prev).add("company-" + companyName))
      mutate("contacts")
      mutate("dashboard-stats")
    } catch {
      // silently handle
    } finally {
      setSavingContact(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
          Prospect Finder
        </h2>
        <p className="text-sm text-muted-foreground">
          Search for production companies, studios, and agencies. AI will scan
          their websites to extract contact information.
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder='Try "animation studios Los Angeles" or "e-learning production companies"...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-[48px] pl-10 text-base"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSearching || !searchQuery.trim()}
              className="min-h-[48px] gap-2 bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90"
            >
              {isSearching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ScanSearch className="size-4" />
              )}
              {isSearching ? "Searching..." : "Find Companies"}
            </Button>
          </form>

          {/* Quick search suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Try:</span>
            {[
              "commercial voice over production companies Los Angeles",
              "animation studios hiring voice actors",
              "e-learning narration production companies",
              "podcast production agencies New York",
              "audiobook publishers accepting narrator submissions",
              "video game voice acting studios",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setSearchQuery(suggestion)
                }}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Error */}
      {searchError && (
        <Card className="border-destructive/20">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm text-destructive">{searchError}</p>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {results.length} results found
            </h3>
          </div>

          <div className="grid gap-3">
            {results.map((result, i) => (
              <Card
                key={i}
                className="group transition-colors hover:border-[oklch(0.55_0.22_295_/_0.3)]"
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                      {result.title}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Globe className="size-3 shrink-0 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {result.displayLink}
                        </span>
                      </div>
                      {result.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 shrink-0 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {result.location}
                          </span>
                        </div>
                      )}
                      {result.category && (
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {result.category.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      {result.snippet}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[40px] gap-1.5"
                      onClick={() => window.open(result.link, "_blank")}
                    >
                      <ExternalLink className="size-3.5" />
                      Visit Site
                    </Button>
                    <Button
                      size="sm"
                      className="min-h-[40px] gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90"
                      disabled={isScanning && scanningUrl === result.link}
                      onClick={() => handleScan(result.link, result.title)}
                    >
                      {isScanning && scanningUrl === result.link ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      Scan for Contacts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isSearching && results.length === 0 && !searchError && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-[oklch(0.55_0.22_295_/_0.1)] mb-4">
            <ScanSearch className="size-8 text-[oklch(0.60_0.22_295)]" />
          </div>
          <CardTitle className="text-lg mb-2">
            Find Your Next Client
          </CardTitle>
          <CardDescription className="max-w-md mb-1">
            Search for production companies, studios, ad agencies, and more.
            Our AI will scan their websites and extract contact emails,
            names, and roles so you can start pitching.
          </CardDescription>
          <div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Search className="size-3.5" />
              Search
            </div>
            <ArrowRight className="size-3 text-muted-foreground/50" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              AI Scan
            </div>
            <ArrowRight className="size-3 text-muted-foreground/50" />
            <div className="flex items-center gap-1.5">
              <UserPlus className="size-3.5" />
              Save & Pitch
            </div>
          </div>
        </Card>
      )}

      {/* Scan Result Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              {scanResult?.companyName || "Scanning..."}
            </DialogTitle>
            <DialogDescription>
              {isScanning
                ? "AI is analyzing the website for contact information..."
                : scanResult?.companyInfo?.description || "Contact extraction results"}
            </DialogDescription>
          </DialogHeader>

          {isScanning && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="relative">
                <div className="size-16 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 size-16 animate-spin rounded-full border-4 border-transparent border-t-[oklch(0.60_0.22_295)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Scanning website...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI is reading pages and extracting contact information
                </p>
              </div>
            </div>
          )}

          {scanError && (
            <Card className="border-destructive/20">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertCircle className="size-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{scanError}</p>
              </CardContent>
            </Card>
          )}

          {scanResult && !isScanning && (
            <Tabs defaultValue="contacts" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="contacts">
                  Contacts ({scanResult.contacts?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="company">Company Info</TabsTrigger>
              </TabsList>

              <TabsContent value="contacts" className="mt-4 flex flex-col gap-3">
                {scanResult.contacts?.length > 0 ? (
                  <>
                    {/* Save all as company button */}
                    <Button
                      variant="outline"
                      className="w-full min-h-[44px] gap-2"
                      disabled={
                        savedContacts.has("company-" + scanResult.companyName) ||
                        savingContact === "company-" + scanResult.companyName
                      }
                      onClick={() =>
                        handleSaveCompany(
                          scanResult.companyName,
                          scanResult.sourceUrl,
                          scanResult.companyInfo
                        )
                      }
                    >
                      {savedContacts.has(
                        "company-" + scanResult.companyName
                      ) ? (
                        <>
                          <CheckCircle2 className="size-4 text-violet-400" />
                          Saved to Client Hub
                        </>
                      ) : savingContact ===
                        "company-" + scanResult.companyName ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Building2 className="size-4" />
                          Save Company to Client Hub
                        </>
                      )}
                    </Button>

                    {scanResult.contacts.map((contact, i) => {
                      const contactKey =
                        contact.email || contact.name || String(i)
                      return (
                        <Card key={i}>
                          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col gap-1.5 min-w-0">
                              {contact.name && (
                                <div className="flex items-center gap-2">
                                  <User className="size-3.5 shrink-0 text-muted-foreground" />
                                  <span className="text-sm font-medium text-foreground">
                                    {contact.name}
                                  </span>
                                  {contact.role && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {contact.role}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {contact.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                                  <span className="text-sm text-foreground truncate">
                                    {contact.email}
                                  </span>
                                </div>
                              )}
                              {contact.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    {contact.phone}
                                  </span>
                                </div>
                              )}
                              {contact.department && (
                                <Badge
                                  variant="outline"
                                  className="w-fit text-[10px]"
                                >
                                  {contact.department}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-[40px] shrink-0 gap-1.5"
                                disabled={
                                  savedContacts.has(contactKey) ||
                                  savingContact === contactKey
                                }
                                onClick={() =>
                                  handleSaveContact(
                                    contact,
                                    scanResult.companyName,
                                    scanResult.sourceUrl
                                  )
                                }
                              >
                                {savedContacts.has(contactKey) ? (
                                  <>
                                    <CheckCircle2 className="size-3.5 text-violet-400" />
                                    Saved
                                  </>
                                ) : savingContact === contactKey ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <UserPlus className="size-3.5" />
                                    Save to CRM
                                  </>
                                )}
                              </Button>
                              {contact.email && (
                                <Button
                                  size="sm"
                                  className="min-h-[40px] shrink-0 gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.22_295)] to-[oklch(0.55_0.18_265)] text-foreground hover:opacity-90"
                                  onClick={() => {
                                    const params = new URLSearchParams()
                                    params.set("company", scanResult.companyName || "")
                                    params.set("email", contact.email || "")
                                    if (contact.name) params.set("name", contact.name)
                                    if (contact.role) params.set("role", contact.role)
                                    setDetailOpen(false)
                                    window.location.href = `/dashboard/ai-tools?${params.toString()}`
                                  }}
                                >
                                  <Send className="size-3.5" />
                                  Email Now
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </>
                ) : (
                  <Card className="flex flex-col items-center p-8 text-center">
                    <Mail className="size-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No contact information found on this page. Try visiting the
                      site directly and checking their Contact or About page.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1.5"
                      onClick={() =>
                        window.open(scanResult.sourceUrl, "_blank")
                      }
                    >
                      <ExternalLink className="size-3.5" />
                      Visit Website
                    </Button>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="company" className="mt-4 flex flex-col gap-4">
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">
                        About
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {scanResult.companyInfo?.description ||
                          "No description available"}
                      </p>
                    </div>

                    {scanResult.companyInfo?.specializations?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground">
                          Specializations
                        </h4>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {scanResult.companyInfo.specializations.map(
                            (spec, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {scanResult.companyInfo?.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {scanResult.companyInfo.address}
                        </span>
                      </div>
                    )}

                    {scanResult.companyInfo?.mainPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {scanResult.companyInfo.mainPhone}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() =>
                          window.open(scanResult.sourceUrl, "_blank")
                        }
                      >
                        <ExternalLink className="size-3.5" />
                        Visit Website
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
