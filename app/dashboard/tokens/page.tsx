'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TOKEN_PACKAGES, TOKEN_COSTS, formatPrice, pricePerToken, getTokenEstimate } from '@/lib/token-products'
import { TokenPurchaseModal } from '@/components/token-purchase-modal'
import { 
  Coins, 
  Zap, 
  Mail, 
  Search, 
  MessageSquare, 
  TrendingUp,
  CreditCard,
  Loader2,
  Send,
} from 'lucide-react'

interface UsageData {
  tier: string
  tierLabel: string
  tokensUsed: number
  purchasedTokens: number
  monthlyTokens: number
  totalAvailable: number
  remainingTokens: number
  isUnlimited: boolean
}

export default function TokensPage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)

  const loadUsage = async () => {
    try {
      const res = await fetch('/api/ai/usage')
      const data = await res.json()
      setUsage(data)
    } catch (error) {
      console.error('Failed to load usage:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsage()
  }, [])

  const handlePurchaseSuccess = () => {
    loadUsage()
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const usagePercent = usage && !usage.isUnlimited && usage.totalAvailable > 0
    ? Math.min(100, (usage.tokensUsed / usage.totalAvailable) * 100)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Tokens</h1>
        <p className="text-muted-foreground">Manage your token balance and purchase more tokens.</p>
      </div>

      {/* Current Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="size-5 text-[oklch(0.65_0.18_265)]" />
            Token Balance
          </CardTitle>
          <CardDescription>
            Your current token balance and usage this month.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {usage?.isUnlimited ? 'Unlimited' : usage?.remainingTokens?.toLocaleString() || 0}
                </span>
                {!usage?.isUnlimited && (
                  <span className="text-muted-foreground">tokens remaining</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Badge variant="outline">{usage?.tierLabel || 'Free'} Plan</Badge>
                {usage?.purchasedTokens ? (
                  <span>+{usage.purchasedTokens} purchased tokens</span>
                ) : null}
              </div>
            </div>
            <Button 
              onClick={() => setPurchaseModalOpen(true)}
              className="gap-2 bg-[oklch(0.65_0.18_265)] hover:bg-[oklch(0.55_0.18_265)]"
            >
              <Coins className="size-4" />
              Buy More Tokens
            </Button>
          </div>

          {!usage?.isUnlimited && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span>Used this month</span>
                <span>{usage?.tokensUsed || 0} / {usage?.totalAvailable || 0}</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Token Packages
          </CardTitle>
          <CardDescription>
            Purchase tokens to use AI-powered features.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      <span>~{estimates.research} searches</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="size-3" />
                      <span>~{estimates.chatMessages} chats</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setPurchaseModalOpen(true)}
                    className={pkg.popular 
                      ? 'bg-[oklch(0.65_0.18_265)] hover:bg-[oklch(0.55_0.18_265)]' 
                      : ''
                    }
                    variant={pkg.popular ? 'default' : 'outline'}
                  >
                    Purchase
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Token Costs Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Token Costs
          </CardTitle>
          <CardDescription>
            How many tokens each action costs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[oklch(0.65_0.18_265)]/10">
                <Mail className="size-5 text-[oklch(0.65_0.18_265)]" />
              </div>
              <div>
                <p className="font-medium">Email Generation</p>
                <p className="text-sm text-muted-foreground">{TOKEN_COSTS.EMAIL_GENERATION} tokens</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[oklch(0.70_0.22_295)]/10">
                <Zap className="size-5 text-[oklch(0.70_0.22_295)]" />
              </div>
              <div>
                <p className="font-medium">Pitch/Follow-up</p>
                <p className="text-sm text-muted-foreground">{TOKEN_COSTS.PITCH_GENERATION} tokens</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10">
                <Search className="size-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Prospect Research</p>
                <p className="text-sm text-muted-foreground">{TOKEN_COSTS.WEB_RESEARCH} tokens</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
                <MessageSquare className="size-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Chat Message</p>
                <p className="text-sm text-muted-foreground">{TOKEN_COSTS.CHAT_MESSAGE} tokens</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
                <Send className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Send Email</p>
                <p className="text-sm text-muted-foreground">{TOKEN_COSTS.SEND_EMAIL} token</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TokenPurchaseModal
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
        onSuccess={handlePurchaseSuccess}
        remainingTokens={usage?.remainingTokens || 0}
      />
    </div>
  )
}
