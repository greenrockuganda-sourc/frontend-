'use client'

import { Receipt } from '../../lib/types'
import { Download, Printer, X } from 'lucide-react'
import { Button } from '../ui/button'
import { useMemo, useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface ReceiptTemplateProps {
  receipt: Receipt
  onClose: () => void
}

const formatCurrency = (value: number) => `UGX ${Number(value || 0).toFixed(2)}`

const formatReceiptDate = (dateString: string) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ReceiptTemplate({ receipt, onClose }: ReceiptTemplateProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const qrCodeUrl = useMemo(() => {
    const payload = String(receipt.receiptNumber || 'receipt').trim() || 'receipt'
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(payload)}`
  }, [receipt.receiptNumber])

  const salonName = (receipt as any).salon || (receipt as any).salonName || 'Arkles Barber'
  const customerName = receipt.customerName || (receipt as any).customer || 'Customer'
  const orderId = receipt.orderId || 'ORD-0000000'
  const itemSubtotal = receipt.items.reduce((sum, item) => sum + Number(item.total || 0), 0) || receipt.subtotal || 0

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[980px] overflow-y-auto rounded-[20px] bg-[#edf5fa] shadow-2xl print:max-h-none print:rounded-none print:shadow-none">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 p-5 backdrop-blur-sm no-print">
          <h2 className="text-xl font-bold text-slate-900">Receipt Preview</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex gap-2 border-b border-slate-200 bg-[#f4f7fa] p-4 no-print">
          <Button variant="default" size="sm" onClick={handleDownloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        <div ref={receiptRef} className="bg-[#edf4fa] p-2 text-slate-900 sm:p-4">
          <div className="mx-auto w-full max-w-[700px] overflow-hidden rounded-[24px] bg-[#edf4fa] shadow-[0_18px_45px_rgba(13,45,72,0.15)]">
            <div className="relative overflow-hidden bg-[#0d2d48] px-4 pb-8 pt-6 text-white sm:px-6 sm:pb-9 sm:pt-7 lg:px-8 lg:pb-10 lg:pt-8">
              <div className="absolute -left-14 bottom-[-60px] h-36 w-36 rounded-full bg-[#f97316]/20 blur-2xl" />
              <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-[#f97316]/15 blur-2xl" />

              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-[2.1rem] font-black leading-[0.8] tracking-[-0.08em] text-white sm:text-[3.5rem] lg:text-[4.8rem]">GLOW</div>
                  <div className="mt-1 text-[0.5rem] font-bold uppercase tracking-[0.3em] text-[#dfeaf7] sm:text-[0.62rem]">SALON SUPPLIES</div>
                  <div className="mt-2 text-[0.46rem] font-semibold uppercase tracking-[0.24em] text-[#dfeaf7] sm:text-[0.56rem]">BEAUTY • CARE • CONFIDENCE</div>
                </div>

                <div className="max-w-[22rem] text-left lg:text-right">
                  <div
                    className="leading-[0.9] tracking-[-0.04em] text-[#f7b46f] text-[1.7rem] sm:text-[2.4rem] lg:text-[3.2rem]"
                    style={{ fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' }}
                  >
                    Thank you
                  </div>
                  <div
                    className="leading-[0.9] tracking-[-0.04em] text-[#f7b46f] text-[1.7rem] sm:text-[2.4rem] lg:text-[3.2rem]"
                    style={{ fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' }}
                  >
                    for your order!
                  </div>
                  <div className="mt-2 text-sm text-[#dfeaf7]">Your support helps us keep providing quality beauty products.</div>
                </div>
              </div>
            </div>

            <div className="bg-[#edf4fa] px-3 pb-5 pt-5 sm:px-4 sm:pb-6 sm:pt-6">
              <div className="flex flex-col gap-3 rounded-[18px] border border-[#dfeaf3] bg-[#f7fbff] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f97316] text-lg text-white shadow-[0_10px_20px_rgba(249,115,22,0.25)]">🧾</div>
                  <div className="min-w-0">
                    <div className="text-[1.7rem] font-extrabold uppercase tracking-[-0.04em] text-[#0d2d48] sm:text-[2rem]">Receipt</div>
                    <div className="hidden text-[13px] font-semibold text-[#4e6d89] sm:block">Salon Supplies • Order Confirmation</div>
                  </div>
                </div>

                <div className="rounded-[14px] border border-[#f4b870] bg-[#f9d5a8] px-4 py-3 text-left shadow-[0_8px_18px_rgba(249,115,22,0.18)] sm:min-w-[220px]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0d2d48]">Order ID</div>
                  <div className="mt-1 break-all text-[1.3rem] font-black tracking-tight text-[#0d2d48] sm:text-[1.6rem]">{receipt.receiptNumber}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex min-w-0 items-center gap-3 rounded-[16px] border border-[#dfeaf3] bg-[#f4f9fc] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-lg text-white">📅</div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#576f89]">Date</div>
                    <div className="mt-1 text-[14px] font-extrabold text-[#0d2d48] sm:text-[15px]">{formatReceiptDate(receipt.issuedAt)}</div>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-3 rounded-[16px] border border-[#dfeaf3] bg-[#f4f9fc] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-lg text-white">🧾</div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#576f89]">Order</div>
                    <div className="mt-1 truncate text-[12px] font-extrabold text-[#0d2d48] sm:text-[14px]">{orderId}</div>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-3 rounded-[16px] border border-[#dfeaf3] bg-[#f4f9fc] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-lg text-white">👤</div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#576f89]">Customer</div>
                    <div className="mt-1 break-words text-[14px] font-extrabold text-[#0d2d48] sm:text-[16px]">{customerName}</div>
                  </div>
                </div>

                <div className="rounded-[16px] border border-[#dfeaf3] bg-[#f4f9fc] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#576f89]">Scan to verify</div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-[12px] font-bold text-white">✓</div>
                  </div>
                  <div className="mt-3 flex justify-center">
                    <img src={qrCodeUrl} alt={`QR code for receipt ${receipt.receiptNumber}`} className="h-[96px] w-[96px] rounded-[12px] border border-[#dfeaf3] bg-white p-2 object-contain sm:h-[110px] sm:w-[110px]" />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex min-w-0 items-center gap-3 rounded-[16px] border border-[#dfeaf3] bg-[#f4f9fc] p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-lg text-white">🏬</div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#576f89]">Salon</div>
                  <div className="mt-1 break-words text-[16px] font-extrabold text-[#0d2d48] sm:text-[18px]">{salonName}</div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[18px] border border-[#dfeaf3] bg-white">
                <div className="grid grid-cols-[1.8fr_1.2fr_0.8fr] bg-[#0d2d48] px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white sm:px-4 sm:text-[12px]">
                  <div>Item</div>
                  <div className="text-center">Qty × Price</div>
                  <div className="text-right">Total</div>
                </div>

                {receipt.items && receipt.items.length > 0 ? (
                  receipt.items.map((item, index) => (
                    <div key={`${item.id || index}`} className="grid grid-cols-[1.8fr_1.2fr_0.8fr] items-center gap-2 border-t border-[#e5edf4] px-3 py-4 text-[13px] text-slate-700 last:border-b-0 sm:px-4 sm:text-[15px]">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dfeaf3] bg-[#f7fafc] text-sm text-[#0d2d48] sm:h-10 sm:w-10">📄</div>
                        <div className="min-w-0 break-words font-extrabold text-[#0d2d48]">{item.productName}</div>
                      </div>
                      <div className="text-center font-semibold text-slate-700">
                        {item.quantity} × {formatCurrency(item.price)}
                      </div>
                      <div className="text-right font-extrabold text-[#0d2d48]">{formatCurrency(item.total)}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-5 text-slate-500">No item details available.</div>
                )}
              </div>

              <div className="mt-6 overflow-hidden rounded-[18px] bg-[#0d2d48] px-4 py-5 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-[#fff4e6]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ffb15d] bg-[#123a5a] text-lg text-[#ffb15d]">💰</div>
                    <div className="text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#fffaf5] sm:text-[1.7rem]">Total</div>
                  </div>
                  <div className="text-right text-[1.4rem] font-black tracking-[-0.04em] text-[#ff9b3d] sm:text-[2rem]">
                    {formatCurrency(receipt.total || itemSubtotal || receipt.subtotal || 0)}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4 rounded-[16px] border border-[#dfeaf3] bg-[#eaf8f4] p-3 text-[#0d2d48] sm:p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b8f73] text-lg text-white">✓</div>
                <div className="min-w-0">
                  <div className="text-[1rem] font-extrabold sm:text-[1.2rem]">Payment Successful</div>
                  <div className="text-[13px] text-slate-600 sm:text-[14px]">Thank you for choosing Glow Salon Supplies!</div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 rounded-[18px] border border-[#dfeaf3] bg-[#edf4fa] p-3 sm:grid-cols-3 sm:p-4">
                <div className="flex items-center justify-center gap-3 text-center text-[#0d2d48]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#f97316] text-sm text-[#f97316] sm:h-10 sm:w-10">✓</div>
                  <span className="text-[13px] font-extrabold sm:text-[15px]">Quality Products</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-center text-[#0d2d48]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#f97316] text-sm text-[#f97316] sm:h-10 sm:w-10">✦</div>
                  <span className="text-[13px] font-extrabold sm:text-[15px]">Trusted Brand</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-center text-[#0d2d48]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#f97316] text-sm text-[#f97316] sm:h-10 sm:w-10">★</div>
                  <span className="text-[13px] font-extrabold sm:text-[15px]">Your Beauty, Our Priority</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-[#0d2d48] px-4 pb-7 pt-7 text-white sm:px-6 sm:pb-8 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-9">
              <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.3),_transparent_32%)]" />
              <div className="absolute -left-14 bottom-[-34px] h-20 w-24 rounded-[50%] bg-[#f97316]" />
              <div className="absolute -right-14 bottom-[-34px] h-20 w-24 rounded-[50%] bg-[#f97316]" />

              <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div
                  className="text-[2rem] font-black leading-none tracking-[-0.04em] text-[#f7b46f] sm:text-[2.8rem]"
                  style={{ fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' }}
                >
                  Glow Salon Supplies
                </div>

                <div className="grid gap-2 text-[12px] font-medium text-slate-200 sm:grid-cols-3 sm:items-center sm:text-[13px]">
                  <div className="flex items-center gap-2"><span>📞</span><span>+256 700 123 456</span></div>
                  <div className="flex items-center gap-2"><span>✉</span><span>support@glow.ug</span></div>
                  <div className="flex items-center gap-2"><span>📍</span><span>Kampala, Uganda</span></div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm sm:h-10 sm:w-10">f</div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm sm:h-10 sm:w-10">◎</div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm sm:h-10 sm:w-10">x</div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm sm:h-10 sm:w-10">▶</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
