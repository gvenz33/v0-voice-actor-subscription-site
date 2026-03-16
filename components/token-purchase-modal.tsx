'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TOKEN_PACKAGES, formatPrice, pricePerToken, getTokenEstimate } from '@/lib/token-products'
import { Coins, Zap, Mail, Search, MessageSquare, Check } from 'lucide-react'
import dynamic from 'next/dynamic'

const TokenCheckout = dynamic(() => import('./token-checkout'), { ssr: false })

interface TokenPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  remainingTokens?: number
}

export function TokenPurchaseModal({ open, onOpenChange, onSuccess, remainingTokens = 0 }: TokenPurchaseModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId)
    setShowCheckout(true)
  }

  const handleComplete = () => {
    setShowCheckout(false)
    setSelectedPackage(null)
    onSuccess?.()
    onOpenChange(false)
  }

  const handleBack = () => {
    setShowCheckout(false)
    setSelectedPackage(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5 text-[oklch(0.65_0.18_265)]" />
            {showCheckout ? 'Complete Purchase' : 'Get More Tokens'}
          </DialogTitle>
          <DialogDescription>
            {showCheckout 
              ? 'Enter your payment details to complete the purchase.'
              : remainingTokens <= 0 
                ? "You've run out of tokens. Purchase more to continue using AI features."
                : 'Purchase additional tokens to use AI-powered features.'
            }
          </DialogDescription>
        </DialogHeader>

        {showCheckout && selectedPackage ? (
          <div className="flex flex-col gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="self-start">
              Back to packages
            </Button>
            <TokenCheckout packageId={selectedPackage} onComplete={handleComplete} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Token Packages */}
            <div className="grid gap-4 sm:grid-cols-3">
              {TOKEN_PACKAGES.map((pkg) => {
                const estimates = getTokenEstimate(pkg.tokens)
                return (
                  <div
                    key={pkg.id}
                    className={`relative flex flex-col gap-3 rounded-lg border p-4 transition-all hover:border-[oklch(0.65_0.18_265)] ${
                      pkg.popular ? 'border-[oklch(0.65_0.18_265)] bg-[oklch(0.65_0.18_265)]/5' : 'border-border'
                    }`}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[oklch(0.65_0.18_265)]">
                        Best Value
                      </Badge>
                    )}
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{formatPrice(pkg.priceInCents)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{pricePerToken(pkg)}/token</p>
                    </div>
                    
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                      <Coins className="size-4 text-[oklch(0.65_0.18_265)]" />
                      <span className="font-semibold">{pkg.tokens.toLocaleString()} tokens</span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3" />
                        <span>~{estimates.emails} emails</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Search className="size-3" />
                        <span>~{estimates.research} prospect searches</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="size-3" />
                        <span>~{estimates.chatMessages} chat messages</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSelectPackage(pkg.id)}
                      className={pkg.popular 
                        ? 'bg-[oklch(0.65_0.18_265)] hover:bg-[oklch(0.55_0.18_265)]' 
                        : ''
                      }
                      variant={pkg.popular ? 'default' : 'outline'}
                    >
                      Select
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Token Cost Reference */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="mb-2 text-sm font-medium">Token Costs</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="flex items-center gap-1.5">
                  <Zap className="size-3" />
                  <span>Email: 5 tokens</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Search className="size-3" />
                  <span>Research: 15 tokens</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="size-3" />
                  <span>Chat: 2 tokens</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
