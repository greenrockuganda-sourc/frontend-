import { Order } from '@/types'

interface RecentOrdersProps {
  orders: Order[]
  loading?: boolean
}

const statusColors: Record<string, string> = {
  delivered: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function RecentOrders({ orders, loading }: RecentOrdersProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_18px_32px_-22px_rgba(15,23,42,0.35)] backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-900">Recent Orders</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_18px_32px_-22px_rgba(15,23,42,0.35)] backdrop-blur-sm">
      <div className="border-b border-slate-200/80 p-4 sm:p-6">
        <h3 className="text-lg font-bold tracking-tight text-slate-900">Recent Orders</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="responsive-table w-full">
          <thead className="border-b border-slate-200 bg-slate-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">Order ID</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">Customer</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">Amount</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orders.map(order => (
              <tr key={order.id} className="transition-colors hover:bg-indigo-50/50">
                <td data-label="Order ID" className="px-4 py-4 text-sm font-semibold text-indigo-600 sm:px-6">{order.id}</td>
                <td data-label="Customer" className="px-4 py-4 text-sm text-slate-800 sm:px-6">{order.customer}</td>
                <td data-label="Amount" className="px-4 py-4 text-sm font-semibold text-slate-900 sm:px-6">UGX {order.amount.toFixed(2)}</td>
                <td data-label="Status" className="px-4 py-4 text-sm sm:px-6">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusColors[order.status] || 'bg-slate-100 text-slate-700'}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </td>
                <td data-label="Date" className="px-4 py-4 text-sm text-slate-500 sm:px-6">{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}