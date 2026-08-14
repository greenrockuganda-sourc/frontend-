import { Inbox } from 'lucide-react'
import { Order } from '@/types'

interface RecentOrdersProps {
  orders: Order[]
  loading?: boolean
}

const statusStyles: Record<string, string> = {
  delivered: 'badge badge-success',
  completed: 'badge badge-success',
  pending: 'badge badge-warning',
  processing: 'badge badge-info',
  shipped: 'badge badge-info',
  cancelled: 'badge badge-danger',
}

export default function RecentOrders({ orders, loading }: RecentOrdersProps) {
  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <p className="card-title">Recent Orders</p>
        </div>
        <div className="space-y-3 p-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="min-w-0">
          <p className="card-title">Recent Orders</p>
          <p className="card-subtitle">Latest activity from your storefront</p>
        </div>
        <span className="badge badge-neutral flex-shrink-0">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Inbox size={22} />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-900">No orders yet</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Orders placed in the selected period will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="responsive-table w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left sm:px-5">Order ID</th>
                <th className="px-4 py-3 text-left sm:px-5">Customer</th>
                <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                <th className="px-4 py-3 text-left sm:px-5">Status</th>
                <th className="px-4 py-3 text-left sm:px-5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td data-label="Order ID" className="px-4 py-3.5 text-sm font-semibold text-blue-600 sm:px-5">
                    {order.id}
                  </td>
                  <td data-label="Customer" className="px-4 py-3.5 text-sm font-medium text-slate-800 sm:px-5">
                    {order.customer}
                  </td>
                  <td data-label="Amount" className="tabular px-4 py-3.5 text-sm font-semibold text-slate-900 sm:px-5 md:text-right">
                    UGX {order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td data-label="Status" className="px-4 py-3.5 text-sm sm:px-5">
                    <span className={statusStyles[order.status] || 'badge badge-neutral'}>
                      <span className="badge-dot" />
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td data-label="Date" className="tabular px-4 py-3.5 text-sm text-slate-500 sm:px-5">
                    {order.date || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
