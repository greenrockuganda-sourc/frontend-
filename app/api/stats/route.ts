import { NextResponse } from 'next/server'

const DJANGO_BASE = `${(process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')}/api/v1`

async function fetchFromDjango(path: string, options: RequestInit = {}) {
  const res = await fetch(`${DJANGO_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Django error ${res.status}: ${text}`)
  }

  return await res.json()
}

export async function GET(request: Request) {
  try {
    const data = await fetchFromDjango('/stats/', {}, request.headers)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch stats from backend' }, { status: 502 })
  }
}
