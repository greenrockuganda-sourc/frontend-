import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Product } from '@/types'

interface InventoryStatusProps {
  inventory: Product[]
  loading?: boolean
}

export default function InventoryStatus({ inventory, loading }: InventoryStatusProps) {
  const lowStockItems = inventory.filter(p => p.stock < 10)

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <p className="card-title">Low Stock Items</p>
        </div>
        <div className="space-y-3 p-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0">
            <p className="card-title">Low Stock Items</p>
            <p className="card-subtitle">Below 10 units in inventory</p>
          </div>
        </div>
        {lowStockItems.length > 0 && (
          <span className="badge badge-warning flex-shrink-0">{lowStockItems.length}</span>
        )}
      </div>

      {lowStockItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-900">Inventory looks healthy</p>
          <p className="mt-1 text-sm text-slate-500">All items are well stocked.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {lowStockItems.map(item => {
            const critical = item.stock <= 3
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="truncate text-xs text-slate-500">{item.sku || 'No SKU'}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className={`tabular text-base font-bold ${critical ? 'text-rose-600' : 'text-amber-600'}`}>
                      {item.stock}
                    </p>
                    <p className="text-[0.6875rem] text-slate-400">units</p>
                  </div>
                  <span className={`badge ${critical ? 'badge-danger' : 'badge-warning'}`}>
                    {critical ? 'Critical' : 'Low'}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
