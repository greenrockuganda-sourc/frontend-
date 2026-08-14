import { NextResponse } from 'next/server'

const DJANGO_BASE = `${(process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')}/api`

async function fetchFromDjango(path: string, options: RequestInit = {}, incomingHeaders?: Headers) {
  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  const token = incomingHeaders?.get('x-forward-auth-token') || incomingHeaders?.get('x-forward-auth') || incomingHeaders?.get('authorization')
  if (token) {
    forwardHeaders.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
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

export async function GET(request: Request) {
  try {
    const data = await fetchFromDjango('/profile/', {}, request.headers)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch home profile' }, { status: 502 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const data = await fetchFromDjango('/profile/', {
      method: 'PUT',
      body: JSON.stringify(body),
    }, request.headers)

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update home profile' }, { status: 502 })
  }
}
