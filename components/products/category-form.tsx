'use client'

import { useEffect, useState } from 'react'
import { categoriesApi } from '../../lib/api'
import { cloudinaryService } from '../../lib/cloudinary-service'

interface Props {
  initialData?: {
    id?: number | string
    category_name?: string
    image_url?: string
  }
  onDone: (category: any) => void
  onClose?: () => void
  mode?: 'create' | 'edit'
}

export default function CategoryForm({ initialData, onDone, onClose, mode = 'create' }: Props) {
  const [name, setName] = useState(initialData?.category_name ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initialData?.image_url ?? null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreview(initialData?.image_url ?? null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, initialData?.image_url])

  function handleFileChange(selected: File | null) {
    setError(null)
    if (!selected) {
      setFile(null)
      return
    }

    const validation = cloudinaryService.validateImage(selected, 5)
    if (!validation.valid) {
      setError(validation.error || 'Invalid image')
      setFile(null)
      return
    }

    setFile(selected)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      console.log('CategoryForm: submit')
      let imageUrl = initialData?.image_url || ''
      if (file) {
        setProgress(0)
        const upload = await cloudinaryService.uploadImageWithProgress(file, 'categories', (p) => setProgress(p))
        imageUrl = upload.secure_url
      }

      const payload = { category_name: name.trim(), image_url: imageUrl }
      const saved = mode === 'edit' && initialData?.id
        ? await categoriesApi.update(String(initialData.id), payload)
        : await categoriesApi.create(payload)

      console.log('CategoryForm: saved', saved)
      onDone(saved)
      setName('')
      setFile(null)
      setPreview(null)
      onClose && onClose()
    } catch (err) {
      console.error('Category save failed', err)
      setError(err instanceof Error ? err.message : 'Failed to save category.')
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Category name</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Beauty"
            required
          />
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => handleFileChange(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {!error && mode === 'edit' && initialData?.image_url && (
            <p className="mt-2 text-xs text-slate-500">Current image will be kept unless you choose a new file.</p>
          )}
          {preview && (
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3">
              <img src={preview} alt="Category preview" className="h-16 w-16 rounded-xl object-cover" />
              <div className="flex-1">
                <span className="text-sm text-slate-600">Preview ready</span>
                {progress !== null && (
                  <div className="mt-2 w-full">
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Uploading: {progress}%</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_18px_28px_-18px_rgba(99,102,241,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Category')}
          </button>
        </div>
      </form>
    </div>
  )
}
