import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Payment received | VO Biz Suite",
}

export default function PaySuccessPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-artist-green/20">
          <CheckCircle2 className="size-8 text-artist-green" />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
          Payment received
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Thank you. Your payment was submitted successfully. The voice actor has been notified through
          their invoice records.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/">Return to VO Biz Suite</Link>
        </Button>
      </div>
    </div>
  )
}
