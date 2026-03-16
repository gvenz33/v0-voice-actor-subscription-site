import { NextResponse } from 'next/server'

// Signature is stored client-side in localStorage since the database column doesn't exist
// This API just returns a signal to the client to use localStorage

export async function GET() {
  // Tell client to use localStorage
  return NextResponse.json({ signature: '', useLocalStorage: true })
}

export async function POST() {
  // Tell client to use localStorage - signature saved on client side
  return NextResponse.json({ success: true, useLocalStorage: true })
}
