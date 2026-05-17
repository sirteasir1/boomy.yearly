import { NextRequest, NextResponse } from "next/server"

const requests = new Map<string, number[]>()

export function rateLimit(req: NextRequest, limit = 20, windowMs = 60000) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  const now = Date.now()
  const times = (requests.get(ip) || []).filter(t => now - t < windowMs)
  times.push(now)
  requests.set(ip, times)
  if (times.length > limit) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }
  return null
}
