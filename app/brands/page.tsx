'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { brandsApi } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { Plus, AlertCircle } from 'lucide-react'
import BrandForm from '../../components/products/brand-form'

export default function BrandsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const data = await brandsApi.getAll()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load brands', err)
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
              <h1 className="text-2xl font-bold">Brands</h1>
              <p className="text-sm text-slate-500">Manage product brands</p>
            </div>
            <div>
              <Button onClick={() => setShowForm(true)} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                <Plus className="h-4 w-4" />
                Add Brand
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
              <p className="text-slate-500">No brands yet</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <div>
                    <div className="font-medium text-slate-900">{c.brand_name}</div>
                    {c.country && <div className="text-sm text-slate-500">{c.country}</div>}
                  </div>
                  {c.logo && <img src={c.logo} alt={c.brand_name} className="h-10 w-10 rounded-md object-cover" />}
                </li>
              ))}
            </ul>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-card p-4 rounded max-w-md w-full">
              <BrandForm onDone={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
