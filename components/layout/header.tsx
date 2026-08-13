'use client'

import { Menu, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationsPanel } from '@/components/notifications/notifications-panel'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const appVersion = 'v2.1.0'

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden sm:block">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Overview</p>
            <h1 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">Seller Admin</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-700 sm:flex">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
            {appVersion}
          </div>
          <div className="hidden sm:block">
            <NotificationsPanel />
          </div>
          <Button variant="ghost" size="icon" className="hidden sm:flex text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-red-50 hover:text-red-600">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
