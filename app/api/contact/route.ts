import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json()

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Send email using mailto link approach or external service
    // For now, we'll use a simple approach that works without external dependencies
    // In production, you would integrate with SendGrid, Resend, or similar
    
    const toEmail = 'hello@vobizsuite.io'
    const subject = `Contact Form Inquiry from ${name}`
    const body = `
Name: ${name}
Email: ${email}

Message:
${message}

---
Sent from VOBizSuite Contact Form
    `.trim()

    // Log the contact submission (in production, this would be sent via email service)
    console.log('Contact form submission:', {
      to: toEmail,
      from: email,
      subject,
      body,
      timestamp: new Date().toISOString(),
    })

    // If you have SMTP configured, you can use nodemailer here
    // For now, we'll store in Supabase for tracking
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Try to store the contact submission (table may not exist yet)
    try {
      await supabase.from('contact_submissions').insert({
        name,
        email,
        message,
        created_at: new Date().toISOString(),
      })
    } catch {
      // Table might not exist, continue anyway
      console.log('Contact submissions table not available, skipping database storage')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
