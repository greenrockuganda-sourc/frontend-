'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CircleDollarSign,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react'
import { dashboardApi, ordersApi } from '@/lib/api'
import { DashboardStats, Order } from '@/lib/types'

const revenueBars = [42, 58, 46, 72, 67, 88, 62, 94, 79, 96, 74, 84]

const statusStyles: Record<Order['status'], string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  confirmed: 'bg-blue-500/10 text-blue-600',
  shipped: 'bg-violet-500/10 text-violet-600',
  delivered: 'bg-emerald-500/10 text-emerald-600',
  cancelled: 'bg-red-500/10 text-red-600',
}

const statusLabel: Record<Order['status'], string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        const [statsData, ordersData] = await Promise.all([
          dashboardApi.getStats(),
          ordersApi.getAll(),
        ])

        setStats(statsData)
        setOrders(ordersData.slice(0, 5))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    void fetchDashboard()
  }, [])

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        <p className="font-medium">{error}</p>
      </div>
    )
  }

  const metrics = [
    {
      title: 'Total revenue',
      value: stats ? `$${stats.totalRevenue.toLocaleString()}` : '$0',
      change: '+18.4%',
      tone: 'violet',
      icon: CircleDollarSign,
    },
    {
      title: 'Total orders',
      value: String(stats?.totalOrders ?? 0),
      change: '+12.6%',
      tone: 'blue',
      icon: ShoppingBag,
    },
    {
      title: 'Deliveries',
      value: String(stats?.pendingDeliveries ?? 0),
      change: '+8.2%',
      tone: 'teal',
      icon: Truck,
    },
    {
      title: 'Stock alerts',
      value: String(stats?.lowStockItems ?? 0),
      change: '-4.8%',
      tone: 'amber',
      icon: AlertTriangle,
    },
  ] as const

  const inventoryHealth = Math.max(0, Math.min(100, 72))

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.8)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-indigo-100 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Your store at a glance
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Overview</h1>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur-sm">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Sales up 18.4% this month
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ title, value, change, tone, icon: Icon }) => (
          <article
            key={title}
            className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br ${
              tone === 'violet'
                ? 'from-[#5b5de8] to-[#7c6ef2]'
                : tone === 'blue'
                  ? 'from-[#1a73c9] to-[#49a6dc]'
                  : tone === 'teal'
                    ? 'from-[#178d86] to-[#51c4b4]'
                    : 'from-[#d28b3d] to-[#eba35d]'
            } p-5 text-white shadow-[0_18px_40px_-20px_rgba(45,40,90,0.7)]`}
          >
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{title}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{loading ? '...' : value}</p>
              </div>
              <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="relative mt-5 flex items-center gap-1.5 text-xs font-medium text-white/85">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {change}
              <span className="font-normal text-white/60">vs last month</span>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_320px]">
        <article className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Revenue overview</h2>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  +18.4%
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Performance across the last 12 periods</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-200" />
                Orders
              </span>
            </div>
          </div>

          <div className="mt-8 flex items-end gap-2 sm:gap-3">
            {revenueBars.map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end justify-center">
                  <div
                    className="w-full rounded-t-[12px] bg-indigo-100"
                    style={{ height: `${Math.max(height - 12, 24)}%` }}
                  />
                  <div
                    className="w-full rounded-t-[12px] bg-gradient-to-t from-indigo-600 to-indigo-400"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  {index % 3 === 0 ? ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'][Math.floor(index / 2)] : ''}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
            <div>
              <p className="text-xs text-slate-500">Average daily revenue</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">$1,609.67</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Compared to last period</p>
              <p className="mt-1 flex items-center justify-end gap-1 text-sm font-semibold text-emerald-600">
                <ArrowUpRight className="h-4 w-4" />
                $7,460.20
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Inventory health</h2>
              <p className="mt-1 text-sm text-slate-500">Stock levels across the catalog</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-6">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#22c55e 0 ${inventoryHealth}%, #e2e8f0 ${inventoryHealth}% 100%)`,
              }}
            >
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-2xl font-semibold text-slate-900">{inventoryHealth}%</span>
                <span className="text-[10px] text-slate-500">Healthy</span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats?.lowStockItems ?? 0}</p>
                <p className="text-xs text-slate-500">Items need attention</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{stats?.pendingDeliveries ?? 0}</p>
                <p className="text-xs text-slate-500">Pending shipments</p>
              </div>
            </div>
          </div>

          <div className="mt-7 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Inventory value</span>
              <span className="font-semibold text-slate-900">${(stats?.inventoryValue ?? 0).toLocaleString()}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${inventoryHealth}%` }} />
            </div>
            <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/15">
              Review inventory
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>

      <section className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Recent orders</h2>
            <p className="mt-1 text-sm text-slate-500">Latest transactions across your storefront</p>
          </div>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all</button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-3 pr-4 font-medium">Order</th>
                <th className="py-3 pr-4 font-medium">Customer</th>
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 font-medium">Amount</th>
                <th className="py-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-b border-slate-200/80">
                      <td className="py-4 pr-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="py-4 pr-4">
                        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="py-4 pr-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="py-4 pr-4">
                        <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="py-4 pr-4">
                        <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
                      </td>
                    </tr>
                  ))
                : orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-200/80 last:border-b-0">
                      <td className="py-4 pr-4 font-semibold text-slate-900">{order.orderNumber}</td>
                      <td className="py-4 pr-4">
                        <div className="font-medium text-slate-800">{order.customerName}</div>
                        <div className="text-xs text-slate-500">{order.items[0]?.productName ?? 'Order item'}</div>
                      </td>
                      <td className="py-4 pr-4 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 pr-4 font-semibold text-slate-900">${order.total.toFixed(2)}</td>
                      <td className="py-4 pr-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[order.status]}`}>
                          {statusLabel[order.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
