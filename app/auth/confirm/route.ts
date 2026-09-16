import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/ensure-user-profile'
import { attributeReferralForUser } from '@/lib/affiliate-referrals'
import {
  AFFILIATE_INTENT_COOKIE,
  AFFILIATE_REF_COOKIE,
} from '@/lib/affiliate-cookies'
import { normalizeAffiliateCodeInput } from '@/lib/affiliate-code'

function safeNextPath(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

function applyNextPath(url: URL, nextPath: string) {
  const [pathname, query = ''] = nextPath.split('?')
  url.pathname = pathname
  url.search = query ? `?${query}` : ''
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  let next = safeNextPath(searchParams.get('next'))

  const intentCookie = request.cookies.get(AFFILIATE_INTENT_COOKIE)?.value
  if (intentCookie === '1' && (next === '/dashboard' || next.startsWith('/dashboard?'))) {
    next = '/dashboard/affiliate?welcome=1'
  }

  const redirectTo = request.nextUrl.clone()
  applyNextPath(redirectTo, next)

  const supabase = await createClient()

  async function afterAuthSuccess() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    try {
      await ensureUserProfile(user)
    } catch (err) {
      console.error('[auth/confirm] ensure profile:', err)
    }

    const metaRef =
      typeof user.user_metadata?.referred_by === 'string'
        ? user.user_metadata.referred_by
        : null
    const cookieRef = request.cookies.get(AFFILIATE_REF_COOKIE)?.value ?? null
    const referralCode = normalizeAffiliateCodeInput(metaRef || cookieRef || '')
    if (referralCode) {
      try {
        await attributeReferralForUser({
          referredUserId: user.id,
          referralCode,
        })
      } catch (err) {
        console.error('[auth/confirm] attribute referral:', err)
      }
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await afterAuthSuccess()
      const res = NextResponse.redirect(redirectTo)
      res.cookies.set(AFFILIATE_INTENT_COOKIE, '', { maxAge: 0, path: '/' })
      return res
    }
    redirectTo.pathname = '/auth/error'
    redirectTo.search = ''
    redirectTo.searchParams.set('error', error.message)
    return NextResponse.redirect(redirectTo)
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      await afterAuthSuccess()
      const res = NextResponse.redirect(redirectTo)
      res.cookies.set(AFFILIATE_INTENT_COOKIE, '', { maxAge: 0, path: '/' })
      return res
    }

    redirectTo.pathname = '/auth/error'
    redirectTo.search = ''
    redirectTo.searchParams.set('error', error.message)
    return NextResponse.redirect(redirectTo)
  }

  redirectTo.pathname = '/auth/error'
  redirectTo.search = ''
  redirectTo.searchParams.set('error', 'Email confirmation link is missing or invalid.')
  return NextResponse.redirect(redirectTo)
}
