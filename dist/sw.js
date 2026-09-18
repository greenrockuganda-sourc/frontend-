self.addEventListener('push', (event) => {
  let payload = { title: 'Seller update', body: 'You have a new order notification.' }

  try {
    if (event.data) {
      payload = event.data.json()
    }
  } catch (error) {
    payload = {
      title: 'Seller update',
      body: event.data ? event.data.text() : 'You have a new notification.',
    }
  }

  const title = payload.title || 'Seller update'
  const options = {
    body: payload.body || 'You have a new notification.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'seller-order-push',
    requireInteraction: true,
    data: payload,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          return
        }
      }

      return clients.openWindow(url)
    })
  )
})
