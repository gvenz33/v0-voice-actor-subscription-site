export type UnifiedCalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  provider: "google" | "microsoft" | "caldav"
  sourceLabel: string
}
