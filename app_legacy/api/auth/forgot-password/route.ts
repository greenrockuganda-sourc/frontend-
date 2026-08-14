import { NextResponse } from 'next/server'

const DJANGO_BASE = `${(process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')}/api`

async function fetchFromDjango(path: string, options: RequestInit = {}, incomingHeaders?: Headers) {
  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (incomingHeaders?.has('authorization')) {
    forwardHeaders.Authorization = incomingHeaders.get('authorization') || ''
  }

  const res = await fetch(`${DJANGO_BASE}${path}`, {
    ...options,
    headers: forwardHeaders,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Django error ${res.status}: ${text}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return await res.json()
  }

  return await res.text()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = body.email || body.identifier || body.email_or_phone
    const payload = { ...body }
    if (email && !payload.email) payload.email = email

    const data = await fetchFromDjango('/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, request.headers)

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to request password reset' }, { status: 502 })
  }
}
