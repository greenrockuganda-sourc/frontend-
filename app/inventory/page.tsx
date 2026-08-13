'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { Product } from '../../lib/types'
import { productsApi } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { Badge } from '../../components/ui/badge'
import { Plus, Edit, Trash2, AlertTriangle, TrendingDown, TrendingUp, Package } from 'lucide-react'
import { InventoryForm } from '../../components/inventory/inventory-form'
import { InventoryStatsGrid } from '../../components/inventory/inventory-stats-grid'
import { InventoryAlerts } from '../../components/inventory/inventory-alerts'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name')
  const [filterLowStock, setFilterLowStock] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await productsApi.getAll()
      setProducts(data)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await productsApi.delete(id)
      setProducts(products.filter(p => p.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'stock':
        return a.quantity - b.quantity
      case 'value':
        return (b.price * b.quantity) - (a.price * a.quantity)
      default:
        return a.name.localeCompare(b.name)
    }
  })

  const filteredProducts = filterLowStock 
    ? sortedProducts.filter(p => p.quantity < 20)
    : sortedProducts

  const lowStockItems = products.filter(p => p.quantity < 20).length
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
  const outOfStockItems = products.filter(p => p.quantity === 0).length

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'bg-destructive/10 text-destructive' }
    if (quantity < 10) return { label: 'Critical', color: 'bg-orange-500/10 text-orange-600' }
    if (quantity < 20) return { label: 'Low', color: 'bg-yellow-500/10 text-yellow-600' }
    return { label: 'In Stock', color: 'bg-green-500/10 text-green-600' }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700">
                Inventory overview
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inventory Management</h1>
              <p className="mt-2 text-sm text-slate-500">Track and manage your product stock levels</p>
            </div>
            <Button onClick={() => { setEditingProduct(null); setShowForm(true) }} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-95">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        <InventoryStatsGrid
          totalProducts={products.length}
          totalValue={totalInventoryValue}
          lowStockItems={lowStockItems}
          outOfStockItems={outOfStockItems}
        />

        {(lowStockItems > 0 || outOfStockItems > 0) && (
          <InventoryAlerts
            lowStockItems={lowStockItems}
            outOfStockItems={outOfStockItems}
          />
        )}

        {showForm && (
          <InventoryForm
            product={editingProduct}
            onClose={() => { setShowForm(false); setEditingProduct(null) }}
            onSave={() => { fetchProducts(); setShowForm(false); setEditingProduct(null) }}
          />
        )}

        <div className="flex flex-col items-start justify-between gap-4 rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-300"
            >
              <option value="name">Name</option>
              <option value="stock">Stock Level</option>
              <option value="value">Inventory Value</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filterLowStock ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLowStock(!filterLowStock)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {filterLowStock ? 'Showing Low Stock' : 'Show Low Stock'}
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/80 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <p className="text-slate-500">
                {filterLowStock ? 'No low stock items' : 'No products yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium">Product</th>
                    <th className="px-6 py-4 text-left font-medium">SKU</th>
                    <th className="px-6 py-4 text-right font-medium">Price</th>
                    <th className="px-6 py-4 text-right font-medium">Stock</th>
                    <th className="px-6 py-4 text-right font-medium">Value</th>
                    <th className="px-6 py-4 text-center font-medium">Status</th>
                    <th className="px-6 py-4 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product.quantity)
                    const inventoryValue = product.price * product.quantity
                    const isLow = product.quantity < 20
                    const isCritical = product.quantity < 10

                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          isCritical ? 'bg-red-50/60' : isLow ? 'bg-amber-50/60' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            {product.description && (
                              <p className="mt-1 text-xs text-slate-500">{product.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.sku}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">${product.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`font-bold ${
                              product.quantity === 0
                                ? 'text-red-600'
                                : product.quantity < 10
                                  ? 'text-orange-600'
                                  : product.quantity < 20
                                    ? 'text-yellow-600'
                                    : 'text-emerald-600'
                            }`}>
                              {product.quantity}
                            </span>
                            {product.quantity < 20 && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-900">${inventoryValue.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge className={status.color}>{status.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingProduct(product); setShowForm(true) }}
                              className="text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
