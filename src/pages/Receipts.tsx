import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Eye, Mail, PackageOpen, Printer, Search, X } from 'lucide-react'
import { downloadReceiptPdf, fetchReceipts, sendReceiptEmail } from '@/lib/api'
import { downloadBlob } from '@/lib/file-download'
import { notifyError, notifySuccess } from '@/lib/notify'
import { Receipt } from '@/types'
import ErrorMessage from '@/components/ErrorMessage'
import { SkeletonTable } from '@/components/Skeleton'
import { ReceiptTemplate } from '../../components/receipts/receipt-template'
import type { Receipt as TemplateReceipt } from '@/lib/types'

const formatCurrency = (value: number) => `UGX ${value.toFixed(2)}`

const formatReceiptDate = (value: string | null | undefined) => {
  if (!value) return ''
  const text = String(value)
  const dateOnly = text.split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().split('T')[0]
}

const readLocalReceipts = (): Receipt[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem('glow-local-receipts')
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.map((entry: any) => ({
      id: String(entry.id ?? `local-${entry.orderNumber ?? Math.random()}`),
      receiptNumber: String(entry.receiptNumber ?? `RCP-${Date.now()}`),
      orderNumber: String(entry.orderNumber ?? 'N/A'),
      customer: String(entry.customer ?? 'Customer'),
      salon: String(entry.salon ?? 'Arkles Barber'),
      amount: Number(entry.amount ?? 0),
      date: formatReceiptDate(entry.date ?? new Date().toISOString()),
      items: Array.isArray(entry.items) ? entry.items.map((item: any) => ({
        product_name: String(item.product_name ?? item.name ?? 'Item'),
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? item.price ?? 0),
        subtotal: Number(item.subtotal ?? ((Number(item.quantity ?? 0)) * (Number(item.unit_price ?? item.price ?? 0)))),
      })) : [],
    }))
  } catch {
    return []
  }
}

