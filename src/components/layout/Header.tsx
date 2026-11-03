import { Menu, Bell, User, LogOut, ArrowLeft, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchNotifications, markNotificationRead, sendNewArrivalNotification } from '@/lib/api'

interface HeaderProps {
  onMenuClick: () => void
  onBack?: (steps?: number) => void
  user?: any
  token?: string
  onLogout: () => void
  onProfileClick?: () => void
  notifications?: Array<{ id: string; type: string; title: string; message?: string }>
  onDismissNotification?: (id: string) => void
  onClearAllNotifications?: () => void
  addNotification?: (n: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }) => string
  pageTitle?: string
}

export default function Header({ onMenuClick, onBack, user, token, onLogout, onProfileClick, notifications: initialNotifications = [], onClearAllNotifications, pageTitle }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>(Array.isArray(initialNotifications) ? initialNotifications : [])
  const [showNewArrivalForm, setShowNewArrivalForm] = useState(false)
  const [arrivalTitle, setArrivalTitle] = useState('New arrival at Glow')
  const [arrivalMessage, setArrivalMessage] = useState('')
  const [arrivalStatus, setArrivalStatus] = useState<string | null>(null)
  const [sendingArrival, setSendingArrival] = useState(false)
  const seenNotificationIds = useRef<Set<string>>(new Set())

  const showBrowserNotification = useCallback((title: string, message?: string) => {
    if (!('Notification' in window)) return

    const canNotify = Notification.permission === 'granted'
    const shouldNotify = document.visibilityState === 'hidden'

    if (!canNotify && Notification.permission === 'default' && shouldNotify) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          const browserNotification = new Notification(title, {
            body: message || 'New seller alert',
            tag: 'seller-order-alert',
            requireInteraction: true,
          })
          browserNotification.onclick = () => window.focus()
        }
      }).catch(() => undefined)
      return
    }

    if (canNotify && shouldNotify) {
      const browserNotification = new Notification(title, {
        body: message || 'New seller alert',
        tag: 'seller-order-alert',
        requireInteraction: true,
      })
      browserNotification.onclick = () => window.focus()
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications(token ?? undefined)
      setNotifications(Array.isArray(data) ? data : [])
    } catch {
      // Notification failures should not interrupt the dashboard.
    }
  }, [token])

  useEffect(() => {
    void loadNotifications()
    const refresh = window.setInterval(() => void loadNotifications(), 30000)
    return () => window.clearInterval(refresh)
  }, [loadNotifications])

  useEffect(() => {
    const unseenNotifications = notifications.filter((notification) => {
      const id = String(notification.id)
      return !notification.is_read && !seenNotificationIds.current.has(id)
    })

    if (unseenNotifications.length === 0) return

    const newestNotification = unseenNotifications[0]
    showBrowserNotification(newestNotification.title, newestNotification.message)

    unseenNotifications.forEach((notification) => {
      seenNotificationIds.current.add(String(notification.id))
    })
  }, [notifications, showBrowserNotification])

  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  const openNotifications = () => {
    setShowNotifications((visible) => !visible)
    setShowUserMenu(false)
    if (!showNotifications) void loadNotifications()
  }

  const clearAllNotifications = () => {
    // mark all unread notifications as read on the backend, then clear local list
    const unread = notifications.filter((n) => !n.is_read)
    if (unread.length > 0) {
      Promise.allSettled(unread.map((n) => markNotificationRead(token ?? undefined, n.id))).then(() => {
        if (onClearAllNotifications) onClearAllNotifications()
        setNotifications([])
      }).catch(() => {
        // if marking fails, still clear local notifications to avoid duplicate UI
        if (onClearAllNotifications) onClearAllNotifications()
        setNotifications([])
      })
      return
    }
    if (onClearAllNotifications) onClearAllNotifications()
    setNotifications([])
  }

  const readNotification = async (notification: any) => {
    if (notification.is_read) return
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item))
    try {
      await markNotificationRead(token ?? undefined, notification.id)
    } catch {
      void loadNotifications()
    }
  }

  const sendNewArrival = async () => {
    const message = arrivalMessage.trim()
    if (!message) {
      setArrivalStatus('Enter a message for your customers.')
      return
    }
    setSendingArrival(true)
    setArrivalStatus(null)
    try {
      const result = await sendNewArrivalNotification(token ?? '', arrivalTitle.trim() || 'New arrival at Glow', message)
      setArrivalStatus(`Sent to ${result.recipient_count} customer${result.recipient_count === 1 ? '' : 's'}.`)
      setArrivalMessage('')
      setShowNewArrivalForm(false)
    } catch (error) {
      setArrivalStatus(error instanceof Error ? error.message : 'Could not send the notification.')
    } finally {
      setSendingArrival(false)
    }
  }

  const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Seller' : 'Seller'
  const initials = (displayName || 'S')
    .split(' ')
    .map((part: string) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <button
            onClick={() => onBack?.(1)}
            title="Go back"
            aria-label="Go back"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
          </button>
          {/* The sidebar carries the logo on desktop; show it here only when the sidebar is hidden. */}
          <img
            src="https://res.cloudinary.com/h78tlu47/image/upload/v1784708343/icon_sotujz.jpg"
            alt="Glow logo"
            className="h-9 w-9 flex-shrink-0 rounded-lg bg-white object-contain p-0.5 ring-1 ring-slate-200 lg:hidden"
          />
          {pageTitle && (
            <p className="ml-1 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{pageTitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button onClick={openNotifications} className="relative rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" aria-label="Notifications" aria-expanded={showNotifications}>
              <Bell size={19} />
              {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">Notifications</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearAllNotifications}
                      disabled={notifications.length === 0}
                      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear all
                    </button>
                    <button onClick={() => { setShowNewArrivalForm((value) => !value); setArrivalStatus(null) }} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">New arrival</button>
                  </div>
                </div>
                {showNewArrivalForm && (
                  <div className="mb-3 rounded-lg bg-blue-50 p-3">
                    <p className="mb-2 text-xs text-blue-800">Each customer receives this message addressed by their first name.</p>
                    <input value={arrivalTitle} onChange={(event) => setArrivalTitle(event.target.value)} maxLength={255} className="mb-2 w-full rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm" aria-label="Notification title" />
                    <textarea value={arrivalMessage} onChange={(event) => setArrivalMessage(event.target.value)} maxLength={1000} className="min-h-20 w-full rounded-md border border-blue-200 bg-white px-2 py-1.5 text-sm" placeholder="e.g. Karseell shampoo is now in stock." aria-label="New-arrival message" />
                    <button disabled={sendingArrival} onClick={() => void sendNewArrival()} className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{sendingArrival ? 'Sending…' : 'Send notification'}</button>
                  </div>
                )}
                {arrivalStatus && <p className="mb-2 text-xs text-blue-700">{arrivalStatus}</p>}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? <p className="px-1 py-4 text-sm text-slate-500">No notifications yet.</p> : notifications.slice(0, 20).map((notification) => (
                    <button key={notification.id} onClick={() => void readNotification(notification)} className={`block w-full border-t border-slate-100 px-1 py-2 text-left ${notification.is_read ? 'opacity-70' : 'bg-blue-50/60'}`}>
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-600">{notification.message}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100 sm:p-2"
              aria-label="User menu"
            >
              <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white sm:h-9 sm:w-9">
                {initials}
                {user?.profile_image && (
                  <img
                    key={user.profile_image}
                    src={user.profile_image}
                    alt={`${displayName}'s profile`}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                )}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 md:inline">{displayName}</span>
              <ChevronDown size={15} className="hidden text-slate-400 md:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-200 p-4">
                  <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email || 'seller@example.com'}</p>
                </div>
                <button onClick={() => { onProfileClick?.(); setShowUserMenu(false) }} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                  <User size={16} />
                  Profile
                </button>
                <button
                  onClick={() => { onLogout(); setShowUserMenu(false) }}
                  className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-sm text-indigo-600 transition-colors hover:bg-indigo-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
