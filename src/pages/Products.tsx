import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, PackageOpen, Filter, X, Download } from 'lucide-react'
import { fetchProducts, getCategories, getBrands, createProduct, updateProduct, deleteProduct } from '@/lib/api'
import { Product, Category, Brand } from '@/types'
import { notifyError, notifySuccess } from '@/lib/notify'
import ConfirmationModal from '@/components/ConfirmationModal'
import { SkeletonTable } from '@/components/Skeleton'
import ErrorMessage from '@/components/ErrorMessage'
import { cloudinaryService } from '../../lib/cloudinary-service'

interface ProductsProps {
  onNavigate?: (page: string) => void
}

const MIN_PRODUCT_IMAGES = 1
const MAX_PRODUCT_IMAGES = 4

export default function Products({ onNavigate }: ProductsProps) {
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
  const formImagePreviewsRef = useRef<string[]>([])
  const [imageUploadProgress, setImageUploadProgress] = useState<number[]>([])
  const [imageUploadErrors, setImageUploadErrors] = useState<string[]>([])
  const [formStatus, setFormStatus] = useState<'Available' | 'Out of Stock'>('Available')
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
        const data = await fetchProducts(debouncedSearch)
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
          const brandString = product.brand?.brand_name ?? product.brand?.name ?? (typeof product.brand === 'string' ? product.brand : '')
          return {
            id: String(product.id ?? product.product_id ?? product.sku ?? ''),
            name: product.name ?? product.product_name ?? 'Unnamed product',
            sku: product.sku ?? product.barcode ?? '',
            price: sellingPrice,
            stock: Number(product.stock ?? product.quantity_in_stock ?? 0),
            category: categoryString || 'Uncategorized',
            categoryId: String(product.category?.id ?? product.category_id ?? ''),
            brand: brandString || 'Unbranded',
            brandId: String(product.brand?.id ?? product.brand_id ?? ''),
            description: product.description ?? '',
            costPrice,
            profit: sellingPrice - costPrice,
            reorderLevel: Number(product.reorder_level ?? product.reorderLevel ?? 0),
            status: product.status ?? 'Available',
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
  }, [debouncedSearch, categoryFilter, brandFilter, stockFilter])

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

  // A product name is not unique, so it cannot safely double as its SKU.
  const buildUniqueSku = (name: string) => {
    const baseSku = buildAutoSku(name).slice(0, 42)
    const uniqueSuffix = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

    return `${baseSku}-${uniqueSuffix}`
  }

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

  const clearProductImages = () => {
    formImagePreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview))
    formImagePreviewsRef.current = []
    setFormImageFiles([])
    setFormImagePreviews([])
    setImageUploadProgress([])
    setImageUploadErrors([])
  }

  const closeProductModal = () => {
    setShowForm(false)
    setFormError(null)
    clearProductImages()
  }

  const handleProductImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Allow selecting the same file again after it has been removed.
    event.target.value = ''

    if (!file) {
      return
    }

    if (formImageFiles.length >= MAX_PRODUCT_IMAGES) {
      setFormError(`A product can have up to ${MAX_PRODUCT_IMAGES} images.`)
      return
    }

    const validation = cloudinaryService.validateImage(file)
    if (!validation.valid) {
      setFormError(`${file.name}: ${validation.error ?? 'Invalid image file.'}`)
      return
    }

    const isDuplicate = formImageFiles.some((selectedFile) => (
      selectedFile.name === file.name
      && selectedFile.size === file.size
      && selectedFile.lastModified === file.lastModified
    ))
    if (isDuplicate) {
      setFormError('That image has already been added.')
      return
    }

    const preview = URL.createObjectURL(file)
    setFormImageFiles((previous) => [...previous, file])
    setFormImagePreviews((previous) => {
      const next = [...previous, preview]
      formImagePreviewsRef.current = next
      return next
    })
    setImageUploadProgress((previous) => [...previous, 0])
    setImageUploadErrors((previous) => [...previous, ''])
    setFormError(null)
  }

  const removeProductImage = (index: number) => {
    const preview = formImagePreviewsRef.current[index]
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setFormImageFiles((previous) => previous.filter((_, imageIndex) => imageIndex !== index))
    setFormImagePreviews((previous) => {
      const next = previous.filter((_, imageIndex) => imageIndex !== index)
      formImagePreviewsRef.current = next
      return next
    })
    setImageUploadProgress((previous) => previous.filter((_, imageIndex) => imageIndex !== index))
    setImageUploadErrors((previous) => previous.filter((_, imageIndex) => imageIndex !== index))
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
      const productName = formName.trim()
      if (!productName) {
        throw new Error('Enter a product name before saving.')
      }
      if (!formCategoryId || !formBrandId) {
        throw new Error('Select a category and brand before saving the product.')
      }
      if (formPrice === '' || !Number.isFinite(Number(formPrice)) || Number(formPrice) < 0) {
        throw new Error('Enter a valid selling price.')
      }
      if (formStock === '' || !Number.isInteger(Number(formStock)) || Number(formStock) < 0) {
        throw new Error('Enter a valid stock quantity.')
      }
      if (formCostPrice !== '' && (!Number.isFinite(Number(formCostPrice)) || Number(formCostPrice) < 0)) {
        throw new Error('Enter a valid cost price.')
      }
      if (formReorderLevel !== '' && (!Number.isInteger(Number(formReorderLevel)) || Number(formReorderLevel) < 0)) {
        throw new Error('Enter a valid reorder level.')
      }
      if (!editingProductId && formImageFiles.length < MIN_PRODUCT_IMAGES) {
        throw new Error('Add at least one product image before saving.')
      }

      // Upload every selected image before creating/updating the one product record.
      let imageUrls: string[] = []
      if (formImageFiles.length > 0) {
        setUploadingImages(true)
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
        if (!cloudName || !uploadPreset) {
          throw new Error('Cloudinary upload is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.')
        }
        const filesToUpload = formImageFiles
        setImageUploadProgress(new Array(filesToUpload.length).fill(0))
        setImageUploadErrors(new Array(filesToUpload.length).fill(''))
        const uploads = await Promise.allSettled(
          filesToUpload.map((file, index) => uploadToCloudinaryXHR(file, index, cloudName, uploadPreset))
        )
        const uploadErrors = uploads.map((result) => (
          result.status === 'rejected' ? String(result.reason) : ''
        ))
        setImageUploadErrors(uploadErrors)

        const failedImageCount = uploadErrors.filter(Boolean).length
        if (failedImageCount > 0) {
          throw new Error(`${failedImageCount} image${failedImageCount === 1 ? '' : 's'} failed to upload. Fix the failed image${failedImageCount === 1 ? '' : 's'} and try again.`)
        }

        imageUrls = uploads.map((result) => (
          result.status === 'fulfilled' ? result.value : ''
        ))
      }

      const productImages = imageUrls.filter(Boolean)

      if (formImageFiles.length > 0 && productImages.length !== formImageFiles.length) {
        throw new Error('Every selected product image must upload successfully before the product can be saved.')
      }

      // Send both identifiers for a new product. The deployed API validates
      // each of these as unique and otherwise derives a duplicate fallback.
      const newProductIdentifier = !editingProductId ? buildUniqueSku(productName) : undefined

      const productData: any = {
        category_id: Number(formCategoryId),
        brand_id: Number(formBrandId),
        product_name: productName,
        // New records need an explicit SKU because a product name may repeat.
        ...(newProductIdentifier ? {
          sku: newProductIdentifier,
          barcode: newProductIdentifier,
        } : {}),
        // The current backend raises a 500 for an empty description, so always
        // provide a valid default when the optional UI field is left blank.
        description: formDescription.trim() || 'No description provided.',
        buying_price: Number(formCostPrice || 0),
        selling_price: Number(formPrice),
        quantity_in_stock: Number(formStock),
        reorder_level: Number(formReorderLevel || 0),
        // The product API stores the gallery on the same product as four URL fields.
        ...(productImages.length > 0 ? {
          image_url: productImages[0] || undefined,
          image_url_2: productImages[1] || undefined,
          image_url_3: productImages[2] || undefined,
          image_url_4: productImages[3] || undefined,
        } : {}),
        status: formStatus,
      }
      if (editingProductId) {
          const updated = await updateProduct(editingProductId, productData)
        const sellingPrice = Number(updated.selling_price ?? updated.price ?? Number(formPrice || 0))
        const costPrice = Number(updated.cost_price ?? updated.buying_price ?? updated.costPrice ?? Number(formCostPrice || 0))
        const updatedProduct: Product = {
          id: String(updated.id ?? updated.product_id ?? updated.sku ?? editingProductId),
          name: (updated.product_name ?? updated.name ?? formName) || 'Unnamed product',
          sku: updated.sku ?? updated.barcode ?? buildAutoSku(productName),
          price: sellingPrice,
          stock: Number(updated.quantity_in_stock ?? updated.stock ?? Number(formStock || 0)),
          category: updated.category?.category_name ?? updated.category?.name ?? (categories.find(c => c.id === formCategoryId)?.category_name ?? 'Uncategorized'),
          categoryId: String(updated.category?.id ?? updated.category_id ?? formCategoryId),
          brand: updated.brand?.brand_name ?? updated.brand?.name ?? (brands.find(b => b.id === formBrandId)?.brand_name ?? 'Unbranded'),
          brandId: String(updated.brand?.id ?? updated.brand_id ?? formBrandId),
          description: updated.description ?? formDescription,
          costPrice,
          profit: sellingPrice - costPrice,
          reorderLevel: Number(updated.reorder_level ?? updated.reorderLevel ?? formReorderLevel ?? 0),
          status: updated.status ?? formStatus,
        }
        setProducts((prev) => prev.map((p) => (p.id === editingProductId ? updatedProduct : p)))
        notifySuccess('Product updated successfully')
        setEditingProductId(null)
      } else {
          const created = await createProduct(productData)
        const sellingPrice = Number(created.selling_price ?? created.price ?? 0)
        const costPrice = Number(created.cost_price ?? created.buying_price ?? created.costPrice ?? 0)
        const newProduct: Product = {
          id: String(created.id ?? created.product_id ?? created.sku ?? Date.now()),
          name: created.product_name ?? created.product_name ?? 'Unnamed product',
          sku: created.sku ?? created.barcode ?? buildAutoSku(productName),
          price: sellingPrice,
          stock: Number(created.quantity_in_stock ?? created.stock ?? 0),
          category: created.category?.category_name ?? created.category?.name ?? 'Uncategorized',
          categoryId: String(created.category?.id ?? created.category_id ?? formCategoryId),
          brand: created.brand?.brand_name ?? created.brand?.name ?? (brands.find(b => b.id === formBrandId)?.brand_name ?? 'Unbranded'),
          brandId: String(created.brand?.id ?? created.brand_id ?? formBrandId),
          description: created.description ?? formDescription,
          costPrice,
          profit: sellingPrice - costPrice,
          reorderLevel: Number(created.reorder_level ?? created.reorderLevel ?? formReorderLevel ?? 0),
          status: created.status ?? formStatus,
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
      clearProductImages()
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
    setFormCategoryId(p.categoryId || categories.find(c => c.category_name === p.category)?.id || '')
    setFormBrandId(p.brandId || brands.find(b => b.brand_name === p.brand)?.id || '')
    setFormCostPrice(p.costPrice ?? '')
    setFormReorderLevel(p.reorderLevel ?? '')
    setFormStatus((p.status as 'Available' | 'Out of Stock') ?? 'Available')
    setShowForm(true)
  }

  const confirmDeleteProduct = (product: Product) => {
    setPendingDeleteProduct(product)
  }

  const handleDeleteProduct = async () => {
    if (!pendingDeleteProduct) {
      return
    }
    const productId = pendingDeleteProduct.id
    try {
        await deleteProduct(productId)
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


  useEffect(() => () => {
    formImagePreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview))
  }, [])

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 p-3 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-500">Catalog</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Products</h2>
          <p className="mt-1 text-slate-500">Manage your inventory</p>
        </div>
        <div className="flex items-center gap-3">
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
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.category_name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Brand</label>
                  <select
                    value={formBrandId}
                    onChange={(e) => setFormBrandId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="" disabled>Select a brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
                    ))}
                  </select>
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Product images (up to 4)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageSelection}
                    disabled={formImageFiles.length >= MAX_PRODUCT_IMAGES || uploadingImages}
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Add one image at a time. {formImageFiles.length}/{MAX_PRODUCT_IMAGES} selected{editingProductId ? '' : ' (at least one is required)'}.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {formImagePreviews.slice(0, 4).map((preview, idx) => (
                      <div key={preview} className="relative flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => removeProductImage(idx)}
                          disabled={uploadingImages}
                          className="absolute -right-1 -top-1 z-10 rounded-full bg-slate-800 p-1 text-white shadow hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Remove image ${idx + 1}`}
                        >
                          <X size={12} />
                        </button>
                        <img src={preview} alt={`Product image ${idx + 1}`} className="h-20 w-20 rounded-xl object-cover shadow-sm" />
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
                    <td data-label="Actions" className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(product.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteProduct(product)}
                        className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        Delete
                      </button>
                      </div>
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
