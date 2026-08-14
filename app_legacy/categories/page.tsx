"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { categoriesApi } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { Plus, AlertCircle } from 'lucide-react'
import CategoryForm from '../../components/products/category-form'

export default function CategoriesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const data = await categoriesApi.getAll()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load categories', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Categories</h1>
              <p className="text-sm text-slate-500">Manage product categories</p>
            </div>
            <div>
              <Button type="button" onClick={() => { console.log('Categories: Add button clicked'); router.push('/categories/create') }} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/80 p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <p className="text-slate-500">No categories yet</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <div>
                    <div className="font-medium text-slate-900">{c.category_name}</div>
                    {c.description && <div className="text-sm text-slate-500">{c.description}</div>}
                    {c.created_at && <div className="text-xs text-slate-400">Created: {new Date(c.created_at).toLocaleString()}</div>}
                    {c.updated_at && <div className="text-xs text-slate-400">Updated: {new Date(c.updated_at).toLocaleString()}</div>}
                  </div>
                  {c.image_url && <img src={c.image_url} alt={c.category_name} className="h-10 w-10 rounded-md object-cover" />}
                </li>
              ))}
            </ul>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card p-4 rounded max-w-md w-full">
              <CategoryForm onDone={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
