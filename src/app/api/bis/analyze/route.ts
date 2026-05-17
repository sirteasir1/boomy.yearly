import { NextRequest, NextResponse } from 'next/server'

// BIS analysis now happens client-side
// This route is kept for backwards compatibility
export async function POST(req: NextRequest) {
  return NextResponse.json({ status: 'client_side', message: 'Analysis now runs client-side' })
}

