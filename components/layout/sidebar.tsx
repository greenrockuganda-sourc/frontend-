'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  FileText,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Package, label: 'Products', href: '/products' },
  { icon: ShoppingCart, label: 'Inventory', href: '/inventory' },
  { icon: ShoppingCart, label: 'Orders', href: '/orders' },
  { icon: Truck, label: 'Deliveries', href: '/deliveries' },
  { icon: FileText, label: 'Receipts', href: '/receipts' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      <aside className="hidden w-72 flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-xl md:flex">
        <div className="border-b border-slate-200/80 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-500 shadow-[0_18px_32px_-16px_rgba(99,102,241,0.9)]">
              <span className="text-base font-bold text-white">SA</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900">Seller Admin</h1>
              <p className="text-xs text-slate-500">Management</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          </div>
          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_18px_30px_-18px_rgba(99,102,241,0.9)]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200/80 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
            <p className="mt-2 text-sm font-medium text-slate-700">All systems online</p>
          </div>
          <p className="mt-4 text-xs text-slate-400">v1.0.0</p>
        </div>
      </aside>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-transform duration-200 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-500 shadow-[0_18px_32px_-16px_rgba(99,102,241,0.9)]">
              <span className="text-base font-bold text-white">SA</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900">Seller Admin</h1>
              <p className="text-xs text-slate-500">Management</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} onClick={onClose}>
                  <button
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_18px_30px_-18px_rgba(99,102,241,0.9)]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              )
            })}
          </div>
        </nav>
      </aside>
    </>
  )
}
