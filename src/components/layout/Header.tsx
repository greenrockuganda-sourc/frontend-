import { Menu, Bell, User, LogOut, Settings, ChevronDown, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchNotifications, markNotificationRead, sendNewArrivalNotification } from '@/lib/api'

interface HeaderProps {
  onMenuClick: () => void
  user?: any
  token?: string
  onLogout: () => void
  onProfileClick?: () => void
  notifications?: Array<{ id: string; type: string; title: string; message?: string }>
  onDismissNotification?: (id: string) => void
  addNotification?: (n: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }) => string
  pageTitle?: string
}

export default function Header({ onMenuClick, user, token, onLogout, onProfileClick, notifications: initialNotifications = [], onDismissNotification, addNotification, pageTitle }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>(Array.isArray(initialNotifications) ? initialNotifications : [])
  const [showNewArrivalForm, setShowNewArrivalForm] = useState(false)
  const [arrivalTitle, setArrivalTitle] = useState('New arrival at Glow')
  const [arrivalMessage, setArrivalMessage] = useState('')
  const [arrivalStatus, setArrivalStatus] = useState<string | null>(null)
  const [sendingArrival, setSendingArrival] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
 

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications(token)
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

  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  const openNotifications = () => {
    setShowNotifications((visible) => !visible)
    setShowUserMenu(false)
    if (!showNotifications) void loadNotifications()
  }

  const readNotification = async (notification: any) => {
    if (notification.is_read) return
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item))
    try {
      await markNotificationRead(token, notification.id)
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
      const result = await sendNewArrivalNotification(token, arrivalTitle.trim() || 'New arrival at Glow', message)
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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="flex flex-1 items-center justify-center sm:justify-start">
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-100 via-white to-violet-100 sm:h-16 sm:w-16">
              <img
                src="https://res.cloudinary.com/h78tlu47/image/upload/v1784708343/icon_sotujz.jpg"
                alt="Seller Admin logo"
                className="h-full w-full object-contain p-1.5"
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-xl"
                style={{
                  boxShadow: '0 14px 32px -14px rgba(99,102,241,0.4), 0 0 48px rgba(168,85,247,0.18)',
                  pointerEvents: 'none',
                }}
              />
              <span className="absolute inset-0 rounded-xl ring-1 ring-indigo-200/70 ring-offset-2 ring-offset-white" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button onClick={() => setShowNotifications((s) => !s)} className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900" aria-label="Notifications">
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">{notifications.length}</span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="p-3">
                  <p className="text-sm font-semibold text-slate-700">Notifications</p>
                </div>
                <div className="max-h-60 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="flex items-start justify-between gap-3 border-t border-slate-100 p-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{n.title}</p>
                          {n.message && <p className="text-xs text-slate-600">{n.message}</p>}
                        </div>
                        <div className="flex-shrink-0 pl-2">
                          <button onClick={() => { onDismissNotification?.(n.id); }} className="text-xs text-indigo-600">Dismiss</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={openNotifications} className="relative rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" aria-label="Notifications" aria-expanded={showNotifications}>
              <Bell size={19} />
              {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">Notifications</p>
                  <button onClick={() => { setShowNewArrivalForm((value) => !value); setArrivalStatus(null) }} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">New arrival</button>
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
