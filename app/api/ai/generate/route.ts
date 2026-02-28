import { generateText } from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  const { type, context } = await req.json()

  let prompt = ''

  if (type === 'outreach_email') {
    prompt = `Write a professional cold outreach email from an independent voice actor to a production company or client.

Context provided by the voice actor:
${context.companyName ? `Company: ${context.companyName}` : ''}
${context.contactName ? `Contact Person: ${context.contactName}` : ''}
${context.genre ? `Genre/Niche: ${context.genre}` : ''}
${context.tone ? `Desired Tone: ${context.tone}` : ''}
${context.customNotes ? `Additional Notes: ${context.customNotes}` : ''}

Guidelines:
- Keep it under 150 words
- Be professional but personable
- Mention a specific reason for reaching out (reference their work if company name given)
- Include a clear call to action (listen to demo, schedule a quick call)
- Do NOT be salesy or desperate
- Sign off with [Your Name] as placeholder
- Output ONLY the email text, no extra commentary`
  } else if (type === 'pitch_generator') {
    prompt = `Write a compelling elevator pitch for an independent voice actor.

Context:
${context.genre ? `Specialization: ${context.genre}` : ''}
${context.experience ? `Experience Level: ${context.experience}` : ''}
${context.strengths ? `Key Strengths: ${context.strengths}` : ''}
${context.targetAudience ? `Target Clients: ${context.targetAudience}` : ''}

Guidelines:
- Keep it to 2-3 sentences (under 60 words)
- Make it memorable and specific
- Highlight what makes this voice actor unique
- Output ONLY the pitch text, no extra commentary`
  } else if (type === 'follow_up') {
    prompt = `Write a follow-up email for a voice actor who previously reached out to a client.

Context:
${context.companyName ? `Company: ${context.companyName}` : ''}
${context.contactName ? `Contact: ${context.contactName}` : ''}
${context.daysSince ? `Days since last contact: ${context.daysSince}` : ''}
${context.previousContext ? `Previous interaction: ${context.previousContext}` : ''}
${context.customNotes ? `Notes: ${context.customNotes}` : ''}

Guidelines:
- Keep it under 100 words
- Reference the previous outreach naturally
- Provide a new reason to connect (new demo, seasonal availability, industry news)
- Be warm but professional, not pushy
- Include a soft call to action
- Sign off with [Your Name]
- Output ONLY the email text, no extra commentary`
  }

  const { text } = await generateText({
    model: 'openai/gpt-5-mini',
    prompt,
    maxOutputTokens: 1000,
  })

  return Response.json({ text })
}
