'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { Delivery } from '../../lib/types'
import { deliveriesApi } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { Badge } from '../../components/ui/badge'
import { Plus, CheckCircle2 } from 'lucide-react'
import { DeliveryForm } from '../../components/deliveries/delivery-form'

const statusConfig = {
  'pending': { bg: 'bg-warning/10', text: 'text-warning', label: 'Pending' },
  'in-transit': { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'In Transit' },
  'delivered': { bg: 'bg-success/10', text: 'text-success', label: 'Delivered' },
  'failed': { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Failed' },
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchDeliveries()
  }, [])

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const data = await deliveriesApi.getAll()
      setDeliveries(data)
    } catch (err) {
      console.error('Failed to fetch deliveries:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleIssueReceipt = async (id: string) => {
    try {
      const receipt = await deliveriesApi.issueReceipt(id)
      setDeliveries(deliveries.map(d => d.id === id ? { ...d, receiptIssued: true } : d))
      alert('Receipt issued successfully!')
    } catch (err) {
      console.error('Failed to issue receipt:', err)
      alert('Failed to issue receipt')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1.5 text-xs font-medium text-cyan-700">
                Delivery tracking
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Deliveries</h1>
              <p className="mt-2 text-sm text-slate-500">Track and manage the movement of every order</p>
            </div>
              <Button onClick={() => setShowForm(true)} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-95">
              <Plus className="h-4 w-4" />
              New Delivery
            </Button>
          </div>
        </div>

        {showForm && (
          <DeliveryForm
            onClose={() => setShowForm(false)}
            onSave={() => { fetchDeliveries(); setShowForm(false) }}
          />
        )}

        <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/80 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No deliveries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Order #</th>
                    <th className="px-6 py-3 text-left font-medium">Person</th>
                    <th className="px-6 py-3 text-left font-medium">Location</th>
                    <th className="px-6 py-3 text-center font-medium">Status</th>
                    <th className="px-6 py-3 text-center font-medium">Receipt</th>
                    <th className="px-6 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {deliveries.map((delivery) => {
                    const statusInfo = statusConfig[delivery.status as keyof typeof statusConfig]
                    return (
                      <tr key={delivery.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-6 py-4 font-medium text-slate-900">{delivery.orderNumber}</td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-800">{delivery.deliveryPersonName}</p>
                            <p className="text-xs text-slate-500">{delivery.deliveryPersonPhone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{delivery.location}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge className={`${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {delivery.receiptIssued ? (
                            <div className="flex items-center justify-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">Issued</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {delivery.status === 'delivered' && !delivery.receiptIssued && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleIssueReceipt(delivery.id)}
                              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            >
                              Issue Receipt
                            </Button>
                          )}
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
