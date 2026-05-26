"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Loader2, Plus, Trash2 } from "lucide-react"

type KnowledgeRow = {
  id: string
  title: string
  content: string
  created_at: string
}

function missingTable(message: string): boolean {
  return message.includes("user_knowledge_base") && message.includes("does not exist")
}

export function KnowledgeBaseSettings() {
  const [entries, setEntries] = useState<KnowledgeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [needsMigration, setNeedsMigration] = useState(false)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setError("")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data, error: fetchError } = await supabase
      .from("user_knowledge_base")
      .select("id, title, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (fetchError) {
      if (missingTable(fetchError.message)) {
        setNeedsMigration(true)
      } else {
        setError(fetchError.message)
      }
      setEntries([])
    } else {
      setEntries((data as KnowledgeRow[]) ?? [])
      setNeedsMigration(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.")
      return
    }
    setSaving(true)
    setError("")
    setMessage("")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("You must be signed in.")
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from("user_knowledge_base").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
    })
    setSaving(false)

    if (insertError) {
      if (missingTable(insertError.message)) setNeedsMigration(true)
      else setError(insertError.message)
      return
    }

    setTitle("")
    setContent("")
    setMessage("Knowledge entry saved.")
    await loadEntries()
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError("")
    const supabase = createClient()
    const { error: deleteError } = await supabase.from("user_knowledge_base").delete().eq("id", id)
    if (deleteError) {
      setError(deleteError.message)
    } else {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <Card id="knowledge-base">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Knowledge base for AI
        </CardTitle>
        <CardDescription>
          Add writing samples, key facts, offer details, and brand context. AI Tools will use this
          to better match your voice and messaging.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsMigration && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Run <code className="rounded bg-muted px-1">scripts/ensure-media-repository.sql</code>{" "}
            in Supabase SQL Editor to enable knowledge base storage.
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="kb-title">Entry title</Label>
          <Input
            id="kb-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. About my VO brand and ideal clients"
            disabled={needsMigration}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="kb-content">Content</Label>
          <Textarea
            id="kb-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Paste anything the AI should know about your style, experience, offers, portfolio highlights, and email tone."
            disabled={needsMigration}
          />
        </div>
        <Button onClick={handleAdd} disabled={saving || needsMigration}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add knowledge entry
            </>
          )}
        </Button>

        {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading knowledge entries...
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No entries yet. Add at least one so AI can mirror your writing style.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-border/60 p-3">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <p className="font-medium">{entry.title}</p>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                  >
                    {deletingId === entry.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                  {entry.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
