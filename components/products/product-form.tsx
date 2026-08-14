'use client'

import { useEffect, useState } from 'react'
import { Product } from '@/lib/types'
import { productsApi, categoriesApi, brandsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import BrandForm from '@/components/products/brand-form'
import CategoryForm from '@/components/products/category-form'

interface ProductFormProps {
  product: Product | null
  onClose: () => void
  onSave: () => void
}

export function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    price: product?.price || 0,
    quantity: product?.quantity || 0,
    category: product?.category || '',
    brand: (product as any)?.brand || '',
    description: product?.description || '',
  })

  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [showBrandForm, setShowBrandForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => setCategories([]))
    brandsApi.getAll().then(setBrands).catch(() => setBrands([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (product) {
        await productsApi.update(product.id, formData)
      } else {
        await productsApi.create(formData as any)
      }
      onSave()
    } catch (err) {
      console.error('Failed to save product:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="text-xl font-bold">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-foreground bg-input"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">SKU</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-foreground bg-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-foreground bg-input"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-foreground bg-input"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-foreground bg-input"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.category_name}>{c.category_name}</option>
                  ))}
                </select>
              </div>
              <button type="button" className="text-sm text-primary underline" onClick={() => setShowCategoryForm(true)}>Add</button>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-foreground">Brand</label>
              <div className="flex items-center gap-2">
                <select
                  value={(formData as any).brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="flex-1 mt-1 px-3 py-2 border border-border rounded-lg text-foreground bg-input"
                >
                  <option value="">Select brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.brand_name}>{b.brand_name}</option>
                  ))}
                </select>
                <button type="button" className="text-sm text-primary underline" onClick={() => setShowBrandForm(true)}>Add</button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-foreground bg-input resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </form>
      </div>
      {showBrandForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card p-4 rounded max-w-md w-full">
            <BrandForm onDone={(b) => { setBrands((prev) => [b, ...prev]); setShowBrandForm(false); setFormData({ ...formData, brand: b.brand_name }) }} onClose={() => setShowBrandForm(false)} />
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card p-4 rounded max-w-md w-full">
            <CategoryForm onDone={(c) => { setCategories((prev) => [c, ...prev]); setShowCategoryForm(false); setFormData({ ...formData, category: c.category_name }) }} onClose={() => setShowCategoryForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
