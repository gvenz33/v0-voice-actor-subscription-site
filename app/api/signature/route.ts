import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('email_signatures')
    .select('signature_text')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine
    console.error('Error fetching signature:', error)
  }

  return NextResponse.json({ signature: data?.signature_text || '' })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { signature } = await req.json()

  const { error } = await supabase
    .from('email_signatures')
    .upsert(
      { user_id: user.id, signature_text: signature, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('Error saving signature:', error)
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
