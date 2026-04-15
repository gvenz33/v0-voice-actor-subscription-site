import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { LANDING_FAQS } from "@/lib/landing-faqs"

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
          {LANDING_FAQS.map((faq, index) => (
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
