import { Menu, Bell, User, LogOut, ChevronDown, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface HeaderProps {
  onMenuClick: () => void
  user?: any
  onLogout: () => void
  onProfileClick?: () => void
  pageTitle?: string
}

export default function Header({ onMenuClick, user, onLogout, onProfileClick, pageTitle }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Seller' : 'Seller'
  const initials = (displayName || 'S')
    .split(' ')
    .map((part: string) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const roleLabel = user?.role || 'Seller'

  useEffect(() => {
    if (!showUserMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowUserMenu(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showUserMenu])

  return (
    <header className="sticky-header no-print">
      <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-6">
        {/* Left: menu + title */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={onMenuClick}
            className="btn btn-ghost -ml-1 !px-2 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <span className="text-xs font-bold">GL</span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="eyebrow hidden sm:block">Glow Commerce</p>
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
              {pageTitle || 'Dashboard'}
            </h1>
          </div>
        </div>

        {/* Right: search + actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative hidden xl:block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search…"
              className="input !w-64 !py-2 pl-9 text-sm"
              aria-label="Search"
            />
          </div>

          <button
            className="relative rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Notifications"
          >
            <Bell size={19} />
            <span className="absolute right-2 top-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
          </button>

          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 transition-colors hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={showUserMenu}
              aria-label="User menu"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-sm font-semibold text-white shadow-sm">
                {initials}
              </div>
              <div className="hidden min-w-0 text-left md:block">
                <p className="truncate text-sm font-semibold leading-tight text-slate-900">{displayName}</p>
                <p className="truncate text-xs leading-tight text-slate-500">{roleLabel}</p>
              </div>
              <ChevronDown size={15} className={`hidden text-slate-400 transition-transform md:block ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg slide-up"
                role="menu"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-sm font-semibold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email || 'seller@example.com'}</p>
                  </div>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => { onProfileClick?.(); setShowUserMenu(false) }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    role="menuitem"
                  >
                    <User size={16} className="text-slate-400" />
                    Profile &amp; settings
                  </button>
                  <button
                    onClick={() => { onLogout(); setShowUserMenu(false) }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
