import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, PackageOpen, Filter, X, Download } from 'lucide-react'
import { fetchProducts, getCategories, getBrands, createProduct, updateProduct, deleteProduct } from '@/lib/api'
import { Product, Category, Brand } from '@/types'
import { notifyError, notifySuccess } from '@/lib/notify'
import ConfirmationModal from '@/components/ConfirmationModal'
import { SkeletonTable } from '@/components/Skeleton'
import ErrorMessage from '@/components/ErrorMessage'
import { cloudinaryService } from '../../lib/cloudinary-service'

interface ProductsProps {
  token: string
}

export default function Products({ token }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState<number | ''>('')
  const [formStock, setFormStock] = useState<number | ''>('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formBrandId, setFormBrandId] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCostPrice, setFormCostPrice] = useState<number | ''>('')
  const [formReorderLevel, setFormReorderLevel] = useState<number | ''>('')
  const [formImageFiles, setFormImageFiles] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [formImagePreviews, setFormImagePreviews] = useState<string[]>([])
  const [imageUploadProgress, setImageUploadProgress] = useState<number[]>([])
  const [imageUploadErrors, setImageUploadErrors] = useState<string[]>([])
  const [formStatus, setFormStatus] = useState<'Available' | 'Out of Stock'>('Available')
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [visibleProducts, setVisibleProducts] = useState(25)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  const filteredProducts = useMemo(() => {
    let filtered = products

    if (categoryFilter) {
      filtered = filtered.filter((p) => p.category === categories.find(c => c.id === categoryFilter)?.category_name)
    }

    if (brandFilter) {
      filtered = filtered.filter((p) => {
        const brand = brands.find(b => b.id === brandFilter)
        return brand && p.name?.toLowerCase().includes(brand.brand_name.toLowerCase())
      })
    }

    if (stockFilter === 'low') {
      filtered = filtered.filter((p) => p.stock > 0 && p.stock <= 10)
    } else if (stockFilter === 'out') {
      filtered = filtered.filter((p) => p.stock === 0)
    } else if (stockFilter === 'available') {
      filtered = filtered.filter((p) => p.stock > 10)
    }

    return filtered
  }, [products, categoryFilter, brandFilter, stockFilter, categories, brands])

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setVisibleProducts(25)
    }, 400)
    return () => {
      window.clearTimeout(handler)
    }
  }, [searchTerm])

  useEffect(() => {
    let active = true

    const loadProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchProducts(token, debouncedSearch)
        if (!active) {
          return
        }

        const productsArray = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : []

        const normalizedProducts = productsArray.map((product: any) => {
          const costPrice = Number(product.cost_price ?? product.buying_price ?? product.costPrice ?? 0)
          const sellingPrice = Number(product.price ?? product.selling_price ?? product.sellingPrice ?? 0)
          // Normalize category to a string — API may return an object or a string
          const categoryString = product.category?.category_name ?? product.category?.name ?? (typeof product.category === 'string' ? product.category : '')
          return {
            id: String(product.id ?? product.product_id ?? product.sku ?? ''),
            name: product.name ?? product.product_name ?? 'Unnamed product',
            sku: product.sku ?? product.barcode ?? '',
            price: sellingPrice,
            stock: Number(product.stock ?? product.quantity_in_stock ?? 0),
            category: categoryString || 'Uncategorized',
            costPrice,
            profit: sellingPrice - costPrice,
          }
        })
        setProducts(normalizedProducts)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load products.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProducts()
    return () => {
      active = false
    }
  }, [token, debouncedSearch, categoryFilter, brandFilter, stockFilter])

  useEffect(() => {
    let active = true

    const loadMeta = async () => {
      try {
        const [categoryData, brandData] = await Promise.all([getCategories(), getBrands()])
        if (!active) {
          return
        }
        setCategories((Array.isArray(categoryData) ? categoryData : []).map((category: any) => ({
          id: String(category.id),
          category_name: category.category_name || category.name || 'Unknown',
        })))
        setBrands((Array.isArray(brandData) ? brandData : []).map((brand: any) => ({
          id: String(brand.id),
          brand_name: brand.brand_name || brand.name || 'Unknown',
        })))
      } catch {
        // ignore meta-loading errors for now
      }
    }

    loadMeta()
    return () => {
      active = false
    }
  }, [])

  const getCloudinaryFolder = (file: File) => {
    const folderPrefix = import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER?.trim()
    if (!folderPrefix) {
      return undefined
    }

    const fileName = formName.trim()
      ? formName.trim().replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
      : file.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()

    return `${folderPrefix}/${fileName}`
  }

  const buildAutoSku = (name: string) => {
    const normalized = name
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .toUpperCase()

    return normalized ? `SKU-${normalized}` : 'SKU-PRODUCT'
  }

  const simulateUpload = (file: File, index: number) => new Promise<string>((resolve) => {
    let pct = 0
    const id = setInterval(() => {
      pct += Math.floor(Math.random() * 20) + 10
      if (pct >= 100) {
        pct = 100
      }
      setImageUploadProgress((prev) => { const next = prev.slice(); next[index] = pct; return next })
      if (pct === 100) {
        clearInterval(id)
        const url = `https://via.placeholder.com/600x600.png?text=${encodeURIComponent(file.name)}`
        resolve(url)
      }
    }, 250)
  })

  const uploadToCloudinaryXHR = (file: File, index: number, cloudName: string, uploadPreset: string) => new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data.secure_url || data.url)
        } catch (e) {
          reject(new Error('Unexpected Cloudinary response'))
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText)
          reject(new Error(data?.error?.message || `Cloudinary upload failed with status ${xhr.status}`))
        } catch {
          reject(new Error(`Cloudinary upload failed with status ${xhr.status}`))
        }
      }
    }
    xhr.onerror = () => reject(new Error('Network error while uploading image to Cloudinary'))
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100)
        setImageUploadProgress((prev) => {
          const next = prev.slice()
          next[index] = pct
          return next
        })
      }
    }
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', uploadPreset)
    form.append('resource_type', 'auto')
    const folder = getCloudinaryFolder(file)
    if (folder) {
      form.append('folder', folder)
    }
    xhr.send(form)
  })

  const closeProductModal = () => {
    setShowForm(false)
    setFormError(null)
  }

  const handleProductSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }
    setError(null)
    setFormError(null)
    setIsSubmitting(true)

    try {
      // upload images first (if any)
      let imageUrls: string[] = []
      if (formImageFiles.length > 0) {
        setUploadingImages(true)
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
        if (!cloudName || !uploadPreset) {
          throw new Error('Cloudinary upload is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.')
        }
        const filesToUpload = formImageFiles.slice(0, 4)
        setImageUploadProgress(new Array(filesToUpload.length).fill(0))
        setImageUploadErrors(new Array(filesToUpload.length).fill(''))
        // Try parallel upload via cloudinaryService.uploadMultiple for speed/reliability
        try {
          const uploadResponses = await cloudinaryService.uploadMultiple(filesToUpload, 'seller-admin/products')
          imageUrls = uploadResponses.map((r) => (r.secure_url || r.url)).filter(Boolean) as string[]
        } catch (bulkErr) {
          // If bulk upload fails, fallback to sequential XHR per-file so we can capture per-file errors
          const results: (string | null)[] = new Array(filesToUpload.length).fill(null)
          for (let i = 0; i < filesToUpload.length; i++) {
            try {
              // eslint-disable-next-line no-await-in-loop
              const url = await uploadToCloudinaryXHR(filesToUpload[i], i, cloudName, uploadPreset)
              results[i] = url
              setImageUploadErrors((prev) => {
                const next = prev.slice()
                next[i] = ''
                return next
              })
            } catch (e) {
              setImageUploadErrors((prev) => {
                const next = prev.slice()
                next[i] = String(e)
                return next
              })
              notifyError(`Image ${i + 1} failed to upload: ${String(e)}`)
            }
          }
          imageUrls = results.filter(Boolean) as string[]
        } finally {
          setUploadingImages(false)
        }
      }

      const generatedSku = buildAutoSku(formName)
      // Determine whether category/brand inputs are numeric IDs or freeform names
      const categoryIsId = String(formCategoryId).match(/^\d+$/)
      const brandIsId = String(formBrandId).match(/^\d+$/)

      const productData: any = {
        ...(categoryIsId ? { category_id: Number(formCategoryId) } : (formCategoryId ? { category_name: formCategoryId } : { category_id: Number(categories[0]?.id || 0) })),
        ...(brandIsId ? { brand_id: Number(formBrandId) } : (formBrandId ? { brand_name: formBrandId } : { brand_id: Number(brands[0]?.id || 0) })),
        product_name: formName,
        sku: generatedSku,
        description: formDescription,
        cost_price: formCostPrice !== '' ? Number(formCostPrice) : undefined,
        selling_price: Number(formPrice || 0),
        quantity_in_stock: Number(formStock || 0),
        reorder_level: formReorderLevel !== '' ? Number(formReorderLevel) : undefined,
        // backend expects individual image_url fields
        ...(imageUrls.length > 0 ? {
          image_url: imageUrls[0] || undefined,
          image_url_2: imageUrls[1] || undefined,
          image_url_3: imageUrls[2] || undefined,
          image_url_4: imageUrls[3] || undefined,
        } : {}),
        status: formStatus,
      }
      if (editingProductId) {
        const updated = await updateProduct(token, editingProductId, productData)
        const sellingPrice = Number(updated.selling_price ?? updated.price ?? Number(formPrice || 0))
        const costPrice = Number(updated.cost_price ?? updated.buying_price ?? updated.costPrice ?? Number(formCostPrice || 0))
        const updatedProduct: Product = {
          id: String(updated.id ?? updated.product_id ?? updated.sku ?? editingProductId),
          name: (updated.product_name ?? updated.name ?? formName) || 'Unnamed product',
          sku: updated.sku ?? updated.barcode ?? generatedSku,
          price: sellingPrice,
          stock: Number(updated.quantity_in_stock ?? updated.stock ?? Number(formStock || 0)),
          category: updated.category?.category_name ?? updated.category?.name ?? (categories.find(c => c.id === formCategoryId)?.category_name ?? 'Uncategorized'),
          costPrice,
          profit: sellingPrice - costPrice,
        }
        setProducts((prev) => prev.map((p) => (p.id === editingProductId ? updatedProduct : p)))
        notifySuccess('Product updated successfully')
        setEditingProductId(null)
      } else {
        const created = await createProduct(token, productData)
        const sellingPrice = Number(created.selling_price ?? created.price ?? 0)
        const costPrice = Number(created.cost_price ?? created.buying_price ?? created.costPrice ?? 0)
        const newProduct: Product = {
          id: String(created.id ?? created.product_id ?? created.sku ?? Date.now()),
          name: created.product_name ?? created.product_name ?? 'Unnamed product',
          sku: created.sku ?? created.barcode ?? '',
          price: sellingPrice,
          stock: Number(created.quantity_in_stock ?? created.stock ?? 0),
          category: created.category?.category_name ?? created.category?.name ?? 'Uncategorized',
          costPrice,
          profit: sellingPrice - costPrice,
        }
        setProducts((prev) => [newProduct, ...prev])
        notifySuccess('Product created successfully')
      }
      setFormName('')
      setFormPrice('')
      setFormStock('')
      setFormCategoryId('')
      setFormBrandId('')
      setFormDescription('')
      setFormCostPrice('')
      setFormReorderLevel('')
      setFormImageFiles([])
      setFormStatus('Available')
      closeProductModal()
      setEditingProductId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save product.'
      setFormError(message)
      setError(message)
    } finally {
      setUploadingImages(false)
      setIsSubmitting(false)
    }
  }

  const handleEditProduct = (productId: string) => {
    const p = products.find((p) => p.id === productId)
    if (!p) return
    setEditingProductId(productId)
    setFormName(p.name || '')
    setFormPrice(p.price ?? '')
    setFormStock(p.stock ?? '')
    setFormDescription(p.description || '')
    setFormCategoryId(categories.find(c => c.category_name === p.category)?.id || '')
    setFormBrandId('')
    setFormCostPrice(p.costPrice ?? '')
    setFormReorderLevel(p.reorderLevel ?? '')
    setFormStatus((p.status as 'Available' | 'Out of Stock') ?? 'Available')
    setShowForm(true)
  }

  const confirmDeleteProduct = (product: Product) => {
    setPendingDeleteProduct(product)
    setOpenActionMenu(null)
  }

  const handleDeleteProduct = async () => {
    if (!pendingDeleteProduct) {
      return
    }
    const productId = pendingDeleteProduct.id
    try {
      await deleteProduct(token, productId)
      setProducts((prev) => prev.filter((product) => product.id !== productId))
      notifySuccess('Product deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete product.')
    } finally {
      setPendingDeleteProduct(null)
    }
  }

  const cancelDeleteProduct = () => {
    setPendingDeleteProduct(null)
  }

  useEffect(() => {
    return () => {
      formImagePreviews.forEach((p) => {
        try {
          URL.revokeObjectURL(p)
        } catch {
          // ignore failed cleanup
        }
      })
    }
  }, [formImagePreviews])

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 p-3 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-500">Catalog</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Products</h2>
          <p className="mt-1 text-slate-500">Manage your inventory</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setFormError(null)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-white shadow-[0_18px_28px_-18px_rgba(99,102,241,0.9)] transition-colors hover:brightness-110 sm:w-auto"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm transition-opacity duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/80 animate-[fadeIn_0.2s_ease-out] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-500">Inventory</p>
                <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{editingProductId ? 'Edit Product' : 'Create Product'}</h3>
              </div>
              <button
                type="button"
                onClick={closeProductModal}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6 flex-1 overflow-hidden">
              {formError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {formError}
                </div>
              )}

              <div className="overflow-auto pr-2" style={{ maxHeight: '64vh' }}>
                <form id="create-product-form" onSubmit={handleProductSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-1">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Product name</label>
                    <input value={formName} onChange={(e) => setFormName(e.target.value)} type="text" placeholder="Product Name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">SKU</label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                    {formName.trim() ? buildAutoSku(formName) : 'SKU will be generated automatically'}
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Price</label>
                  <input value={formPrice === '' ? '' : formPrice} onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))} type="number" placeholder="Price" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Stock</label>
                  <input value={formStock === '' ? '' : formStock} onChange={(e) => setFormStock(e.target.value === '' ? '' : Number(e.target.value))} type="number" placeholder="Stock" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
                    <div>
                      <input
                        list="categories-list"
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        placeholder="Select or type category"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <datalist id="categories-list">
                        {categories.map((category) => (
                          <option key={category.id} value={String(category.id)}>{category.category_name}</option>
                        ))}
                      </datalist>
                    </div>
                </div>
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Brand</label>
                   <div>
                     <input
                       list="brands-list"
                       value={formBrandId}
                       onChange={(e) => setFormBrandId(e.target.value)}
                       placeholder="Select or type brand"
                       className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                     />
                     <datalist id="brands-list">
                       {brands.map((brand) => (
                         <option key={brand.id} value={String(brand.id)}>{brand.brand_name}</option>
                       ))}
                     </datalist>
                   </div>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                  <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description" className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Cost price</label>
                  <input value={formCostPrice === '' ? '' : formCostPrice} onChange={(e) => setFormCostPrice(e.target.value === '' ? '' : Number(e.target.value))} type="number" placeholder="Cost Price" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Reorder level</label>
                  <input value={formReorderLevel === '' ? '' : formReorderLevel} onChange={(e) => setFormReorderLevel(e.target.value === '' ? '' : Number(e.target.value))} type="number" placeholder="Reorder Level" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Upload images (up to 4)</label>
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
                    }}
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
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
                            <button type="button" onClick={async () => {
                              setImageUploadErrors((prev) => { const next = prev.slice(); next[idx] = ''; return next })
                              setImageUploadProgress((prev) => { const next = prev.slice(); next[idx] = 0; return next })
                              setUploadingImages(true)
                              try {
                                const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
                                const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
                                const useMockRetry = !cloudName || !uploadPreset
                                const uploadSingle = (_file: File, index: number) => new Promise<string>((resolve, reject) => {
                                  if (useMockRetry) {
                                    simulateUpload(_file, index).then(resolve).catch(reject)
                                    return
                                  }
                                  uploadToCloudinaryXHR(_file, index, cloudName, uploadPreset).then(resolve).catch(reject)
                                })
                                await uploadSingle(formImageFiles[idx], idx)
                                setImageUploadErrors((prev) => { const next = prev.slice(); next[idx] = ''; return next })
                              } catch (err) {
                                setImageUploadErrors((prev) => { const next = prev.slice(); next[idx] = String(err); return next })
                              } finally {
                                setUploadingImages(false)
                              }
                            }} className="text-xs text-indigo-600">Retry</button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {uploadingImages && <p className="mt-2 text-sm text-slate-500">Uploading images... ({imageUploadProgress.length ? Math.round(imageUploadProgress.reduce((a,b)=>a+b,0)/imageUploadProgress.length) : 0}% avg)</p>}
                </div>
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as 'Available' | 'Out of Stock')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Available">Available</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>

                </form>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white/90 px-5 py-3 sm:px-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeProductModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => { const form = document.querySelector('#create-product-form') as HTMLFormElement | null; if (form) form.requestSubmit(); }}
                disabled={isSubmitting || uploadingImages}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 font-medium text-white shadow-[0_18px_28px_-18px_rgba(99,102,241,0.9)] transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating...
                  </>
                ) : (
                  'Create Product'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 py-2.5 pl-10 pr-4 text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null)
            window.location.reload()
          }}
        />
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const rows: string[] = []
            rows.push('Product Name,Category,SKU,Price,Stock,Profit')
            filteredProducts.forEach((product) => {
              rows.push([
                product.name,
                product.category,
                product.sku,
                product.price.toFixed(2),
                product.stock,
                (product.profit ?? 0).toFixed(2),
              ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
            })
            const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `products-${Date.now()}.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            notifySuccess('Products exported to CSV')
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-[0_18px_28px_-18px_rgba(99,102,241,0.9)] transition-colors hover:brightness-110"
        >
          <Download size={16} />
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => {
            const rows: string[] = []
            rows.push('Product Name,Category,SKU,Price,Stock,Profit')
            filteredProducts.forEach((product) => {
              rows.push([
                product.name,
                product.category,
                product.sku,
                product.price.toFixed(2),
                product.stock,
                (product.profit ?? 0).toFixed(2),
              ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
            })
            const blob = new Blob([rows.join('\r\n')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `products-${Date.now()}.xlsx`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            notifySuccess('Products exported to Excel')
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
        >
          <Download size={16} />
          Export Excel
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Filter size={16} />
          Advanced Filters
          {(categoryFilter || brandFilter || stockFilter !== 'all') && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Active</span>
          )}
        </button>
        {(categoryFilter || brandFilter || stockFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('')
              setBrandFilter('')
              setStockFilter('all')
            }}
            className="inline-flex items-center gap-1 rounded-xl text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <X size={16} />
            Clear filters
          </button>
        )}
      </div>

      {showAdvancedFilters && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-6 slide-up">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Advanced Filters</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Brand</label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Stock Status</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All stock levels</option>
                <option value="low">Low stock (≤ 10)</option>
                <option value="out">Out of stock</option>
                <option value="available">In stock</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="responsive-table w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Cost Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="px-4">
                      <SkeletonTable rows={5} columns={6} />
                    </div>
                  </td>
                </tr>
              ) : !loading && products.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center px-4 py-12">
                      <PackageOpen size={48} className="text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-900">No products found</p>
                      <p className="text-sm text-gray-500 mt-1">Add your first product to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.slice(0, visibleProducts).map((product: Product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td data-label="Product" className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.category}</div>
                    </td>
                    <td data-label="Cost Price" className="px-6 py-4 text-sm text-gray-700">UGX {product.costPrice?.toFixed(2) ?? '0.00'}</td>
                    <td data-label="Price" className="px-6 py-4 text-sm font-medium text-gray-900">UGX {product.price.toFixed(2)}</td>
                    <td data-label="Stock" className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.stock < 10 ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'}`}>
                        {product.stock} units
                      </span>
                    </td>
                    <td data-label="Profit" className="px-6 py-4 text-sm">
                      <span className={`font-semibold text-blue-700`}>
                        {((product.profit ?? 0) >= 0 ? 'UGX ' : '-UGX ')}{Math.abs(product.profit ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td data-label="Actions" className="px-6 py-4 text-sm relative">
                      <button
                        type="button"
                        onClick={() => setOpenActionMenu((prev) => (prev === product.id ? null : product.id))}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Actions
                      </button>
                      {openActionMenu === product.id && (
                        <div className="absolute right-0 z-10 mt-2 w-32 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              handleEditProduct(product.id)
                              setOpenActionMenu(null)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDeleteProduct(product)}
                            className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-gray-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {filteredProducts.length > visibleProducts && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleProducts((prev) => prev + 25)}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Load more products
          </button>
        </div>
      )}

      <ConfirmationModal
        open={Boolean(pendingDeleteProduct)}
        title="Confirm delete"
        description={
          pendingDeleteProduct
            ? `Are you sure you want to permanently delete ${pendingDeleteProduct.name}? This action cannot be undone.`
            : ''
        }
        confirmText="Delete product"
        cancelText="Cancel"
        danger
        onConfirm={handleDeleteProduct}
        onCancel={cancelDeleteProduct}
      />
    </div>
  )
}