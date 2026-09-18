import { NextResponse } from 'next/server'

const DJANGO_BASE = `${(process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')}/api/v1`

async function fetchFromDjango(path: string, options: RequestInit = {}, headers: HeadersInit = {}) {
  const mergedHeaders = new Headers(headers)
  const optionHeaders = new Headers(options.headers || {})

  for (const [key, value] of optionHeaders.entries()) {
    mergedHeaders.set(key, value)
  }

  mergedHeaders.set('Content-Type', 'application/json')

  const res = await fetch(`${DJANGO_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Django error ${res.status}: ${text}`)
  }

  return await res.json()
}

async function notifySellerOfNewOrder(createdOrder: any, request: Request) {
  const orderNumber = String(
    createdOrder?.order_number ??
    createdOrder?.orderId ??
    createdOrder?.id ??
    createdOrder?.order_id ??
    ''
  ).trim()

  const customer = createdOrder?.customer ?? {}
  const customerName = String(
    createdOrder?.customer_name ??
    customer?.full_name ??
    customer?.name ??
    [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ??
    'Customer'
  ).trim() || 'Customer'

  const sellerEmail = String(
    createdOrder?.seller_email ??
    createdOrder?.seller?.email ??
    createdOrder?.store_owner_email ??
    createdOrder?.owner_email ??
    ''
  ).trim()

  const message = orderNumber
    ? `Order ${orderNumber} from ${customerName} has been placed`
    : `${customerName} placed a new order`

  if (!orderNumber && !customerName) {
    return
  }

  try {
    await fetchFromDjango('/admin/notifications/broadcast-new-arrival/', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Order',
        message,
        segment: 'app_users',
        target: 'app_users',
        is_app_user: true,
        app_user_only: true,
        order_number: orderNumber || null,
        customer_name: customerName,
        source: 'customer_order',
      }),
    }, request.headers)
  } catch (error) {
    console.error('Failed to send seller notification for new order', error)
  }

  if (sellerEmail) {
    try {
      await fetchFromDjango('/admin/notifications/send-email-campaign/', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'New order received',
          message,
          email: sellerEmail,
          to: sellerEmail,
          customer_email: sellerEmail,
          app_domain: false,
          segment: 'seller',
          target: 'seller',
          is_app_user: false,
          app_user_only: false,
          send_to_all: false,
          recipient_count: 1,
          recipients: [sellerEmail],
        }),
      }, request.headers)
    } catch (error) {
      console.error('Failed to send seller email for new order', error)
    }
  }

  try {
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
    await fetch(`${appBaseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Order',
        body: message,
        url: '/?page=orders',
        data: {
          type: 'new_order',
          order_number: orderNumber || null,
          customer_name: customerName,
          source: 'customer_order',
        },
      }),
    })
  } catch (error) {
    console.error('Failed to send browser push notification for new order', error)
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const params = url.search
    const data = await fetchFromDjango(`/orders/${params}`, {}, request.headers)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch orders from backend' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const created = await fetchFromDjango('/orders/', { method: 'POST', body: JSON.stringify(body) }, request.headers)

    await notifySellerOfNewOrder(created, request)

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create order on backend' }, { status: 502 })
  }
}
