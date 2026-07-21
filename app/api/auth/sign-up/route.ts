import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/oauth-config'

export const dynamic = 'force-dynamic'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(request: Request) {
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

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      )
    }

    if (password.length < 6) {
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
    const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent('/dashboard')}`

    const admin = createAdminClient()
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const hashedToken = data.properties?.hashed_token
    const verificationType = (data.properties?.verification_type || 'signup') as string
    const confirmUrl = hashedToken
      ? `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${encodeURIComponent(verificationType)}&next=${encodeURIComponent('/dashboard')}`
      : data.properties?.action_link

    if (!confirmUrl) {
      return NextResponse.json(
        { error: 'Could not create confirmation link. Please try again.' },
        { status: 500 },
      )
    }

    const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'there'
    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)

    const { error: sendError } = await resend.emails.send({
      from: 'VO Biz Suite <noreply@vobizsuite.io>',
      to: email,
      subject: 'Confirm your VO Biz Suite account',
      text: `Hi ${displayName},

Welcome to VO Biz Suite! Confirm your email to finish creating your account:

${confirmUrl}

If you did not sign up, you can ignore this email.

— The VO Biz Suite team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1428;">
          <h2 style="margin-bottom: 8px;">Confirm your email</h2>
          <p>Hi ${escapeHtml(displayName)},</p>
          <p>Welcome to <strong>VO Biz Suite</strong>. Confirm your email to finish creating your account and start your free trial.</p>
          <p style="margin: 28px 0;">
            <a href="${escapeHtml(confirmUrl)}"
               style="display: inline-block; background: #2f6b45; color: #f4f0ff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
              Confirm email address
            </a>
          </p>
          <p style="font-size: 13px; color: #5c5670;">
            Or paste this link into your browser:<br />
            <a href="${escapeHtml(confirmUrl)}" style="color: #5b4db8; word-break: break-all;">${escapeHtml(confirmUrl)}</a>
          </p>
          <p style="font-size: 13px; color: #5c5670;">If you did not sign up, you can ignore this email.</p>
          <p style="margin-top: 28px;">— The VO Biz Suite team</p>
        </div>
      `,
    })

    if (sendError) {
      console.error('Failed to send signup confirmation email:', sendError)
      return NextResponse.json(
        { error: 'Account was created but the confirmation email failed to send. Please contact support.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Sign-up API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An error occurred' },
      { status: 500 },
    )
  }
}
