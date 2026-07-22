import Link from "next/link"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Payment cancelled | VO Biz Suite",
}

export default function PayCancelPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
          <XCircle className="size-8 text-muted-foreground" />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">
          Payment cancelled
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          No payment was made. You can close this page or use the Pay link in your invoice email if you
          would like to try again.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/">Return to VO Biz Suite</Link>
        </Button>
      </div>
    </div>
  )
}