export default function Receipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyReceipt, setBusyReceipt] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchReceipts()
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      const remoteReceipts = list.map((receipt: any) => ({
        id: String(receipt.id ?? receipt.receipt_id ?? 'N/A'),
        receiptNumber: String(receipt.receipt_number ?? receipt.receiptNumber ?? receipt.id ?? 'N/A'),
        orderNumber: String(receipt.order_number ?? receipt.orderNumber ?? receipt.order_id ?? receipt.orderId ?? 'N/A'),
        customer: receipt.customer ?? receipt.customer_name ?? 'Guest',
        salon: receipt.salon_name ?? receipt.salon?.name ?? receipt.shop_name ?? receipt.business_name ?? receipt.store_name ?? 'Unknown salon',
        amount: Number(receipt.amount ?? receipt.total_amount ?? 0),
        date: formatReceiptDate(receipt.date ?? receipt.receipt_date ?? receipt.created_at),
        items: (Array.isArray(receipt.items) ? receipt.items : []).map((item: any) => ({
          product_name: item.product_name ?? item.name ?? 'Item',
          quantity: Number(item.quantity ?? 0),
          unit_price: Number(item.unit_price ?? item.price ?? 0),
          subtotal: Number(item.subtotal ?? item.amount ?? 0),
        })),
      }))

      const localReceipts = readLocalReceipts()
      const mergedReceipts = [...remoteReceipts, ...localReceipts]
      const dedupedReceipts = mergedReceipts.filter((receipt, index, entries) =>
        entries.findIndex((candidate) => candidate.receiptNumber === receipt.receiptNumber || candidate.id === receipt.id) === index
      )

      setReceipts(dedupedReceipts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load receipts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReceipts()
  }, [loadReceipts])

  const filteredReceipts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return receipts
    return receipts.filter((receipt) => [receipt.receiptNumber, receipt.orderNumber, receipt.customer, receipt.salon ?? '', receipt.date]
      .some((value) => value.toLowerCase().includes(query)))
  }, [receipts, searchTerm])

  const totalIssued = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)

  const handleDownload = async (receipt: Receipt) => {
    setBusyReceipt(receipt.id)
    try {
      downloadBlob(await downloadReceiptPdf(receipt.id), `${receipt.receiptNumber}.pdf`)
      notifySuccess('Receipt downloaded successfully')
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Unable to download receipt PDF.')
    } finally {
      setBusyReceipt(null)
    }
  }

  const handleEmail = async (receipt: Receipt) => {
    setBusyReceipt(receipt.id)
    try {
      await sendReceiptEmail(receipt.id)
      notifySuccess('Receipt email sent successfully')
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Unable to send receipt email.')
    } finally {
      setBusyReceipt(null)
    }
  }

  const handlePrint = () => window.print()

  const isBusy = (receipt: Receipt) => busyReceipt === receipt.id

  const convertToTemplateReceipt = (receipt: Receipt): TemplateReceipt => ({
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    orderId: receipt.orderNumber,
    customerId: receipt.id,
    customerName: receipt.customer,
    customerEmail: '',
    customerPhone: '',
    salon: receipt.salon ?? 'Arkles Barber',
    items: (receipt.items ?? []).map((item, index) => ({
      id: `${receipt.id}-${index}`,
      productId: `${receipt.id}-${index}`,
      productName: item.product_name,
      quantity: Number(item.quantity ?? 0),
      price: Number(item.unit_price ?? 0),
      total: Number(item.subtotal ?? (Number(item.quantity ?? 0) * Number(item.unit_price ?? 0))),
    })),
    subtotal: (receipt.items ?? []).reduce((sum, item) => sum + Number(item.subtotal ?? (Number(item.quantity ?? 0) * Number(item.unit_price ?? 0))), 0) || receipt.amount,
    tax: 0,
    shipping: 0,
    total: receipt.amount,
    paymentMethod: 'Mobile Money',
    issuedAt: receipt.date ? new Date(`${receipt.date}T12:00:00`).toISOString() : new Date().toISOString(),
  } as TemplateReceipt)

  return (
    <div className="page-container">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Receipts</h2>
        <p className="mt-1 text-gray-500">View, download, print, or email completed receipts.</p>
      </div>

      {error ? <div className="mb-6"><ErrorMessage message={error} onRetry={() => void loadReceipts()} /></div> : null}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Receipts issued</p><p className="mt-2 text-2xl font-bold text-gray-900">{receipts.length}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total receipted</p><p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(totalIssued)}</p></div>
        <div className="relative"><Search size={18} className="absolute left-3 top-3 text-gray-400" /><input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search receipt, order, or customer" className="h-full min-h-20 w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="responsive-table w-full">
            <thead className="border-b border-gray-200 bg-gray-50"><tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Receipt</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Salon</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? <tr><td colSpan={6}><div className="px-4"><SkeletonTable rows={5} columns={6} /></div></td></tr> : null}
              {!loading && filteredReceipts.length === 0 ? <tr><td colSpan={7}><div className="flex flex-col items-center justify-center px-4 py-12"><PackageOpen size={48} className="mb-3 text-gray-400" /><p className="text-sm font-medium text-gray-900">{receipts.length ? 'No matching receipts' : 'No receipts found'}</p><p className="mt-1 text-sm text-gray-500">{receipts.length ? 'Try another receipt number, order, customer, or date.' : 'Receipts appear after an order is completed.'}</p></div></td></tr> : null}
              {!loading && filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="transition-colors hover:bg-gray-50">
                  <td data-label="Receipt" className="px-6 py-4 text-sm font-medium text-blue-600">{receipt.receiptNumber}</td>
                  <td data-label="Order" className="px-6 py-4 text-sm text-gray-900">{receipt.orderNumber}</td>
                  <td data-label="Salon" className="px-6 py-4 text-sm text-gray-900">{receipt.salon ?? 'Unknown salon'}</td>
                  <td data-label="Customer" className="px-6 py-4 text-sm text-gray-900">{receipt.customer}</td>
                  <td data-label="Total" className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(receipt.amount)}</td>
                  <td data-label="Date" className="px-6 py-4 text-sm text-gray-500">{receipt.date}</td>
                  <td data-label="Actions" className="px-6 py-4 text-sm"><div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setSelectedReceipt(receipt)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"><Eye size={14} />Preview</button>
                    <button type="button" onClick={() => void handleDownload(receipt)} disabled={isBusy(receipt)} className="rounded-md p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50" title="Download receipt" aria-label="Download receipt"><Download size={18} /></button>
                    <button type="button" onClick={() => void handleEmail(receipt)} disabled={isBusy(receipt)} className="rounded-md p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50" title="Email receipt" aria-label="Email receipt"><Mail size={18} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceipt ? (
        <ReceiptTemplate
          receipt={convertToTemplateReceipt(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
        />
      ) : null}
    </div>
  )
}
