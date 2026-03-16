import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Try to get signature from email_config table
  const { data, error } = await supabase
    .from('email_config')
    .select('signature_text')
    .eq('user_id', user.id)
    .single()

  // If table doesn't exist or no row, return empty signature (client will use localStorage)
  if (error) {
    if (error.code === 'PGRST205' || error.code === 'PGRST116') {
      // Table doesn't exist or no row - return empty, client uses localStorage fallback
      return NextResponse.json({ signature: '', tableNotReady: error.code === 'PGRST205' })
    }
    // Other errors - log but don't fail
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

  // Check if email_config table exists and user has a row
  const { data: existing, error: checkError } = await supabase
    .from('email_config')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // If table doesn't exist, return success anyway (client uses localStorage)
  if (checkError?.code === 'PGRST205') {
    return NextResponse.json({ success: true, usingLocalStorage: true })
  }

  let error
  if (existing) {
    // Update existing row
    const result = await supabase
      .from('email_config')
      .update({ signature_text: signature, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
    error = result.error
  } else {
    // Insert new row with just the signature
    const result = await supabase
      .from('email_config')
      .insert({ user_id: user.id, signature_text: signature })
    error = result.error
  }

  if (error) {
    console.error('Error saving signature:', error)
    // Return success anyway - client will use localStorage as fallback
    return NextResponse.json({ success: true, usingLocalStorage: true })
  }

  return NextResponse.json({ success: true })
}
