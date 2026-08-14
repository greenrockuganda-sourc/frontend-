'use client'

import { useEffect, useState } from 'react'
import { Product } from '@/lib/types'
import { productsApi, categoriesApi, brandsApi } from '@/lib/api'
import { cloudinaryService } from '../../lib/cloudinary-service'
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
  const [formImageFiles, setFormImageFiles] = useState<File[]>([])
  const [formImagePreviews, setFormImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState<number[]>([])
  const [imageUploadErrors, setImageUploadErrors] = useState<string[]>([])
  const [showBrandForm, setShowBrandForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => setCategories([]))
    brandsApi.getAll().then(setBrands).catch(() => setBrands([]))
  }, [])

  useEffect(() => {
    return () => {
      formImagePreviews.forEach((p) => {
        try { URL.revokeObjectURL(p) } catch { /* ignore */ }
      })
    }
  }, [formImagePreviews])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      // upload images first (if any)
      let imageUrls: string[] = []
      if (formImageFiles.length > 0) {
        setUploadingImages(true)
        const filesToUpload = formImageFiles.slice(0, 4)
        setImageUploadProgress(new Array(filesToUpload.length).fill(0))
        setImageUploadErrors(new Array(filesToUpload.length).fill(''))
        try {
          const responses = await cloudinaryService.uploadMultiple(filesToUpload, 'seller-admin/products')
          imageUrls = responses.map((r) => r.secure_url || r.url).filter(Boolean) as string[]
        } catch (bulkErr) {
          // fallback: try sequential uploads
          const results: (string | null)[] = new Array(filesToUpload.length).fill(null)
          for (let i = 0; i < filesToUpload.length; i++) {
            try {
              // simple single-file upload using uploadImage which reports its own errors
              // eslint-disable-next-line no-await-in-loop
              const resp = await cloudinaryService.uploadImage(filesToUpload[i], 'seller-admin/products')
              results[i] = cloudinaryService.getSecureUrl(resp)
              setImageUploadErrors((prev) => { const next = prev.slice(); next[i] = ''; return next })
            } catch (err) {
              setImageUploadErrors((prev) => { const next = prev.slice(); next[i] = String(err); return next })
            }
          }
          imageUrls = results.filter(Boolean) as string[]
        } finally {
          setUploadingImages(false)
        }
      }

      const productPayload: any = { ...formData }
      if (imageUrls.length > 0) {
        productPayload.images = imageUrls
        productPayload.image_urls = imageUrls
        productPayload.image_url = imageUrls[0] || undefined
        productPayload.image_url_2 = imageUrls[1] || undefined
        productPayload.image_url_3 = imageUrls[2] || undefined
        productPayload.image_url_4 = imageUrls[3] || undefined
      }

      if (product) {
        await productsApi.update(product.id, productPayload)
      } else {
        await productsApi.create(productPayload as any)
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
                    <option key={c.id} value={c.id}>{c.category_name}</option>
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
                    <option key={b.id} value={b.id}>{b.brand_name}</option>
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

          <div className="mt-4">
            <label className="text-sm font-medium text-foreground">Upload images (up to 4)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : []
                const chosen = files.slice(0, 4)
                formImagePreviews.forEach((p) => URL.revokeObjectURL(p))
                const previews = chosen.map((f) => URL.createObjectURL(f))
                setFormImageFiles(chosen)
                setFormImagePreviews(previews)
                setImageUploadProgress(new Array(previews.length).fill(0))
                setImageUploadErrors(new Array(previews.length).fill(''))
              }}
              className="mt-1 block w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground"
            />
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {formImagePreviews.slice(0, 4).map((preview, idx) => (
                <div key={preview} className="flex flex-col items-center gap-1">
                  <img src={preview} alt={`preview-${idx}`} className="h-20 w-20 rounded-xl object-cover shadow-sm" />
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600" style={{ width: `${imageUploadProgress[idx] ?? 0}%` }} />
                  </div>
                  <div className="text-xs text-slate-600">{imageUploadProgress[idx] ?? 0}%</div>
                  {imageUploadErrors[idx] ? (
                    <div className="text-center text-xs text-indigo-600">
                      <div className="max-w-[80px] truncate">{imageUploadErrors[idx]}</div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {uploadingImages && <p className="mt-2 text-sm text-slate-500">Uploading images... ({imageUploadProgress.length ? Math.round(imageUploadProgress.reduce((a,b)=>a+b,0)/imageUploadProgress.length) : 0}% avg)</p>}
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
            <BrandForm onDone={(b) => { setBrands((prev) => [b, ...prev]); setShowBrandForm(false); setFormData({ ...formData, brand: b.id }) }} onClose={() => setShowBrandForm(false)} />
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card p-4 rounded max-w-md w-full">
            <CategoryForm onDone={(c) => { setCategories((prev) => [c, ...prev]); setShowCategoryForm(false); setFormData({ ...formData, category: c.id }) }} onClose={() => setShowCategoryForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
