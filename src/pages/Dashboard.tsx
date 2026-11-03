import { useEffect, useMemo, useState } from 'react'
import { Wallet, ShoppingCart, Truck, AlertTriangle, RefreshCw, Receipt, Users, Package, Clock, AlertCircle, ChevronRight, Banknote } from 'lucide-react'
import StatCard from '@/components/StatCard'
import RecentOrders from '@/components/RecentOrders'
import InventoryStatus, { isLowStock } from '@/components/InventoryStatus'
import RevenueTrend, { RevenuePoint } from '@/components/RevenueTrend'
import { fetchDashboard, fetchProducts, fetchOrders, fetchDeliveries, fetchCustomers, fetchPayments } from '@/lib/api'
import { Order, Product } from '@/types'
import Skeleton, { SkeletonStats, SkeletonTable } from '@/components/Skeleton'

const validRanges = ['7d', '30d', '90d', 'all'] as const
const DASHBOARD_REFRESH_INTERVAL_MS = 60000
const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_ORDERS_LIMIT = 8

type RangeKey = (typeof validRanges)[number]

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

const getRangeStartDate = (range: RangeKey) => {
  if (range === 'all') return null
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return new Date(now.getTime() - (days - 1) * DAY_MS)
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

const formatCurrency = (amount: number) => `UGX ${Math.round(Number(amount || 0)).toLocaleString()}`

const toList = (data: any): any[] => {
  if (Array.isArray(data?.results)) return data.results
  return Array.isArray(data) ? data : []
}

const ORDER_DATE_KEYS = ['created_at', 'date', 'order_date']
const DELIVERY_DATE_KEYS = ['created_at', 'date', 'delivery_date']
const PAYMENT_DATE_KEYS = ['created_at', 'date', 'payment_date', 'paid_at']

const getRecordDate = (record: any, dateKeys: string[]) => {
  const dateValue = dateKeys.map((key) => record?.[key]).find(Boolean) ?? ''
  const recordDate = new Date(dateValue)
  return Number.isNaN(recordDate.getTime()) ? null : recordDate
}

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

/** Revenue per day for a fixed range, or per month for "All time"; empty periods are zero. */
const buildRevenueSeries = (orders: any[], range: RangeKey, rangeStart: Date | null): RevenuePoint[] => {
  const totals = new Map<string, number>()
  const byMonth = range === 'all'
  for (const order of orders) {
    const date = getRecordDate(order, ORDER_DATE_KEYS)
    if (!date) continue
    const key = byMonth ? monthKey(date) : dayKey(date)
    totals.set(key, (totals.get(key) ?? 0) + Number(order.total_amount ?? order.amount ?? 0))
  }

  const points: RevenuePoint[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!byMonth && rangeStart) {
    for (let time = rangeStart.getTime(); time <= today.getTime(); time += DAY_MS) {
      const date = new Date(time)
      const key = dayKey(date)
      points.push({ key, label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), revenue: totals.get(key) ?? 0 })
    }
    return points
  }

  const keys = Array.from(totals.keys()).sort()
  if (keys.length === 0) return points
  const [firstYear, firstMonth] = keys[0].split('-').map(Number)
  const cursor = new Date(firstYear, firstMonth - 1, 1)
  while (cursor <= today) {
    const key = monthKey(cursor)
    points.push({ key, label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), revenue: totals.get(key) ?? 0 })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return points
}

interface DashboardData {
  summary: any
  orders: any[]
  deliveries: any[]
  payments: any[]
  customerCount: number
  products: Product[]
}

interface DashboardProps {
  user?: any
  token?: string
  onNavigate?: (page: string) => void
}

