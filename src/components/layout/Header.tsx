import { Menu, Bell, User, LogOut, Settings } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  onMenuClick: () => void
  user?: any
  onLogout: () => void
  onProfileClick?: () => void
  notifications?: Array<{ id: string; type: string; title: string; message?: string }>
  onDismissNotification?: (id: string) => void
  addNotification?: (n: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }) => string
}

export default function Header({ onMenuClick, user, onLogout, onProfileClick, notifications = [], onDismissNotification, addNotification }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

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
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-100 via-white to-violet-100 shadow-[0_0_22px_rgba(99,102,241,0.4)] sm:h-16 sm:w-16">
              <img
                src="https://res.cloudinary.com/h78tlu47/image/upload/v1784708343/icon_sotujz.jpg"
                alt="Seller Admin logo"
                className="h-full w-full object-contain p-1.5"
              />
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

          <button
            onClick={() => onProfileClick?.()}
            className="inline-flex rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100 sm:p-2"
              aria-label="User menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white sm:h-9 sm:w-9">
                {initials}
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