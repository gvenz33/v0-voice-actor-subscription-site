import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const KNOWLEDGE_BASE = `
# VOBizSuite Knowledge Base

## About VOBizSuite
VOBizSuite is an all-in-one business management platform designed specifically for voice actors. It helps track auditions, manage clients, send invoices, and grow VO careers with AI-powered tools.

## Subscription Tiers

### Free Plan ($0/month)
- Access to core CRM features
- Client management
- Audition tracking
- Booking calendar
- Basic invoicing
- No AI features included

### Launch Plan ($19/month or $190/year)
- Up to 50 contacts in Client Hub
- Submission & audition tracking
- Basic booking management
- Simple invoice generation
- Action items & task list
- AI outreach email writer (5/month)
- Prospect Finder (5 scans/month)
- Email support

### Momentum Plan ($49/month or $490/year) - Most Popular
- Unlimited contacts in Client Hub
- Advanced submission pipeline
- Full booking & session management
- Professional invoicing with tracking
- Touchpoint & follow-up automation
- Action items with priority levels
- AI outreach emails & pitch generator (50/month)
- Prospect Finder (50 scans/month)
- AI follow-up writer
- Performance analytics dashboard
- Priority support
- Affiliate program access (20% commission)

### Command Plan ($99/month or $990/year)
- Everything in Momentum
- Unlimited everything
- Advanced CRM with pipeline automation
- Unlimited AI outreach, pitches & assistant
- Unlimited Prospect Finder scans
- AI VO Business Assistant (chat)
- Custom invoice branding
- Calendar integrations
- API access for custom workflows
- Dedicated account support
- Early access to new features
- Affiliate program access (20% commission)

## AI Features

### Outreach Email Writer
Crafts personalized cold emails for reaching out to production companies, ad agencies, and studios. Available in Launch (5/mo), Momentum (50/mo), and unlimited in Command.

### Follow-Up Writer
Creates professional follow-up emails to maintain client relationships. Available in Momentum and Command tiers.

### Pitch Generator
Generates compelling pitch scripts for auditions. Available in Momentum (50/mo) and unlimited in Command.

### VO Business Chat Assistant
An AI coach for voice over business questions - pricing, marketing, negotiations, and career advice. Command tier only.

### Prospect Finder
AI-powered tool to discover potential clients and opportunities. Launch (5 scans/mo), Momentum (50 scans/mo), Command (unlimited).

## Token System
- AI features use tokens (credits for AI generations)
- Each tier includes monthly token allowance that resets each billing cycle
- Additional token packs can be purchased
- Unused tokens don't roll over to the next month

## Email Integrations
VOBizSuite integrates with:
- Gmail
- Outlook 365
- SMTP (custom email setups)

## Data & Security
- Industry-standard encryption
- Secure authentication through Supabase
- Row-level security policies
- Data never shared with third parties
- Full data export available anytime

## Affiliate Program
- Available to Momentum and Command subscribers
- Earn 20% commission on referrals
- Lifetime commissions as long as referral remains a paying customer
- Unique affiliate code provided in dashboard
- Monthly payouts for earnings over $50

## Common Issues & Solutions

### Can't login
- Check email/password are correct
- Try password reset via "Forgot Password"
- Clear browser cache and cookies
- Try a different browser

### AI features not working
- Verify subscription tier includes the feature
- Check monthly token allowance hasn't been exceeded
- Try refreshing the page
- Contact support if issue persists

### Invoice not sending
- Verify client email address is correct
- Check email integration is properly connected
- Try sending a test email first

### Import not working
- Ensure CSV format is correct
- Check column headers match expected fields
- Maximum 1000 contacts per import

## Contact
- Email: hello@vobizsuite.io
- Support available via this chat
- Momentum/Command users get priority support
`

const SYSTEM_PROMPT = `You are VOBizSuite's friendly AI Support Assistant. You help customers with questions about the platform, troubleshooting issues, and understanding features.

${KNOWLEDGE_BASE}

## Guidelines:
1. Be helpful, friendly, and concise
2. Answer questions based on the knowledge base above
3. If you don't know something specific, say so honestly
4. For billing issues, account changes, or complex technical problems, offer to escalate to a human
5. Always suggest escalation if the customer seems frustrated or the issue is beyond your knowledge
6. Format responses nicely with bullet points when listing features
7. Keep responses focused and not too long

## Escalation Triggers (suggest human support for these):
- Billing disputes or refund requests
- Account access issues that persist
- Bug reports or technical issues you can't solve
- Customer explicitly asks for human support
- Customer seems frustrated after 2-3 exchanges
- Questions about custom enterprise pricing
- Legal or compliance questions

When suggesting escalation, say something like: "I'd like to connect you with our support team for this. Would you like me to escalate this conversation to a human agent who can help further?"
`

export async function POST(req: Request) {
  try {
    const { messages, conversationId, visitorId, visitorName, visitorEmail, requestEscalation } = await req.json()

    const supabase = await createClient()
    
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser()

    // Handle escalation request
    if (requestEscalation && conversationId) {
      // Update conversation status to escalated
      await supabase
        .from('support_conversations')
        .update({ 
          status: 'escalated', 
          escalated_at: new Date().toISOString(),
          escalated_reason: 'Customer requested human support'
        })
        .eq('id', conversationId)

      // Create notification for admin
      await supabase
        .from('support_notifications')
        .insert({
          conversation_id: conversationId,
          admin_email: 'gvenz33@gmail.com'
        })

      // Send escalation email notification
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/support/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            visitorName: visitorName || 'Anonymous',
            visitorEmail: visitorEmail || 'Not provided'
          })
        })
      } catch (e) {
        console.error('Failed to send escalation notification:', e)
      }

      return Response.json({ 
        escalated: true, 
        message: "I've notified our support team. Someone will join this conversation shortly. In the meantime, is there anything else I can help clarify?" 
      })
    }

    // Create or get conversation
    let convId = conversationId
    if (!convId) {
      const { data: conv, error: convError } = await supabase
        .from('support_conversations')
        .insert({
          visitor_id: visitorId,
          visitor_name: visitorName,
          visitor_email: visitorEmail,
          user_id: user?.id || null,
          status: 'active'
        })
        .select('id')
        .single()

      if (convError) throw convError
      convId = conv.id
    }

    // Save user message
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      await supabase
        .from('support_messages')
        .insert({
          conversation_id: convId,
          role: 'user',
          content: lastMessage.content
        })
    }

    // Call Groq for AI response
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error?.message || 'AI service error')
    }

    const data = await res.json()
    const assistantMessage = data.choices[0]?.message?.content || "I apologize, but I'm having trouble responding. Would you like me to connect you with our support team?"

    // Save assistant response
    await supabase
      .from('support_messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: assistantMessage
      })

    return Response.json({ 
      message: assistantMessage, 
      conversationId: convId 
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] Support chat error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
