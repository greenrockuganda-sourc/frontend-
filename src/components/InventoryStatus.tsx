import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Product } from '@/types'

interface InventoryStatusProps {
  inventory: Product[]
  loading?: boolean
  onViewAll?: () => void
}

const MAX_VISIBLE_ITEMS = 8

/** Same rule as the backend dashboard summary: stock at or below the reorder level. */
export const isLowStock = (product: Product) => product.stock <= (product.reorderLevel ?? 0)

export default function InventoryStatus({ inventory, loading, onViewAll }: InventoryStatusProps) {
  const lowStockItems = inventory
    .filter(isLowStock)
    .sort((a, b) => a.stock - b.stock)
  const visibleItems = lowStockItems.slice(0, MAX_VISIBLE_ITEMS)
  const hiddenCount = lowStockItems.length - visibleItems.length

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <p className="card-title">Low stock</p>
        </div>
        <div className="space-y-3 p-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="card-header">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle size={17} />
          </span>
          <div className="min-w-0">
            <p className="card-title">Low stock</p>
            <p className="card-subtitle">At or below reorder level</p>
          </div>
        </div>
      </div>

      {lowStockItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-900">Inventory looks healthy</p>
          <p className="mt-1 text-sm text-slate-500">No product is at its reorder level.</p>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-slate-100">
            {visibleItems.map(item => {
              const outOfStock = item.stock <= 0
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {item.sku || 'No SKU'} · reorder at {item.reorderLevel ?? 0}
                    </p>
                  </div>
                  <span className={`badge tabular flex-shrink-0 ${outOfStock ? 'badge-danger' : 'badge-warning'}`}>
                    {outOfStock ? 'Out of stock' : `${item.stock} left`}
                  </span>
                </li>
              )
            })}
          </ul>
          {(hiddenCount > 0 || onViewAll) && (
            <div className="border-t border-slate-100 px-5 py-3">
              {onViewAll ? (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="inline-flex min-h-0 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  {hiddenCount > 0 ? `View all ${lowStockItems.length} in Products` : 'Manage stock in Products'}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <p className="text-xs text-slate-500">+{hiddenCount} more</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
