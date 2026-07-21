import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNextPath(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = next
  redirectTo.search = ''

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
    redirectTo.pathname = '/auth/error'
    redirectTo.searchParams.set('error', error.message)
    return NextResponse.redirect(redirectTo)
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(redirectTo)
    }

    redirectTo.pathname = '/auth/error'
    redirectTo.searchParams.set('error', error.message)
    return NextResponse.redirect(redirectTo)
  }

  redirectTo.pathname = '/auth/error'
  redirectTo.searchParams.set('error', 'Email confirmation link is missing or invalid.')
  return NextResponse.redirect(redirectTo)
}
