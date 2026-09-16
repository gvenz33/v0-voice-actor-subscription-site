import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getTrialStatus,
  isTrialExpiredAllowlistedPath,
} from '@/lib/trial'
import {
  AFFILIATE_INTENT_COOKIE,
  AFFILIATE_REF_COOKIE,
  AFFILIATE_REF_MAX_AGE_SECONDS,
} from '@/lib/affiliate-cookies'
import { normalizeAffiliateCodeInput } from '@/lib/affiliate-code'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const refParam = request.nextUrl.searchParams.get('ref')
  if (refParam) {
    const code = normalizeAffiliateCodeInput(refParam)
    if (code) {
      supabaseResponse.cookies.set(AFFILIATE_REF_COOKIE, code, {
        maxAge: AFFILIATE_REF_MAX_AGE_SECONDS,
        path: '/',
        sameSite: 'lax',
      })
    }
  }
  if (request.nextUrl.searchParams.get('intent') === 'affiliate') {
    supabaseResponse.cookies.set(AFFILIATE_INTENT_COOKIE, '1', {
      maxAge: AFFILIATE_REF_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
    })
  }

  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith('/dashboard') && !isTrialExpiredAllowlistedPath(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'subscription_tier, trial_ends_at, trial_exempt, is_admin, is_superadmin',
      )
      .eq('id', user.id)
      .maybeSingle()

    const trial = getTrialStatus(profile)
    if (trial.isExpired) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/billing'
      url.searchParams.set('trial', 'expired')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
