'use client'

import { useEffect, useState } from 'react'
import { brandsApi } from '@/lib/api'
import { cloudinaryService } from '@/lib/cloudinary-service'
import { Button } from '@/components/ui/button'

interface Props {
  onDone: (brand: any) => void
  onClose?: () => void
}

export default function BrandForm({ onDone, onClose }: Props) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      let logoUrl = ''
      if (file) {
        const upload = await cloudinaryService.uploadImage(file, 'brands')
        logoUrl = upload.secure_url
      }

      const created = await brandsApi.create({ brand_name: name, description, country, logo: logoUrl })
      onDone(created)
      setName('')
      setDescription('')
      setCountry('')
      setFile(null)
      onClose && onClose()
    } catch (err) {
      console.error('Create brand failed', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-card rounded">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm">Brand name</label>
          <input className="w-full mt-1 p-2 border" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm">Country</label>
          <input className="w-full mt-1 p-2 border" value={country} onChange={e => setCountry(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Description</label>
          <textarea className="w-full mt-1 p-2 border" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Logo</label>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
          {preview && <img src={preview} alt="preview" className="mt-2 h-16" />}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Brand'}</Button>
        </div>
      </form>
    </div>
  )
}
