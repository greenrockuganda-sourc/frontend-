import { useEffect, useMemo, useState } from 'react'
import { DollarSign, ShoppingCart, Truck, AlertCircle, CalendarDays, RefreshCw, Receipt, TrendingUp } from 'lucide-react'
import StatCard from '@/components/StatCard'
import RecentOrders from '@/components/RecentOrders'
import InventoryStatus from '@/components/InventoryStatus'
import { fetchDashboard, fetchProducts, fetchOrders, fetchDeliveries } from '@/lib/api'
import { Order, Product } from '@/types'
import Skeleton, { SkeletonStats, SkeletonTable } from '@/components/Skeleton'

const validRanges = ['7d', '30d', '90d', 'all'] as const

type RangeKey = (typeof validRanges)[number]

const getRangeStartDate = (range: RangeKey) => {
  if (range === 'all') return null
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
}

const normalizeRangeValue = (raw?: string | null): RangeKey => {
  if (!raw) return '7d'
  const v = String(raw).toLowerCase().trim()
  if (v === '7' || v === '7d' || v === '7days' || v === '7day' || v === 'last7') return '7d'
  if (v === '30' || v === '30d' || v === '30days' || v === '30day' || v === 'last30') return '30d'
  if (v === '90' || v === '90d' || v === '90days' || v === '90day' || v === 'last90') return '90d'
  if (v === 'all' || v === 'alltime' || v === 'lifetime') return 'all'
  return '7d'
}

const readDashboardRangeFromUrl = (): RangeKey => {
  if (typeof window === 'undefined') return '7d'
  const params = new URLSearchParams(window.location.search)
  const value = params.get('dashboardRange')
  return normalizeRangeValue(value)
}

