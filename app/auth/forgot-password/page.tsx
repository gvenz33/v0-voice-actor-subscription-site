'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'
import { Mic, ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setIsSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

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
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>
                {isSuccess
                  ? 'Check your email for the reset link'
                  : "Enter your email and we'll send you a reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">Email Sent!</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We sent a password reset link to <strong>{email}</strong>
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setIsSuccess(false)
                        setEmail('')
                      }}
                    >
                      <Mail className="h-4 w-4" />
                      Try different email
                    </Button>
                    <Link href="/auth/login" className="w-full">
                      <Button variant="ghost" className="w-full gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </div>
                  <div className="mt-4 text-center">
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to login
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
