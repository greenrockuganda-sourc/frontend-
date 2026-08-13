'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/dashboard-layout'
import { Receipt } from '../../lib/types'
import { receiptsApi } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { Download, Eye } from 'lucide-react'
import { ReceiptTemplate } from '../../components/receipts/receipt-template'

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)

  useEffect(() => {
    fetchReceipts()
  }, [])

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      const data = await receiptsApi.getAll()
      setReceipts(data)
    } catch (err) {
      console.error('Failed to fetch receipts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (id: string) => {
    try {
      const blob = await receiptsApi.downloadPdf(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download PDF:', err)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700">
              Financial records
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Receipts</h1>
            <p className="mt-2 text-sm text-slate-500">View and manage issued receipts</p>
          </div>
        </div>

        {selectedReceipt && (
          <ReceiptTemplate
            receipt={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
          />
        )}

        <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/80 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : receipts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No receipts issued yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Receipt #</th>
                    <th className="px-6 py-3 text-left font-medium">Customer</th>
                    <th className="px-6 py-3 text-right font-medium">Total</th>
                    <th className="px-6 py-3 text-left font-medium">Issued</th>
                    <th className="px-6 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4 font-medium text-slate-900">{receipt.receiptNumber}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{receipt.customerName}</p>
                          <p className="text-xs text-slate-500">{receipt.customerEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">${receipt.total.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(receipt.issuedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReceipt(receipt)}
                            className="text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(receipt.id)}
                            className="text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
