import { useCallback, useEffect, useState } from 'react'
import { Check, FilePlus2, FileText, MapPin, PackageOpen, Send } from 'lucide-react'
import { createReceipt, downloadReceiptPdf, fetchDeliveries, getReceiptId, sendReceiptEmail, updateDelivery } from '@/lib/api'
import { downloadBlob } from '@/lib/file-download'
import { notifyError, notifySuccess } from '@/lib/notify'
import { Delivery } from '@/types'
import ErrorMessage from '@/components/ErrorMessage'
import { SkeletonTable } from '@/components/Skeleton'

const isDeliveryPending = (status: string) => status === 'preparing' || status === 'pending'
const isDeliveryInTransit = (status: string) => ['out for delivery', 'in-transit', 'shipped'].includes(status)
const isDeliveryDelivered = (status: string) => status === 'delivered'
const formatDeliveryStatus = (status: string) => status.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyDelivery, setBusyDelivery] = useState<string | null>(null)

  const loadDeliveries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchDeliveries()
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setDeliveries(list.map((delivery: any) => {
        const receiptId = getReceiptId(delivery) ?? undefined
        const salonName = (
          delivery.salon_name ??
          delivery.order?.salon_name ??
          delivery.order?.salon?.name ??
          delivery.shop_name ??
          delivery.business_name ??
          delivery.user?.salon_name ??
          'Unknown salon'
        )
        const userName = (
          delivery.user_name ??
          delivery.customer_name ??
          delivery.user?.name ??
          delivery.user?.full_name ??
          delivery.order?.user_name ??
          delivery.order?.customer_name ??
          'Guest'
        )
        const address = (
          delivery.delivery_address ??
          delivery.order?.delivery_address ??
          delivery.address ??
          delivery.order?.address ??
          delivery.order?.shipping_address ??
          delivery.order?.location ??
          'Address unavailable'
        )
        return {
          id: String(delivery.id ?? delivery.delivery_id ?? 'N/A'),
          orderId: String(delivery.order_number ?? delivery.order_id ?? delivery.orderId ?? delivery.order?.order_id ?? 'N/A'),
          salonName: String(salonName),
          userName: String(userName),
          driver: delivery.delivery_person ?? delivery.driver_name ?? delivery.driver ?? 'Unassigned',
          address: String(address),
          status: String(delivery.delivery_status ?? delivery.status ?? 'preparing').toLowerCase(),
          receiptIssued: Boolean(receiptId),
          receiptId,
        }
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load deliveries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDeliveries()
  }, [loadDeliveries])

  const handleMarkDelivered = async (delivery: Delivery) => {
    setBusyDelivery(delivery.id)
    try {
      await updateDelivery(delivery.id, 'Delivered')
      setDeliveries((current) => current.map((item) => item.id === delivery.id ? { ...item, status: 'delivered' } : item))
      notifySuccess('Delivery marked as delivered. You can now issue its receipt.')
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Unable to mark delivery as delivered.')
    } finally {
      setBusyDelivery(null)
    }
  }

  const handleCreateReceipt = async (delivery: Delivery) => {
    setBusyDelivery(delivery.id)
    try {
      const receiptId = getReceiptId(await createReceipt(delivery.orderId))
      if (!receiptId) throw new Error('The receipt was created but no receipt ID was returned.')
      setDeliveries((current) => current.map((item) => item.id === delivery.id ? { ...item, receiptIssued: true, receiptId: String(receiptId) } : item))
      notifySuccess('Receipt issued successfully')
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Unable to issue receipt.')
    } finally {
      setBusyDelivery(null)
    }
  }

  const handleDownloadReceipt = async (delivery: Delivery) => {
    if (!delivery.receiptId) {
      notifyError('Issue the receipt before downloading it.')
      return
    }
    setBusyDelivery(delivery.id)
    try {
      downloadBlob(await downloadReceiptPdf(delivery.receiptId), `receipt-${delivery.orderId}.pdf`)
      notifySuccess('Receipt downloaded successfully')
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Unable to download receipt.')
    } finally {
      setBusyDelivery(null)
    }
  }

  const handleEmailReceipt = async (delivery: Delivery) => {
    if (!delivery.receiptId) {
      notifyError('Issue the receipt before emailing it.')
      return
    }
    setBusyDelivery(delivery.id)
    try {
      await sendReceiptEmail(delivery.receiptId)
      notifySuccess('Receipt emailed successfully')
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Unable to email receipt.')
    } finally {
      setBusyDelivery(null)
    }
  }

  const statusColor = (status: string) => isDeliveryDelivered(status) ? 'bg-green-100 text-green-800' : isDeliveryInTransit(status) ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
  const pendingCount = deliveries.filter((delivery) => isDeliveryPending(delivery.status)).length
  const inTransitCount = deliveries.filter((delivery) => isDeliveryInTransit(delivery.status)).length
  const deliveredCount = deliveries.filter((delivery) => isDeliveryDelivered(delivery.status)).length

  return (
    <div className="page-container">
      <div className="mb-6 sm:mb-8"><h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Deliveries</h2><p className="mt-1 text-gray-500">Complete deliveries, then issue and share receipts.</p></div>
      {error ? <div className="mb-6"><ErrorMessage message={error} onRetry={() => void loadDeliveries()} /></div> : null}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-sm text-gray-600">Pending</p><p className="text-2xl font-bold text-gray-900">{pendingCount}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-sm text-gray-600">In transit</p><p className="text-2xl font-bold text-gray-900">{inTransitCount}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-sm text-gray-600">Delivered</p><p className="text-2xl font-bold text-gray-900">{deliveredCount}</p></div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white"><div className="overflow-x-auto"><table className="responsive-table w-full">
        <thead className="border-b border-gray-200 bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Order number</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Salon name</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">User name</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Address</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Status</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Receipt</th><th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Actions</th></tr></thead>
        <tbody className="divide-y divide-gray-200">
          {loading ? <tr><td colSpan={7}><div className="px-4"><SkeletonTable rows={5} columns={7} /></div></td></tr> : null}
          {!loading && deliveries.length === 0 ? <tr><td colSpan={7}><div className="flex flex-col items-center justify-center px-4 py-12"><PackageOpen size={48} className="mb-3 text-gray-400" /><p className="text-sm font-medium text-gray-900">No deliveries yet</p><p className="mt-1 text-sm text-gray-500">Deliveries will appear when orders are ready.</p></div></td></tr> : null}
          {!loading && deliveries.map((delivery) => {
            const isBusy = busyDelivery === delivery.id
            const isDelivered = isDeliveryDelivered(delivery.status)
            return <tr key={delivery.id} className="transition-colors hover:bg-gray-50">
              <td data-label="Order number" className="px-6 py-4 text-sm font-medium text-blue-600">{delivery.orderId}</td><td data-label="Salon name" className="px-6 py-4 text-sm text-gray-900">{delivery.salonName ?? 'Unknown salon'}</td><td data-label="User name" className="px-6 py-4 text-sm text-gray-900">{delivery.userName ?? 'Guest'}</td><td data-label="Address" className="px-6 py-4 text-sm text-gray-600"><span className="flex items-center gap-1"><MapPin size={16} className="shrink-0" />{delivery.address}</span></td><td data-label="Status" className="px-6 py-4 text-sm"><span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(delivery.status)}`}>{formatDeliveryStatus(delivery.status)}</span></td><td data-label="Receipt" className="px-6 py-4 text-sm">{delivery.receiptIssued ? <span className="inline-flex items-center gap-1 text-green-700"><Check size={16} />Issued</span> : <span className="text-gray-500">Not issued</span>}</td>
              <td data-label="Actions" className="px-6 py-4 text-sm"><div className="flex flex-wrap items-center gap-2">
                {!isDelivered ? <button type="button" onClick={() => void handleMarkDelivered(delivery)} disabled={isBusy} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isBusy ? 'Updating...' : 'Mark delivered'}</button> : null}
                {isDelivered && !delivery.receiptIssued ? <button type="button" onClick={() => void handleCreateReceipt(delivery)} disabled={isBusy} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><FilePlus2 size={15} />{isBusy ? 'Issuing...' : 'Issue receipt'}</button> : null}
                {isDelivered && delivery.receiptIssued ? <><button type="button" onClick={() => void handleDownloadReceipt(delivery)} disabled={isBusy} className="rounded-md p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50" title="Download receipt" aria-label="Download receipt"><FileText size={18} /></button><button type="button" onClick={() => void handleEmailReceipt(delivery)} disabled={isBusy} className="rounded-md p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50" title="Email receipt" aria-label="Email receipt"><Send size={18} /></button></> : null}
              </div></td>
            </tr>
          })}
        </tbody>
      </table></div></div>
    </div>
  )
}
