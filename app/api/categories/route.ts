import { NextResponse } from 'next/server'

const DJANGO_BASE = `${(process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')}/api/v1`

async function fetchFromDjango(path: string, options: RequestInit = {}, incomingHeaders?: Headers) {
  const forwardHeaders: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {} as Record<string,string>),
  }

  // Forward x-forward-auth-token as Authorization: Bearer <token>
  const token = incomingHeaders?.get('x-forward-auth-token') || incomingHeaders?.get('x-forward-auth')
  if (token) {
    forwardHeaders['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${DJANGO_BASE}${path}`, {
    ...options,
    headers: forwardHeaders,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Django error ${res.status}: ${text}`)
  }

  return await res.json()
}

export async function GET(request: Request) {
  try {
    const data = await fetchFromDjango('/categories/', {}, request.headers)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch categories from backend' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body || !body.category_name || String(body.category_name).trim() === '') {
      return NextResponse.json({ error: 'category_name is required' }, { status: 400 })
    }

    // Pass through auth header if present
    const incomingHeaders = request.headers
    const created = await fetchFromDjango('/categories/', { method: 'POST', body: JSON.stringify(body) }, incomingHeaders)
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create category on backend' }, { status: 502 })
  }
}
