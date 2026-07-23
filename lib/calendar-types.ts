export type UnifiedCalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  provider: "google" | "microsoft" | "caldav" | "manual"
  sourceLabel: string
  description?: string | null
  location?: string | null
  editable?: boolean
}
