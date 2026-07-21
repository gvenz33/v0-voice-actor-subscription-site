'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

const STORAGE_KEY = 'vob_beta_popup_dismissed'

export function BetaTesterPopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      const timer = window.setTimeout(() => setOpen(true), 1200)
      return () => window.clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="max-w-md border-accent/30 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-gradient">
              <Sparkles className="size-5 text-foreground" />
            </div>
            <Badge variant="secondary" className="bg-accent/15 text-accent-foreground">
              Limited Beta
            </Badge>
          </div>
          <DialogTitle className="pt-2 text-2xl">Now Accepting Beta Testers</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-muted-foreground">
            Join the VO Biz Suite beta and help shape the platform for voice actors. Beta testers
            get early access and exclusive launch pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-accent/25 bg-accent/10 p-4">
          <p className="text-sm font-medium text-foreground">
            Use promo code <span className="font-mono text-accent">BETA</span> for{' '}
            <span className="font-semibold">50% off</span> Pro and Enterprise annual plans.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pro = Momentum · Enterprise = Command · Annual billing only for beta pricing.
          </p>
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Provide product feedback during your subscription</li>
          <li>• Maintain an active annual plan for 12 months</li>
          <li>• Yearly subscription required for beta promo codes</li>
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            asChild
            className="w-full bg-brand-gradient text-foreground hover:opacity-90"
            onClick={dismiss}
          >
            <Link href="/?promo=BETA&interval=year#pricing">View Beta Pricing</Link>
          </Button>
          <Button variant="ghost" className="w-full" onClick={dismiss}>
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
