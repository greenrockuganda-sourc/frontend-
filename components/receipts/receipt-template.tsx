'use client'

import { Receipt } from '@/lib/types'
import { Download, Mail, Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface ReceiptTemplateProps {
  receipt: Receipt
  onClose: () => void
}

export function ReceiptTemplate({ receipt, onClose }: ReceiptTemplateProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`receipt-${receipt.receiptNumber}.pdf`)
    } catch (error) {
      console.error('Failed to download PDF:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto print:shadow-none print:rounded-none print:max-w-none print:max-h-none print:p-0">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between gap-4 no-print">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Receipt Preview</h2>
            <p className="text-xs text-slate-500">{receipt.customerName} · {receipt.customerEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div ref={receiptRef} className="receipt-container p-8 print:p-6">
          {/* Main layout */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8">
              {/* Brand / Recipient */}
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-lg font-bold shadow-md">
                  SA
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Seller Admin</h3>
                  <p className="text-sm text-slate-500">Official Receipt</p>
                  <p className="mt-2 text-sm text-slate-600">{receipt.customerName}</p>
                  <p className="text-xs text-slate-400">{receipt.customerEmail} • {receipt.customerPhone}</p>
                </div>
              </div>

              {/* Items */}
              <div className="mt-6 bg-slate-50 rounded-xl p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                      <th className="py-3">Item</th>
                      <th className="py-3 text-center w-16">Qty</th>
                      <th className="py-3 text-right w-28">Unit</th>
                      <th className="py-3 text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item, i) => (
                      <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-white/60'}`}>
                        <td className="py-3 align-top">
                          <div className="font-medium text-slate-900">{item.productName}</div>
                          {item.description && <div className="text-xs text-slate-400 mt-1">{item.description}</div>}
                        </td>
                        <td className="py-3 text-center align-top">{item.quantity}</td>
                        <td className="py-3 text-right align-top">${item.price.toFixed(2)}</td>
                        <td className="py-3 text-right align-top font-semibold">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {receipt.notes && (
                <div className="mt-4 text-sm text-slate-600">
                  <strong>Notes:</strong> {receipt.notes}
                </div>
              )}
            </div>

            <aside className="col-span-12 lg:col-span-4">
              <div className="rounded-xl border border-slate-100 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Receipt</div>
                    <div className="font-bold text-slate-900 text-lg">{receipt.receiptNumber}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{formatDate(receipt.issuedAt)}</div>
                    <div className="mt-1">Order: <span className="font-mono text-slate-700">{receipt.orderId}</span></div>
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment</span>
                    <span className="font-medium text-slate-900">{receipt.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-900">${receipt.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500">Tax</span>
                    <span className="font-medium text-slate-900">${receipt.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500">Shipping</span>
                    <span className="font-medium text-slate-900">${receipt.shipping.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 text-center">
                <div className="text-sm uppercase tracking-wider opacity-90">Total</div>
                <div className="mt-2 text-2xl font-bold">${receipt.total.toFixed(2)}</div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>support@selleradmin.example</span>
                </div>
                <p className="mt-3">Receipt ID: <span className="font-mono text-slate-600">{receipt.receiptNumber}</span></p>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-slate-500 print:text-xs">
            <p>Thank you for your purchase — please keep this receipt for your records.</p>
            <p className="mt-2">Issued by: {receipt.issuedBy ?? 'Seller Admin'}</p>
          </div>

          {/* Print-only timestamp */}
          <div className="hidden print:block text-center text-xs text-slate-400 mt-6">
            <p>Printed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
