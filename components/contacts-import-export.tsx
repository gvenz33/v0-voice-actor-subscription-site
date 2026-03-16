"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { mutate } from "swr"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, Download, FileSpreadsheet, X, Check, AlertCircle, ArrowRight } from "lucide-react"

// Fields that can be mapped from imported spreadsheet
const CONTACT_FIELDS = [
  { key: "company_name", label: "Company Name", required: true },
  { key: "contact_name", label: "Contact Person", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "website", label: "Website", required: false },
  { key: "category", label: "Category", required: false },
  { key: "status", label: "Status", required: false },
  { key: "notes", label: "Notes", required: false },
]

const VALID_CATEGORIES = ["production_company", "ad_agency", "studio", "direct_client", "e_learning", "podcast", "other"]
const VALID_STATUSES = ["prospect", "pitched", "active", "past_client", "cold"]

interface ImportExportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "import" | "export"
  contacts?: Array<{
    id: string
    company_name: string
    contact_name: string | null
    email: string | null
    phone: string | null
    website: string | null
    category: string | null
    status: string
    notes: string | null
  }>
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete"

export function ContactsImportExport({ open, onOpenChange, mode, contacts = [] }: ImportExportProps) {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: [],
  })

  const resetState = () => {
    setStep("upload")
    setFile(null)
    setHeaders([])
    setRows([])
    setFieldMapping({})
    setImportProgress(0)
    setImportResults({ success: 0, failed: 0, errors: [] })
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length === 0) return { headers: [], rows: [] }
    
    const parseRow = (line: string): string[] => {
      const result: string[] = []
      let current = ""
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }
    
    const headers = parseRow(lines[0])
    const rows = lines.slice(1).map(parseRow)
    
    return { headers, rows }
  }

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)

    const text = await uploadedFile.text()
    const { headers: parsedHeaders, rows: parsedRows } = parseCSV(text)
    
    setHeaders(parsedHeaders)
    setRows(parsedRows)
    
    // Auto-map fields based on header names
    const autoMapping: Record<string, string> = {}
    parsedHeaders.forEach((header) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "")
      
      CONTACT_FIELDS.forEach((field) => {
        const normalizedField = field.label.toLowerCase().replace(/[^a-z0-9]/g, "")
        const normalizedKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, "")
        
        if (normalizedHeader === normalizedField || normalizedHeader === normalizedKey) {
          autoMapping[field.key] = header
        }
        // Common variations
        if (field.key === "company_name" && (normalizedHeader.includes("company") || normalizedHeader.includes("business") || normalizedHeader.includes("organization"))) {
          autoMapping[field.key] = header
        }
        if (field.key === "contact_name" && (normalizedHeader.includes("contact") || normalizedHeader.includes("name") || normalizedHeader.includes("person"))) {
          if (!normalizedHeader.includes("company")) {
            autoMapping[field.key] = header
          }
        }
        if (field.key === "email" && normalizedHeader.includes("email")) {
          autoMapping[field.key] = header
        }
        if (field.key === "phone" && (normalizedHeader.includes("phone") || normalizedHeader.includes("tel"))) {
          autoMapping[field.key] = header
        }
        if (field.key === "website" && (normalizedHeader.includes("website") || normalizedHeader.includes("url") || normalizedHeader.includes("site"))) {
          autoMapping[field.key] = header
        }
      })
    })
    
    setFieldMapping(autoMapping)
    setStep("mapping")
  }, [])

  const handleImport = async () => {
    setStep("importing")
    setImportProgress(0)
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const results = { success: 0, failed: 0, errors: [] as string[] }
    const totalRows = rows.length

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      try {
        const contact: Record<string, string | null> = {
          user_id: user.id,
        }

        // Map fields
        CONTACT_FIELDS.forEach((field) => {
          const sourceHeader = fieldMapping[field.key]
          if (sourceHeader) {
            const headerIndex = headers.indexOf(sourceHeader)
            if (headerIndex !== -1) {
              let value = row[headerIndex]?.trim() || null
              
              // Validate category
              if (field.key === "category" && value) {
                value = value.toLowerCase().replace(/[^a-z]/g, "_")
                if (!VALID_CATEGORIES.includes(value)) {
                  value = "other"
                }
              }
              
              // Validate status
              if (field.key === "status" && value) {
                value = value.toLowerCase().replace(/[^a-z]/g, "_")
                if (!VALID_STATUSES.includes(value)) {
                  value = "prospect"
                }
              }
              
              contact[field.key] = value
            }
          }
        })

        // Set defaults
        if (!contact.status) contact.status = "prospect"
        
        // Validate required field
        if (!contact.company_name) {
          results.failed++
          results.errors.push(`Row ${i + 2}: Missing company name`)
          continue
        }

        const { error } = await supabase.from("contacts").insert(contact)
        
        if (error) {
          results.failed++
          results.errors.push(`Row ${i + 2}: ${error.message}`)
        } else {
          results.success++
        }
      } catch (err) {
        results.failed++
        results.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }

      setImportProgress(Math.round(((i + 1) / totalRows) * 100))
    }

    setImportResults(results)
    setStep("complete")
    mutate("contacts")
    mutate("dashboard-stats")
  }

  const handleExport = () => {
    if (contacts.length === 0) return

    const csvHeaders = CONTACT_FIELDS.map(f => f.label)
    const csvRows = contacts.map(contact => [
      contact.company_name || "",
      contact.contact_name || "",
      contact.email || "",
      contact.phone || "",
      contact.website || "",
      contact.category || "",
      contact.status || "",
      contact.notes || "",
    ])

    const escapeCell = (cell: string) => {
      if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
        return `"${cell.replace(/"/g, '""')}"`
      }
      return cell
    }

    const csvContent = [
      csvHeaders.map(escapeCell).join(","),
      ...csvRows.map(row => row.map(escapeCell).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `contacts-export-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    handleClose()
  }

  const previewData = rows.slice(0, 5).map((row) => {
    const mapped: Record<string, string> = {}
    CONTACT_FIELDS.forEach((field) => {
      const sourceHeader = fieldMapping[field.key]
      if (sourceHeader) {
        const headerIndex = headers.indexOf(sourceHeader)
        if (headerIndex !== -1) {
          mapped[field.key] = row[headerIndex] || ""
        }
      }
    })
    return mapped
  })

  if (mode === "export") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="size-5" />
              Export Contacts
            </DialogTitle>
            <DialogDescription>
              Download your contacts as a CSV file.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">contacts-export.csv</p>
                  <p className="text-sm text-muted-foreground">{contacts.length} contacts</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1 min-h-[44px]">
                Cancel
              </Button>
              <Button onClick={handleExport} className="flex-1 min-h-[44px]" disabled={contacts.length === 0}>
                <Download className="size-4 mr-1.5" />
                Download CSV
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Import Contacts
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file with your contacts."}
            {step === "mapping" && "Match your spreadsheet columns to contact fields."}
            {step === "preview" && "Review the data before importing."}
            {step === "importing" && "Importing your contacts..."}
            {step === "complete" && "Import complete!"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col gap-4 py-4">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <FileSpreadsheet className="size-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">CSV files supported</p>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-sm font-medium mb-2">Expected format:</p>
              <p className="text-xs text-muted-foreground">
                Your CSV should have headers like: Company Name, Contact Person, Email, Phone, Website, Category, Status, Notes
              </p>
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file?.name}</span>
              </div>
              <Badge variant="secondary">{rows.length} rows</Badge>
            </div>
            
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Map your columns</Label>
              {CONTACT_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm min-w-[120px]">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                    </span>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                  <Select
                    value={fieldMapping[field.key] || ""}
                    onValueChange={(value) => setFieldMapping(prev => ({ ...prev, [field.key]: value }))}
                  >
                    <SelectTrigger className="flex-1 min-h-[44px]">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Skip --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={resetState} className="flex-1 min-h-[44px]">
                Back
              </Button>
              <Button 
                onClick={() => setStep("preview")} 
                className="flex-1 min-h-[44px]"
                disabled={!fieldMapping.company_name}
              >
                Preview Import
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Preview of first {Math.min(5, rows.length)} rows ({rows.length} total)
            </p>
            
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {CONTACT_FIELDS.filter(f => fieldMapping[f.key]).map((field) => (
                      <TableHead key={field.key} className="text-xs whitespace-nowrap">
                        {field.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, i) => (
                    <TableRow key={i}>
                      {CONTACT_FIELDS.filter(f => fieldMapping[f.key]).map((field) => (
                        <TableCell key={field.key} className="text-xs max-w-[150px] truncate">
                          {row[field.key] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep("mapping")} className="flex-1 min-h-[44px]">
                Back
              </Button>
              <Button onClick={handleImport} className="flex-1 min-h-[44px]">
                Import {rows.length} Contacts
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col gap-4 py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="size-6 text-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-medium">Importing contacts...</p>
                <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
              </div>
              <Progress value={importProgress} className="w-full h-2" />
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="size-6 text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-medium">Import Complete</p>
                <p className="text-sm text-muted-foreground">
                  {importResults.success} contacts imported successfully
                </p>
              </div>
            </div>

            {importResults.failed > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="size-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    {importResults.failed} rows failed
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {importResults.errors.slice(0, 10).map((error, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{error}</p>
                  ))}
                  {importResults.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      ... and {importResults.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button onClick={handleClose} className="min-h-[44px]">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
