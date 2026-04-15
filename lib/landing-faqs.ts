/**
 * Single source of truth for marketing-page FAQs (landing accordion + support chat AI).
 * Keep in sync when adding or editing questions.
 */
export type LandingFaqItem = {
  question: string
  answer: string
}

export const LANDING_FAQS: LandingFaqItem[] = [
  {
    question: "What is VOBizSuite?",
    answer:
      "VOBizSuite is an all-in-one business management platform designed specifically for voice actors. It helps you track auditions, manage clients, send invoices, and grow your VO career with AI-powered tools. Think of it as your personal business assistant that handles the admin work so you can focus on what you do best — performing.",
  },
  {
    question: "How is this different from a regular CRM?",
    answer:
      "Unlike generic CRMs, VOBizSuite is built from the ground up for voice actors. Our features are tailored to the unique workflow of VO professionals — tracking audition submissions, managing booking calendars, generating outreach emails with industry-specific AI, and understanding the nuances of voice over business relationships. We speak your language.",
  },
  {
    question: "Can I connect my Gmail or Outlook email?",
    answer:
      "Yes! VOBizSuite integrates with Gmail, Outlook 365, and we also offer SMTP integrations for those who prefer custom email setups. This allows you to send professional outreach emails directly from the platform while keeping everything synced with your main inbox.",
  },
  {
    question: "What AI features are included?",
    answer:
      "Our AI tools include an Outreach Email Writer for crafting personalized cold emails, a Follow-Up Writer for timely client communication, a Pitch Generator for audition submissions, and a VO Business Chat Assistant for answering your career and business questions. The AI is trained to understand voice over industry terminology and best practices.",
  },
  {
    question: "How does the token system work?",
    answer:
      "AI features use tokens — think of them as credits for AI generations. Each subscription tier includes a monthly token allowance that resets each billing cycle. If you need more, you can purchase additional token packs. Unused tokens don't roll over, so use them to grow your business!",
  },
  {
    question: "What's the difference between subscription tiers and tokens?",
    answer:
      "Your plan—Launch, Momentum, or Command—controls which product features you get: limits on contacts, Prospect Finder scans, included AI generations per month, and extras like priority support. See the Pricing section for the full comparison. Tokens are the credits that power AI actions (for example outreach emails, pitches, follow-ups, and chat). Each paid tier includes a monthly token allowance; if you need more in a given month, you can buy add-on token packs from the Tokens page in your dashboard.",
  },
  {
    question: "Can I import my existing client list?",
    answer:
      "Absolutely! VOBizSuite includes a CRM import feature that lets you upload your existing client spreadsheet (CSV format). Our smart field mapping tool helps you match your spreadsheet columns to our contact fields, making migration seamless. You can also export your data anytime.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Security is a top priority. We use industry-standard encryption, secure authentication through Supabase, and row-level security policies to ensure your data is protected. Your client information and business data are never shared with third parties.",
  },
  {
    question: "What's included in the free plan?",
    answer:
      "The free plan gives you access to our core CRM features including client management, audition tracking, booking calendar, and invoicing. AI features require a paid subscription. It's a great way to get organized and see if VOBizSuite is right for you before upgrading.",
  },
  {
    question: "Can I cancel or change my plan anytime?",
    answer:
      "Yes! You can upgrade, downgrade, or cancel your subscription at any time from your account settings. If you cancel, you'll retain access to your paid features until the end of your current billing period. Your data is always yours and can be exported.",
  },
  {
    question: "Can I see all my mail and calendars in one place?",
    answer:
      "Yes. Connect Gmail, Microsoft 365, or SMTP and IMAP in Dashboard → Settings → Email, then use Inbox for a unified view across accounts and Calendar for events from Google, Microsoft, and CalDAV sources such as iCloud. You can add multiple mailboxes so your workflow stays in one workspace.",
  },
  {
    question: "What are Script Tools?",
    answer:
      "Script Tools count words in narration or e-learning scripts: paste text or upload a .txt or .docx file. You get word counts and estimated reading time, and you can carry those numbers into Billing Desk when you build an invoice.",
  },
  {
    question: "How does Prospect Finder work?",
    answer:
      "Enter a company or studio website URL and Prospect Finder uses AI to scan public pages and extract contact names, emails, roles, and phone numbers when available. Save leads into your CRM and follow up with outreach from AI Tools.",
  },
  {
    question: "What is the Rate Guide?",
    answer:
      "The Rate Guide is a built-in reference for voice over rates—use it when you quote projects, negotiate usage, or build invoices in Billing Desk. Markets and usage vary, so treat it as a starting point, not a guarantee.",
  },
  {
    question: "How does Billing Desk handle invoices?",
    answer:
      "Billing Desk lets you create, track, and send invoices tied to bookings and clients. Mark what is paid, pending, or overdue, and email invoices to clients using the email account you connected in Settings.",
  },
  {
    question: "How do I get help?",
    answer:
      "Use the chat icon on any page to ask questions or request a human. You can also use the Contact link in the navigation. For email, calendar, and SMTP setup, open Dashboard → Settings → Email.",
  },
  {
    question: "Can I use VOBizSuite on my phone or tablet?",
    answer:
      "Yes. VOBizSuite runs in your web browser—Chrome, Safari, Firefox, or Edge—on desktop, laptop, tablet, or phone. The dashboard is responsive so you can manage your business on the go. There is no separate app store download; bookmark the site or add it to your home screen for quick access.",
  },
  {
    question: "Do you have an affiliate program?",
    answer:
      "Yes! Every VOBizSuite member gets a unique affiliate code. Share it with other voice actors and earn 20% commission on their subscription for as long as they remain a paying customer. It's a great way to help fellow VOs while earning passive income. Check your dashboard for your affiliate link.",
  },
]

/** Markdown-style block injected into the support chat system prompt. */
export function getLandingFaqsForSupportPrompt(): string {
  const blocks = LANDING_FAQS.map((f, i) => {
    const q = f.question.trim()
    const a = f.answer.trim()
    return `**Q${i + 1}: ${q}**\n${a}`
  })
  return `## Official website FAQ (use these answers when questions match)\n\n${blocks.join("\n\n")}`
}
