'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { Order } from '../../lib/types'
import { ordersApi } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Plus } from 'lucide-react'
import { OrderManagement } from '../../components/orders/order-management'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const data = await ordersApi.getAll()
      setOrders(data)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700">
                Order operations
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Orders</h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage customer orders with advanced filtering and bulk actions
              </p>
            </div>
            <Button className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-95">
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {!loading && (
          <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/80 p-3 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-4">
            <OrderManagement
              initialOrders={orders}
              onOrdersChange={setOrders}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
