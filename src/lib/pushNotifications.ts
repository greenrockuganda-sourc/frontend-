const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)

  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i)
  }

  return output
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    await navigator.serviceWorker.register('/sw.js')
    return true
  } catch (error) {
    console.error('Service worker registration failed:', error)
    return false
  }
}

export async function subscribeToSellerPush() {
  if (!('PushManager' in window) || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return false
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return false
  }

  const registration = await navigator.serviceWorker.ready
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

  if (!vapidPublicKey) {
    console.warn('VAPID public key is missing. Add VITE_VAPID_PUBLIC_KEY in the environment to enable background push notifications.')
    return false
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        platform: 'web',
      }),
    })

    return true
  } catch (error) {
    console.error('Failed to subscribe to seller push notifications:', error)
    return false
  }
}
