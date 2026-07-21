import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getTrialStatus,
  isTrialExpiredAllowlistedPath,
} from '@/lib/trial'

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
