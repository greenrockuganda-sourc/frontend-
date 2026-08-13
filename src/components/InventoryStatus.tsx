import { AlertCircle } from 'lucide-react'
import { Product } from '@/types'

interface InventoryStatusProps {
  inventory: Product[]
  loading?: boolean
}

export default function InventoryStatus({ inventory, loading }: InventoryStatusProps) {
  const lowStockItems = inventory.filter(p => p.stock < 10)

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_18px_32px_-22px_rgba(15,23,42,0.35)] backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-900">Low Stock Items</h3>
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
      <div className="border-b border-slate-200/80 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
            <AlertCircle size={18} />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-slate-900">Low Stock Items</h3>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {lowStockItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">All items are well stocked</p>
        ) : (
          lowStockItems.map(item => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{item.sku}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-bold text-amber-600">{item.stock}</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">units</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
