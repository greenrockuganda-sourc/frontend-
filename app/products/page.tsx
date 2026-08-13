'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { Product } from '../../lib/types'
import { productsApi } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
import { ProductForm } from '../../components/products/product-form'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

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
    if (!confirm('Are you sure?')) return
    try {
      await productsApi.delete(id)
      setProducts(products.filter(p => p.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700">
                Catalog overview
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Products</h1>
              <p className="mt-2 text-sm text-slate-500">Manage your inventory and product catalog</p>
            </div>
            <Button onClick={() => { setEditingProduct(null); setShowForm(true) }} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-95">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {showForm && (
          <ProductForm
            product={editingProduct}
            onClose={() => { setShowForm(false); setEditingProduct(null) }}
            onSave={() => { fetchProducts(); setShowForm(false); setEditingProduct(null) }}
          />
        )}

        <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/80 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <p className="text-slate-500">No products yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Name</th>
                    <th className="px-6 py-3 text-left font-medium">SKU</th>
                    <th className="px-6 py-3 text-right font-medium">Price</th>
                    <th className="px-6 py-3 text-right font-medium">Stock</th>
                    <th className="px-6 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                      <td className="px-6 py-4 text-slate-500">{product.sku}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">${product.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={product.quantity < 20 ? 'font-semibold text-amber-600' : 'font-semibold text-emerald-600'}>
                          {product.quantity}
                        </span>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
