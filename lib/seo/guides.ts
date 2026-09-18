export type GuidePage = {
  slug: string
  title: string
  description: string
  keywords: string[]
  summary: string
  sections: Array<{ heading: string; body: string[] }>
}

export const GUIDE_PAGES: GuidePage[] = [
  {
    slug: "voice-actor-crm",
    title: "What Is a Voice Actor CRM?",
    description:
      "Learn what a voice actor CRM is, how it differs from generic tools, and why audition tracking, clients, and invoicing belong in one VO business system.",
    keywords: [
      "voice actor CRM",
      "VO CRM",
      "voiceover business software",
      "voice talent management",
    ],
    summary:
      "A voice actor CRM is software built for how VO work actually runs: submissions, casting contacts, bookings, follow-ups, and invoices — not a sales pipeline meant for SaaS demos.",
    sections: [
      {
        heading: "Why generic CRMs fall short for voice actors",
        body: [
          "Most CRMs assume you sell one product to a sales pipeline. Voice actors juggle casting directors, agents, production houses, and direct clients across dozens of open opportunities at once.",
          "A VO-specific CRM tracks auditions and outcomes, stores client context (genre, rates, preferences), and connects outreach to bookings and invoices so nothing lives only in email threads or spreadsheets.",
        ],
      },
      {
        heading: "Core pieces of a voiceover business system",
        body: [
          "Submission tracking: where you auditioned, when, and what happened next.",
          "Client hub: contacts, notes, and relationship history in one place.",
          "Follow-ups and touchpoints: reminders so warm leads do not go cold.",
          "Bookings and invoices: turn won work into scheduled sessions and paid invoices without retyping details.",
        ],
      },
      {
        heading: "How VO Biz Suite fits",
        body: [
          "VO Biz Suite combines Client Hub, submission tracking, bookings, invoicing, and AI outreach tools in one platform built for voice actors — union or non-union, agent-represented or independent.",
          "If you are comparing tools, look for workflow fit first: audition → follow-up → booking → invoice should feel native, not bolted on.",
        ],
      },
    ],
  },
  {
    slug: "audition-tracking-system",
    title: "How to Track Voiceover Auditions (Without Spreadsheet Chaos)",
    description:
      "A practical system for tracking VO auditions, follow-ups, and outcomes so you know what is open, what booked, and what needs a nudge.",
    keywords: [
      "voiceover audition tracker",
      "VO submission tracking",
      "audition pipeline",
      "voice actor organization",
    ],
    summary:
      "An audition tracking system records every submission, status, and next action so you can follow up with intention instead of guessing from memory or buried emails.",
    sections: [
      {
        heading: "What to log for every audition",
        body: [
          "Project or title, casting contact, date submitted, source (agent, direct, casting site), and materials used (demo cut, slate notes).",
          "Status: submitted, shortlisted, booked, passed, or no response. Add a next follow-up date when silence is normal but actionable.",
        ],
      },
      {
        heading: "Turn statuses into a pipeline",
        body: [
          "Treat auditions like a pipeline, not a list. Group by stage so you can see where opportunities stall — usually after submission with no follow-up plan.",
          "Review weekly: what needs a polite check-in, what can be closed, and what booked work still needs a contract or invoice.",
        ],
      },
      {
        heading: "Where VO Biz Suite helps",
        body: [
          "VO Biz Suite’s submission tracker and action items keep auditions, follow-ups, and bookings connected so your pipeline stays visible without juggling sheets and calendars.",
          "Pair tracking with AI follow-up drafts when you want faster outreach that still sounds like you.",
        ],
      },
    ],
  },
  {
    slug: "voiceover-invoicing",
    title: "Voiceover Invoicing Basics for Freelance Talent",
    description:
      "How voice actors can invoice cleanly: what to include, when to send, and how to keep bookings and payments tied to the same client record.",
    keywords: [
      "voiceover invoicing",
      "freelance VO invoices",
      "voice actor billing",
      "VO payment tracking",
    ],
    summary:
      "Professional VO invoicing means clear line items, usage or buyout terms when relevant, payment terms, and a trail that ties the invoice back to the booking and client.",
    sections: [
      {
        heading: "What belongs on a VO invoice",
        body: [
          "Your business name and contact details, client name, invoice number, date, payment terms, and a clear description of the work (project, role, session date).",
          "When usage or buyouts apply, note the agreed scope so there is less ambiguity later. Include how to pay and any late-fee policy you actually enforce.",
        ],
      },
      {
        heading: "Timing and follow-through",
        body: [
          "Send invoices as soon as deliverables are approved when possible. Log sent and paid status so you are not chasing payments from memory.",
          "Keep invoices linked to the same client record as the booking — that history helps with rates, repeats, and tax-season exports.",
        ],
      },
      {
        heading: "Invoicing inside VO Biz Suite",
        body: [
          "VO Biz Suite includes invoicing tied to your client and booking workflow, plus CSV-friendly billing exports for bookkeeping tools like QuickBooks Online and Xero.",
          "Clean invoices plus consistent records make you easier to hire again — and easier to trust when budgets and usage get reviewed.",
        ],
      },
    ],
  },
]

export function getGuideBySlug(slug: string): GuidePage | undefined {
  return GUIDE_PAGES.find((g) => g.slug === slug)
}
