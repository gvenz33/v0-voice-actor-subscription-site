import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "What is VOBizSuite?",
    answer: "VOBizSuite is an all-in-one business management platform designed specifically for voice actors. It helps you track auditions, manage clients, send invoices, and grow your VO career with AI-powered tools. Think of it as your personal business assistant that handles the admin work so you can focus on what you do best — performing."
  },
  {
    question: "How is this different from a regular CRM?",
    answer: "Unlike generic CRMs, VOBizSuite is built from the ground up for voice actors. Our features are tailored to the unique workflow of VO professionals — tracking audition submissions, managing booking calendars, generating outreach emails with industry-specific AI, and understanding the nuances of voice over business relationships. We speak your language."
  },
  {
    question: "Can I connect my Gmail or Outlook email?",
    answer: "Yes! VOBizSuite integrates with Gmail, Outlook 365, and we also offer SMTP integrations for those who prefer custom email setups. This allows you to send professional outreach emails directly from the platform while keeping everything synced with your main inbox."
  },
  {
    question: "What AI features are included?",
    answer: "Our AI tools include an Outreach Email Writer for crafting personalized cold emails, a Follow-Up Writer for timely client communication, a Pitch Generator for audition submissions, and a VO Business Chat Assistant for answering your career and business questions. The AI is trained to understand voice over industry terminology and best practices."
  },
  {
    question: "How does the token system work?",
    answer: "AI features use tokens — think of them as credits for AI generations. Each subscription tier includes a monthly token allowance that resets each billing cycle. If you need more, you can purchase additional token packs. Unused tokens don't roll over, so use them to grow your business!"
  },
  {
    question: "Can I import my existing client list?",
    answer: "Absolutely! VOBizSuite includes a CRM import feature that lets you upload your existing client spreadsheet (CSV format). Our smart field mapping tool helps you match your spreadsheet columns to our contact fields, making migration seamless. You can also export your data anytime."
  },
  {
    question: "Is my data secure?",
    answer: "Security is a top priority. We use industry-standard encryption, secure authentication through Supabase, and row-level security policies to ensure your data is protected. Your client information and business data are never shared with third parties."
  },
  {
    question: "What's included in the free plan?",
    answer: "The free plan gives you access to our core CRM features including client management, audition tracking, booking calendar, and invoicing. AI features require a paid subscription. It's a great way to get organized and see if VOBizSuite is right for you before upgrading."
  },
  {
    question: "Can I cancel or change my plan anytime?",
    answer: "Yes! You can upgrade, downgrade, or cancel your subscription at any time from your account settings. If you cancel, you'll retain access to your paid features until the end of your current billing period. Your data is always yours and can be exported."
  },
  {
    question: "Do you have an affiliate program?",
    answer: "Yes! Every VOBizSuite member gets a unique affiliate code. Share it with other voice actors and earn 20% commission on their subscription for as long as they remain a paying customer. It's a great way to help fellow VOs while earning passive income. Check your dashboard for your affiliate link."
  },
]

export function FAQ() {
  return (
    <section className="section-faq px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-foreground/70">
            Everything you need to know about VOBizSuite
          </p>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
              <AccordionTrigger className="text-left text-foreground hover:text-foreground/80 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-foreground/70 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
