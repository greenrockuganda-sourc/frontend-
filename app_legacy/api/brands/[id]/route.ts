import { NextResponse } from 'next/server'

const DJANGO_BASE = `${(process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')}/api/v1`

async function fetchFromDjango(path: string, options: RequestInit = {}, incomingHeaders?: Headers) {
  const forwardHeaders: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {} as Record<string,string>),
  }
  const token = incomingHeaders?.get('x-forward-auth-token') || incomingHeaders?.get('x-forward-auth')
  if (token) forwardHeaders['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${DJANGO_BASE}${path}`, {
    ...options,
    headers: forwardHeaders,
  })

  if (res.status === 404) return null

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Django error ${res.status}: ${text}`)
  }

  return await res.json()
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const data = await fetchFromDjango(`/brands/${id}/`, {}, request.headers)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch brand from backend' }, { status: 502 })
  }
}
