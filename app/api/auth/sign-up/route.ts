import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/oauth-config'
import { ensureUserProfile } from '@/lib/ensure-user-profile'

export const dynamic = 'force-dynamic'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient()
  // Paginate lightly — signup volume is low; prefer exact match.
  let page = 1
  const perPage = 200
  for (let i = 0; i < 10; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < perPage) return null
    page += 1
  }
  return null
}

async function sendBrandedConfirmEmail(opts: {
  to: string
  displayName: string
  confirmUrl: string
  resendApiKey: string
}) {
  const { Resend } = await import('resend')
  const resend = new Resend(opts.resendApiKey)
  return resend.emails.send({
    from: 'VO Biz Suite <noreply@vobizsuite.io>',
    to: opts.to,
    subject: 'Confirm your VO Biz Suite account',
    text: `Hi ${opts.displayName},

Welcome to VO Biz Suite! Confirm your email to finish creating your account:

${opts.confirmUrl}

If you did not sign up, you can ignore this email.

— The VO Biz Suite team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1428;">
        <h2 style="margin-bottom: 8px;">Confirm your email</h2>
        <p>Hi ${escapeHtml(opts.displayName)},</p>
        <p>Welcome to <strong>VO Biz Suite</strong>. Confirm your email to finish creating your account and start your free trial.</p>
        <p style="margin: 28px 0;">
          <a href="${escapeHtml(opts.confirmUrl)}"
             style="display: inline-block; background: #2f6b45; color: #f4f0ff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
            Confirm email address
          </a>
        </p>
        <p style="font-size: 13px; color: #5c5670;">
          Or paste this link into your browser:<br />
          <a href="${escapeHtml(opts.confirmUrl)}" style="color: #5b4db8; word-break: break-all;">${escapeHtml(opts.confirmUrl)}</a>
        </p>
        <p style="font-size: 13px; color: #5c5670;">If you did not sign up, you can ignore this email.</p>
        <p style="margin-top: 28px;">— The VO Biz Suite team</p>
      </div>
    `,
  })
}

function buildConfirmUrl(
  origin: string,
  hashedToken: string | undefined,
  verificationType: string | undefined,
  actionLink: string | undefined,
  nextPath: string,
) {
  if (hashedToken) {
    const type = verificationType || 'signup'
    return `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${encodeURIComponent(type)}&next=${encodeURIComponent(nextPath)}`
  }
  return actionLink
}

export async function POST(request: Request) {
  let createdUserId: string | null = null

  try {
    const body = await request.json()
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')
    const firstName = String(body.firstName ?? '').trim()
    const lastName = String(body.lastName ?? '').trim()
    const referralCode =
      typeof body.referralCode === 'string' && body.referralCode.trim()
        ? body.referralCode.trim()
        : null
    const resendOnly = body.resendOnly === true

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    if (!resendOnly && !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      )
    }

    if (!resendOnly && password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 },
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim()
    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Email service is not configured. Please try again later.' },
        { status: 503 },
      )
    }

    const origin = getAppUrl()
    const nextPath = '/dashboard'
    const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`
    const admin = createAdminClient()
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'there'

    const existing = await findAuthUserByEmail(email)

    if (existing?.email_confirmed_at) {
      return NextResponse.json(
        {
          error:
            'This email is already registered. Please sign in instead — you do not need another confirmation email.',
          code: 'already_registered',
        },
        { status: 409 },
      )
    }

    // Unconfirmed existing user: resend a fresh confirmation link (no password required).
    if (existing && !existing.email_confirmed_at) {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      const confirmUrl = buildConfirmUrl(
        origin,
        data.properties?.hashed_token,
        data.properties?.verification_type || 'magiclink',
        data.properties?.action_link,
        nextPath,
      )
      if (!confirmUrl) {
        return NextResponse.json(
          { error: 'Could not create confirmation link. Please try again.' },
          { status: 500 },
        )
      }

      const { error: sendError } = await sendBrandedConfirmEmail({
        to: email,
        displayName:
          [existing.user_metadata?.first_name, existing.user_metadata?.last_name]
            .filter(Boolean)
            .join(' ') || displayName,
        confirmUrl,
        resendApiKey,
      })

      if (sendError) {
        console.error('Failed to resend signup confirmation email:', sendError)
        return NextResponse.json(
          { error: 'Could not send the confirmation email. Please try again in a moment.' },
          { status: 502 },
        )
      }

      return NextResponse.json({ ok: true, resent: true })
    }

    if (resendOnly) {
      return NextResponse.json(
        { error: 'No pending signup found for this email. Please create an account first.' },
        { status: 404 },
      )
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          referred_by: referralCode,
        },
        redirectTo,
      },
    })

    if (error) {
      // Race: created between check and generateLink
      if (/already/i.test(error.message) || /registered/i.test(error.message)) {
        return NextResponse.json(
          {
            error:
              'This email is already registered. Please sign in, or use “Resend confirmation” if you have not confirmed yet.',
            code: 'already_registered',
          },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    createdUserId = data.user?.id ?? null

    if (data.user) {
      try {
        await ensureUserProfile(data.user)
      } catch (profileErr) {
        console.error('Failed to ensure profile on signup:', profileErr)
      }
    }

    const confirmUrl = buildConfirmUrl(
      origin,
      data.properties?.hashed_token,
      data.properties?.verification_type || 'signup',
      data.properties?.action_link,
      nextPath,
    )

    if (!confirmUrl) {
      if (createdUserId) {
        await admin.auth.admin.deleteUser(createdUserId)
        createdUserId = null
      }
      return NextResponse.json(
        { error: 'Could not create confirmation link. Please try again.' },
        { status: 500 },
      )
    }

    const { error: sendError } = await sendBrandedConfirmEmail({
      to: email,
      displayName,
      confirmUrl,
      resendApiKey,
    })

    if (sendError) {
      console.error('Failed to send signup confirmation email:', sendError)
      if (createdUserId) {
        await admin.auth.admin.deleteUser(createdUserId)
        createdUserId = null
      }
      return NextResponse.json(
        {
          error:
            'We could not send the confirmation email. No account was left behind — please try again.',
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Sign-up API error:', err)
    if (createdUserId) {
      try {
        const admin = createAdminClient()
        await admin.auth.admin.deleteUser(createdUserId)
      } catch (cleanupErr) {
        console.error('Failed to clean up signup user after error:', cleanupErr)
      }
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An error occurred' },
      { status: 500 },
    )
  }
}