const formatCurrency = (amount: number) =>
  `UGX ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface DashboardProps {
  user?: any
}

export default function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    pending: 0,
    lowStock: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [inventory, setInventory] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>(readDashboardRangeFromUrl)
  const [isMobileView, setIsMobileView] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const dateRangeLabel = useMemo(() => {
    switch (range) {
      case '7d': return 'Last 7 days'
      case '30d': return 'Last 30 days'
      case '90d': return 'Last 90 days'
      default: return 'All time'
    }
  }, [range])

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError(null)

        const [dashboardData, productsData, ordersData, deliveriesData] = await Promise.all([
          fetchDashboard(),
          fetchProducts(),
          fetchOrders(),
          fetchDeliveries(),
        ])
        if (!active) {
          return
        }

        const summary = dashboardData?.summary ?? {}
        const productList = Array.isArray(productsData?.results)
          ? productsData.results
          : Array.isArray(productsData)
            ? productsData
            : []
        const orderList = Array.isArray(ordersData?.results)
          ? ordersData.results
          : Array.isArray(ordersData)
            ? ordersData
            : []
        const deliveryList = Array.isArray(deliveriesData?.results)
          ? deliveriesData.results
          : Array.isArray(deliveriesData)
            ? deliveriesData
            : []

        const rangeStart = getRangeStartDate(range)
        const filteredOrdersForRange = orderList.filter((order: any) => {
          if (!rangeStart) return true
          const dateValue = order.created_at ?? order.date ?? order.order_date ?? ''
          const orderDate = new Date(dateValue)
          return !Number.isNaN(orderDate.getTime()) && orderDate >= rangeStart
        })
        const revenueFromOrders = filteredOrdersForRange.reduce((sum: number, order: any) => sum + Number(order.total_amount ?? order.amount ?? 0), 0)
        const lowStockFromProducts = productList.filter((product: any) => {
          const stock = Number(product.stock ?? product.quantity_in_stock ?? 0)
          const reorderLevel = Number(product.reorder_level ?? product.reorderLevel ?? 0)
          return stock <= reorderLevel || stock <= 0
        }).length
        const pendingDeliveriesFromData = deliveryList.filter((delivery: any) => {
          const status = String(delivery.delivery_status ?? delivery.status ?? '').toLowerCase()
          return status === 'preparing' || status === 'pending' || status === 'in progress'
        }).length
        const pendingOrdersFromData = filteredOrdersForRange.filter((order: any) => String(order.order_status ?? order.status ?? '').toLowerCase() === 'pending').length

        const revenue = summary.revenue_today != null
          ? Number(summary.revenue_today)
          : (summary.revenue_this_week != null
            ? Number(summary.revenue_this_week)
            : (summary.revenue_this_month != null
              ? Number(summary.revenue_this_month)
              : revenueFromOrders))
        const pending = summary.pending_deliveries != null
          ? Number(summary.pending_deliveries)
          : (summary.pending_orders != null
            ? Number(summary.pending_orders)
            : pendingDeliveriesFromData || pendingOrdersFromData)
        const lowStock = summary.low_stock_products != null
          ? Number(summary.low_stock_products)
          : lowStockFromProducts

        setStats({
          revenue,
          orders: Number(summary.total_orders ?? orderList.length ?? 0),
          pending,
          lowStock,
        })

        const recentOrdersRaw = dashboardData?.recent_activity?.recent_orders
        const normalizedOrders = (Array.isArray(recentOrdersRaw) ? recentOrdersRaw : []).map((order: any) => ({
          id: order.order_number ?? order.id ?? 'N/A',
          customer: order.customer ?? 'Guest',
          amount: Number(order.total_amount ?? order.amount ?? 0),
          status: (order.order_status ?? order.status ?? 'pending').toLowerCase(),
          date: order.created_at?.slice(0, 10) ?? order.date ?? '',
        }))
        const filteredRecentOrders = rangeStart
          ? normalizedOrders.filter((order: any) => {
              const dateValue = order.date
              const orderDate = new Date(dateValue)
              return !Number.isNaN(orderDate.getTime()) && orderDate >= rangeStart
            })
          : normalizedOrders
        setRecentOrders(filteredRecentOrders)

        const normalizedProducts = productList.map((product: any) => {
          const categoryString = product.category?.category_name ?? product.category?.name ?? (typeof product.category === 'string' ? product.category : '')
          return {
            id: String(product.id ?? product.product_id ?? product.sku ?? ''),
            name: product.name ?? product.product_name ?? 'Unnamed product',
            sku: product.sku ?? product.barcode ?? '',
            price: Number(product.price ?? product.selling_price ?? 0),
            stock: Number(product.stock ?? product.quantity_in_stock ?? 0),
            category: categoryString || 'Uncategorized',
            reorderLevel: Number(product.reorder_level ?? product.reorderLevel ?? 0),
          }
        })
        setInventory(normalizedProducts)
        setLastUpdated(new Date())
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load dashboard data.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    const refreshTimer = window.setInterval(() => {
      void loadDashboard()
    }, 15000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadDashboard()
      }
    }

    window.addEventListener('focus', handleVisibilityChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', handleVisibilityChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [range])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('dashboardRange', range)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [range])

  useEffect(() => {
    const updateIsMobileView = () => {
      setIsMobileView(window.innerWidth < 1024)
    }

    updateIsMobileView()
    window.addEventListener('resize', updateIsMobileView)

    return () => {
      window.removeEventListener('resize', updateIsMobileView)
    }
  }, [])

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'there'
  const rangeRevenue = recentOrders.reduce((sum, order) => sum + order.amount, 0)
  const averageOrder = recentOrders.length ? rangeRevenue / recentOrders.length : 0

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="eyebrow">Overview</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Welcome back, {firstName}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Here is what is happening with your store right now.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {lastUpdated && (
            <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <div className="relative flex-1 sm:flex-none">
            <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as '7d' | '30d' | '90d' | 'all')}
              className="select !pl-9 sm:!w-[190px]"
              aria-label="Date range"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={17} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <>
          <div className="mb-6">
            <SkeletonStats />
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <div className="card p-5">
                <Skeleton height={20} width="40%" className="mb-4" />
                <SkeletonTable rows={5} columns={4} />
              </div>
            </div>
            <div className="xl:col-span-1">
              <div className="card p-5">
                <Skeleton height={20} width="60%" className="mb-4" />
                <SkeletonTable rows={5} columns={2} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Primary KPIs */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.revenue)}
              icon={<DollarSign size={20} />}
              change="Live from the API"
              trend="up"
              color="blue"
            />
            <StatCard
              title="Total Orders"
              value={stats.orders.toLocaleString()}
              icon={<ShoppingCart size={20} />}
              change="Updated now"
              trend="up"
              color="emerald"
            />
            <StatCard
              title="Pending Deliveries"
              value={stats.pending.toLocaleString()}
              icon={<Truck size={20} />}
              change="In progress"
              trend="down"
              color="amber"
            />
            <StatCard
              title="Low Stock Items"
              value={stats.lowStock.toLocaleString()}
              icon={<AlertCircle size={20} />}
              change="Needs attention"
              color="rose"
            />
          </div>

          {/* Range summary */}
          <div className="card mb-6 overflow-hidden">
            <div className="card-header">
              <div className="min-w-0">
                <p className="card-title">Performance summary</p>
                <p className="card-subtitle">Metrics calculated for the selected period</p>
              </div>
              <span className="badge badge-info flex-shrink-0">{dateRangeLabel}</span>
            </div>
            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { label: 'Orders in range', value: recentOrders.length.toLocaleString(), icon: ShoppingCart },
                { label: 'Range revenue', value: formatCurrency(rangeRevenue), icon: TrendingUp },
                { label: 'Average order', value: formatCurrency(averageOrder), icon: Receipt },
              ].map((metric) => {
                const Icon = metric.icon
                return (
                  <div key={metric.label} className="flex items-center gap-3 px-5 py-4">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-500">{metric.label}</p>
                      <p className="tabular mt-0.5 truncate text-lg font-bold text-slate-900">{metric.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detail panels */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RecentOrders orders={recentOrders} loading={loading} />
            </div>

            {isMobileView && (
              <div className="xl:col-span-1">
                <InventoryStatus inventory={inventory} loading={loading} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
