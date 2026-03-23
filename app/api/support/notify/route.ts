import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { conversationId, visitorName, visitorEmail } = await req.json()

    // Send email notification to admin
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'VOBizSuite Support <noreply@vobizsuite.io>',
        to: 'gvenz33@gmail.com',
        subject: `[Action Required] Support Escalation - ${visitorName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Support Conversation Escalated</h2>
            <p>A customer has requested human support.</p>
            
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Customer Name:</strong> ${visitorName || 'Not provided'}</p>
              <p><strong>Customer Email:</strong> ${visitorEmail || 'Not provided'}</p>
              <p><strong>Conversation ID:</strong> ${conversationId}</p>
            </div>
            
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/support/${conversationId}" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Conversation
              </a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Please respond to this customer as soon as possible.
            </p>
          </div>
        `,
      })
    }

    return Response.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] Notification error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
