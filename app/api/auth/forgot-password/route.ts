import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppUrl } from '@/lib/oauth-config'
import { getTransactionalFromAddress } from '@/lib/resend-from'

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

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
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
    const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent('/auth/reset-password')}`

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    // Always return success to avoid leaking whether an account exists.
    if (error) {
      console.error('Password reset link error:', error.message)
      return NextResponse.json({ ok: true })
    }

    const hashedToken = data.properties?.hashed_token
    const verificationType = (data.properties?.verification_type || 'recovery') as string
    const confirmUrl = hashedToken
      ? `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${encodeURIComponent(verificationType)}&next=${encodeURIComponent('/auth/reset-password')}`
      : data.properties?.action_link

    if (!confirmUrl) {
      return NextResponse.json({ ok: true })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)

    const { error: sendError } = await resend.emails.send({
      from: getTransactionalFromAddress(),
      to: email,
      subject: 'Reset your VO Biz Suite password',
      text: `We received a request to reset your VO Biz Suite password.

Reset your password:
${confirmUrl}

If you did not request this, you can ignore this email.

— The VO Biz Suite team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1428;">
          <h2 style="margin-bottom: 8px;">Reset your password</h2>
          <p>We received a request to reset your <strong>VO Biz Suite</strong> password.</p>
          <p style="margin: 28px 0;">
            <a href="${escapeHtml(confirmUrl)}"
               style="display: inline-block; background: #2f6b45; color: #f4f0ff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
              Choose a new password
            </a>
          </p>
          <p style="font-size: 13px; color: #5c5670;">
            Or paste this link into your browser:<br />
            <a href="${escapeHtml(confirmUrl)}" style="color: #5b4db8; word-break: break-all;">${escapeHtml(confirmUrl)}</a>
          </p>
          <p style="font-size: 13px; color: #5c5670;">If you did not request this, you can ignore this email.</p>
          <p style="margin-top: 28px;">— The VO Biz Suite team</p>
        </div>
      `,
    })

    if (sendError) {
      console.error('Failed to send password reset email:', sendError)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Forgot-password API error:', err)
    return NextResponse.json({ ok: true })
  }
}