export default function Dashboard({ user, token, onNavigate }: DashboardProps) {
  const activeToken = token ?? (typeof window !== 'undefined' ? localStorage.getItem('access') ?? '' : '')

  const [data, setData] = useState<DashboardData | null>(null)
  const [refreshing, setRefreshing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>(readDashboardRangeFromUrl)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Load everything once and refresh in the background; changing the range
  // only re-filters what is already loaded instead of refetching it.
  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        setRefreshing(true)
        setError(null)

        const [dashboardData, productsData, ordersData, deliveriesData, customersData, paymentsData] = await Promise.all([
          fetchDashboard(activeToken),
          fetchProducts(activeToken),
          fetchOrders(activeToken),
          fetchDeliveries(activeToken),
          fetchCustomers(activeToken),
          fetchPayments(activeToken),
        ])
        if (!active) return

        const summary = dashboardData?.summary ?? {}
        const customerList = toList(customersData)

        const products: Product[] = toList(productsData).map((product: any) => {
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

        setData({
          summary,
          orders: toList(ordersData),
          deliveries: toList(deliveriesData),
          payments: toList(paymentsData),
          customerCount: customerList.length || Number(summary.total_customers ?? 0),
          products,
        })
        setLastUpdated(new Date())
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load dashboard data.')
        }
      } finally {
        if (active) setRefreshing(false)
      }
    }

    void loadDashboard()

    const refreshTimer = window.setInterval(() => {
      void loadDashboard()
    }, DASHBOARD_REFRESH_INTERVAL_MS)

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
  }, [activeToken])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('dashboardRange', range)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [range])

  const view = useMemo(() => {
    if (!data) return null
    const rangeStart = getRangeStartDate(range)
    const inRange = (record: any, dateKeys: string[]) => {
      if (!rangeStart) return true
      const date = getRecordDate(record, dateKeys)
      return date !== null && date >= rangeStart
    }

    const orders = data.orders.filter((order) => inRange(order, ORDER_DATE_KEYS))
    const deliveries = data.deliveries.filter((delivery) => inRange(delivery, DELIVERY_DATE_KEYS))
    const payments = data.payments.filter((payment) => inRange(payment, PAYMENT_DATE_KEYS))

    const revenue = orders.reduce((sum, order) => sum + Number(order.total_amount ?? order.amount ?? 0), 0)
    const paymentsTotal = payments.reduce((sum, payment) => sum + Number(payment.amount ?? payment.total_amount ?? payment.value ?? 0), 0)
    const pendingOrders = orders.filter((order) => String(order.order_status ?? order.status ?? '').toLowerCase() === 'pending').length
    const pendingDeliveries = deliveries.filter((delivery) => {
      const status = String(delivery.delivery_status ?? delivery.status ?? '').toLowerCase()
      return status === 'preparing' || status === 'pending' || status === 'in progress'
    }).length
    const lowStock = data.summary.low_stock_products != null
      ? Number(data.summary.low_stock_products)
      : data.products.filter(isLowStock).length

    // The dashboard endpoint only returns a small activity preview, so recent
    // orders come from the full order list for the selected period.
    const recentOrders: Order[] = [...orders]
      .sort((a, b) => (getRecordDate(b, ORDER_DATE_KEYS)?.getTime() ?? 0) - (getRecordDate(a, ORDER_DATE_KEYS)?.getTime() ?? 0))
      .slice(0, RECENT_ORDERS_LIMIT)
      .map((order: any) => ({
        id: order.order_number ?? order.id ?? 'N/A',
        customer: order.customer ?? order.customer_name ?? '—',
        amount: Number(order.total_amount ?? order.amount ?? 0),
        status: (order.order_status ?? order.status ?? 'pending').toLowerCase(),
        date: order.created_at?.slice(0, 10) ?? order.order_date?.slice(0, 10) ?? order.date ?? '',
      }))

    return {
      revenue,
      orderCount: orders.length,
      averageOrder: orders.length ? revenue / orders.length : 0,
      paymentsTotal,
      pendingOrders,
      pendingDeliveries,
      lowStock,
      recentOrders,
      revenueSeries: buildRevenueSeries(orders, range, rangeStart),
    }
  }, [data, range])

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'there'
  const rangeLabel = RANGE_LABELS[range]
  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const attentionItems = view && data ? [
    { label: 'Pending orders', value: view.pendingOrders, hint: rangeLabel, icon: Clock, tone: 'bg-amber-50 text-amber-600', page: 'orders' },
    { label: 'Deliveries in preparation', value: view.pendingDeliveries, hint: rangeLabel, icon: Truck, tone: 'bg-blue-50 text-blue-700', page: 'deliveries' },
    { label: 'Low stock products', value: view.lowStock, hint: 'At or below reorder level', icon: AlertTriangle, tone: 'bg-rose-50 text-rose-600', page: 'products' },
    { label: 'Customers', value: data.customerCount, hint: 'All time', icon: Users, tone: 'bg-emerald-50 text-emerald-600', page: 'customers' },
    { label: 'Products in catalog', value: data.products.length, hint: 'All time', icon: Package, tone: 'bg-slate-100 text-slate-600', page: 'products' },
  ] : []

  return (
    <div className="page-container">
      {/* Hero */}
      <section className="hero-panel mb-6 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-400">Store overview</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {greeting}, {firstName}
            </p>
            <p className="mt-1.5 text-sm text-slate-300">
              Sales, fulfilment and inventory for <span className="font-semibold text-white">{rangeLabel.toLowerCase()}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lastUpdated && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur" role="group" aria-label="Date range">
              {validRanges.map((option) => {
                const isActive = range === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRange(option)}
                    aria-pressed={isActive}
                    className={`min-h-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                      isActive ? 'bg-white text-[#001c44] shadow-sm' : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {option === 'all' ? 'All' : option}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={17} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!view || !data ? (
        refreshing ? (
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
              <div className="card p-5">
                <Skeleton height={20} width="60%" className="mb-4" />
                <SkeletonTable rows={5} columns={2} />
              </div>
            </div>
          </>
        ) : null
      ) : (
        <>
          {/* Sales KPIs for the selected range */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Revenue" value={formatCurrency(view.revenue)} icon={<Wallet size={19} />} change="From orders placed" color="blue" />
            <StatCard title="Orders" value={view.orderCount.toLocaleString()} icon={<ShoppingCart size={19} />} change="Placed in this period" color="orange" onClick={onNavigate ? () => onNavigate('orders') : undefined} />
            <StatCard title="Average order" value={formatCurrency(view.averageOrder)} icon={<Receipt size={19} />} change="Revenue ÷ orders" color="emerald" />
            <StatCard title="Payments received" value={formatCurrency(view.paymentsTotal)} icon={<Banknote size={19} />} change="Recorded payments" color="slate" />
          </div>

          {/* Trend + operational status */}
          <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RevenueTrend points={view.revenueSeries} rangeLabel={rangeLabel} />
            </div>

            <div className="card overflow-hidden">
              <div className="card-header">
                <div className="min-w-0">
                  <p className="card-title">Store at a glance</p>
                  <p className="card-subtitle">What needs your attention</p>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {attentionItems.map((item) => {
                  const Icon = item.icon
                  const content = (
                    <>
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{item.label}</span>
                        <span className="block truncate text-xs text-slate-500">{item.hint}</span>
                      </span>
                      <span className="tabular text-lg font-bold text-slate-900">{item.value.toLocaleString()}</span>
                      {onNavigate && <ChevronRight size={16} className="flex-shrink-0 text-slate-300" />}
                    </>
                  )
                  return (
                    <li key={item.label}>
                      {onNavigate ? (
                        <button
                          type="button"
                          onClick={() => onNavigate(item.page)}
                          className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50"
                        >
                          {content}
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 px-5 py-3">{content}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Detail panels */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RecentOrders
                orders={view.recentOrders}
                onViewAll={onNavigate ? () => onNavigate('orders') : undefined}
              />
            </div>
            <InventoryStatus
              inventory={data.products}
              onViewAll={onNavigate ? () => onNavigate('products') : undefined}
            />
          </div>
        </>
      )}
    </div>
  )
}
