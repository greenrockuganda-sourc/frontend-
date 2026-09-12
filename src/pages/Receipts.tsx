import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Eye, Mail, PackageOpen, Printer, Search, X } from 'lucide-react'
import { downloadReceiptPdf, fetchReceipts, sendReceiptEmail } from '@/lib/api'
import { downloadBlob } from '@/lib/file-download'
import { notifyError, notifySuccess } from '@/lib/notify'
import { Receipt } from '@/types'
import ErrorMessage from '@/components/ErrorMessage'
import { SkeletonTable } from '@/components/Skeleton'

const formatCurrency = (value: number) => `UGX ${value.toFixed(2)}`

const formatReceiptDate = (value: string | null | undefined) => {
  if (!value) return ''
  const text = String(value)
  const dateOnly = text.split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().split('T')[0]
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
      setReceipts(list.map((receipt: any) => ({
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
      })))
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

      {selectedReceipt ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="receipt-container max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-8">
        <div className="no-print mb-6 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Receipt preview</p><h3 className="text-xl font-bold text-gray-900">{selectedReceipt.receiptNumber}</h3></div><button type="button" onClick={() => setSelectedReceipt(null)} className="rounded p-2 text-gray-500 hover:text-gray-700" aria-label="Close receipt"><X size={20} /></button></div>
        <article className="thermal-receipt border border-slate-200 bg-white p-5 text-slate-800 sm:p-8"><header className="border-b-2 border-slate-900 pb-5 text-center"><p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600">Seller Dashboard</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">SALES RECEIPT</h2><p className="mt-2 text-sm text-slate-500">Thank you for your order</p></header><div className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-slate-200 py-5 text-sm"><p><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Receipt</span><span className="font-semibold">{selectedReceipt.receiptNumber}</span></p><p><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Date</span><span className="font-semibold">{selectedReceipt.date}</span></p><p><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Order</span><span className="font-semibold">{selectedReceipt.orderNumber}</span></p><p><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Salon</span><span className="font-semibold">{selectedReceipt.salon ?? 'Unknown salon'}</span></p><p><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</span><span className="font-semibold">{selectedReceipt.customer}</span></p></div><div className="py-5"><div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-300 pb-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span>Item</span><span>Qty × price</span><span>Subtotal</span></div>{selectedReceipt.items?.length ? selectedReceipt.items.map((item, index) => <div key={`${selectedReceipt.id}-${index}`} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-dashed border-slate-200 py-3 text-sm"><span className="font-medium">{item.product_name}</span><span className="text-right text-slate-600">{item.quantity} × {formatCurrency(item.unit_price)}</span><span className="text-right font-semibold">{formatCurrency(item.subtotal)}</span></div>) : <p className="py-3 text-sm text-slate-500">No items available.</p>}</div><div className="ml-auto max-w-xs space-y-2 border-t-2 border-slate-900 pt-4 text-sm"><div className="flex justify-between text-slate-600"><span>Items subtotal</span><span>{formatCurrency(selectedReceipt.items?.reduce((sum, item) => sum + item.subtotal, 0) ?? selectedReceipt.amount)}</span></div><div className="flex justify-between text-xl font-black text-slate-950"><span>Total</span><span>{formatCurrency(selectedReceipt.amount)}</span></div></div><footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">Keep this receipt for your records.<br />Powered by Seller Dashboard</footer></article>
        <div className="no-print mt-6 flex flex-wrap gap-2"><button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Printer size={16} />Print to Bluetooth / printer</button><button type="button" onClick={() => void handleDownload(selectedReceipt)} disabled={isBusy(selectedReceipt)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Download size={16} />Download PDF</button><button type="button" onClick={() => void handleEmail(selectedReceipt)} disabled={isBusy(selectedReceipt)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Mail size={16} />Email</button></div><p className="no-print mt-3 text-xs text-gray-500">Choose your paired Bluetooth receipt printer in the print dialog.</p>
      </div></div> : null}
    </div>
  )
}
