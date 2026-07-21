'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mic, Mail, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function SignUpSuccessContent() {
  const searchParams = useSearchParams()
  const resent = searchParams.get('resent') === '1'
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(
    resent ? 'A fresh confirmation email was sent. Check your inbox and spam folder.' : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resendOnly: true }),
      })
      const result = (await response.json()) as { error?: string; code?: string }
      if (!response.ok) {
        if (result.code === 'already_registered') {
          setMessage('This account is already confirmed. You can sign in now.')
          return
        }
        throw new Error(result.error || 'Could not resend email')
      }
      setMessage('Confirmation email sent. Check your inbox and spam folder.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
          <Mail className="h-6 w-6 text-accent" />
        </div>
        <CardTitle className="text-2xl">Check Your Email</CardTitle>
        <CardDescription>We sent you a confirmation link from VO Biz Suite</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Please confirm your account before signing in. If you do not see it within a few minutes,
          check spam/junk — or resend below.
        </p>

        <form onSubmit={handleResend} className="space-y-3 text-left">
          <div className="grid gap-2">
            <Label htmlFor="resend-email">Email used to sign up</Label>
            <Input
              id="resend-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          {message && <p className="text-sm text-artist-green">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="outline" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend confirmation email'
            )}
          </Button>
        </form>

        <Link
          href="/auth/login"
          className="inline-block text-sm text-primary underline underline-offset-4 hover:text-accent"
        >
          Back to Sign In
        </Link>
      </CardContent>
    </Card>
  )
}

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-secondary p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Mic className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">VO Biz Suite</span>
          </div>
          <Suspense
            fallback={
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
              </Card>
            }
          >
            <SignUpSuccessContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
