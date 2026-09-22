'use client'

import { Receipt } from '../../lib/types'
import { Download, Printer, X } from 'lucide-react'
import { Button } from '../ui/button'
import { useMemo, useRef } from 'react'
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
  const getItemImageUrl = (item: any) => {
    return item?.imageUrl || item?.image_url || item?.productImage || item?.image || item?.product?.image || item?.product?.image_url || null
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=420,height=900')
    if (!printWindow) {
      window.print()
      return
    }

    const receiptItems = receipt.items?.length
      ? receipt.items.map((item) => {
          const imageUrl = getItemImageUrl(item)
          return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              ${imageUrl ? `<img src="${imageUrl}" alt="${item.productName || 'Item'}" style="width:24px; height:24px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;" />` : '<div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:6px; border:1px solid #e2e8f0; background:#f8fafc; font-size:12px;">📄</div>'}
              <span>${item.productName || 'Item'}</span>
            </div>
          </td>
          <td>${item.quantity || 0}</td>
          <td>${formatCurrency(Number(item.total || 0))}</td>
        </tr>
      `
        }).join('')
      : '<tr><td colspan="3">No item details available.</td></tr>'

    const printMarkup = `<!doctype html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 12px;
              background: #fff;
              font-family: Arial, sans-serif;
              color: #0f172a;
            }
            .receipt {
              width: 80mm;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              padding: 10px;
            }
            h1 { font-size: 22px; margin: 0; text-align: center; }
            .meta { font-size: 11px; line-height: 1.5; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            td { border-top: 1px solid #e2e8f0; padding: 5px 0; vertical-align: top; }
            .total { margin-top: 10px; font-size: 14px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>GLOW</h1>
            <div class="meta">
              <div>Receipt: ${receipt.receiptNumber || '—'}</div>
              <div>Customer: ${customerName}</div>
              <div>Date: ${formatReceiptDate(receipt.issuedAt)}</div>
            </div>
            <table>
              <tbody>${receiptItems}</tbody>
            </table>
            <div class="total">Total: ${formatCurrency(receipt.total || itemSubtotal || receipt.subtotal || 0)}</div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printMarkup)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 220],
      })

      const pageWidth = 80
      const margin = 5
      let y = 8

      doc.setFillColor(13, 45, 72)
      doc.roundedRect(0, 0, pageWidth, 36, 0, 0, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('GLOW', pageWidth / 2, 12, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('SALON SUPPLIES', pageWidth / 2, 18, { align: 'center' })
      doc.text('BEAUTY • CARE • CONFIDENCE', pageWidth / 2, 23, { align: 'center' })
      doc.setTextColor(247, 180, 111)
      doc.setFont('helvetica', 'bold')
      doc.text('THANK YOU', pageWidth / 2, 32, { align: 'center' })

      y = 42
      doc.setTextColor(15, 23, 42)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('RECEIPT', margin + 2, y + 6)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(String(receipt.receiptNumber || '—'), margin + 2, y + 12)
      doc.setFillColor(249, 213, 168)
      doc.roundedRect(pageWidth - 32, y + 1, 26, 13, 2, 2, 'F')
      doc.setTextColor(13, 45, 72)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL', pageWidth - 30, y + 6, { align: 'center' })
      doc.setFontSize(7)
      doc.text(`${formatCurrency(receipt.total || itemSubtotal || receipt.subtotal || 0)}`, pageWidth - 30, y + 11, { align: 'center' })

      y = 64
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(7)
      doc.text(`Date: ${formatReceiptDate(receipt.issuedAt)}`, margin, y)
      y += 5
      doc.text(`Customer: ${customerName}`, margin, y)
      y += 5
      doc.text(`Order: ${orderId}`, margin, y)
      y += 8

      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.25)
      doc.line(margin, y, pageWidth - margin, y)
      y += 4

      const items = receipt.items && receipt.items.length > 0 ? receipt.items : []
      if (items.length === 0) {
        doc.setFontSize(8)
        doc.text('No item details available.', margin, y)
        y += 8
      } else {
        items.forEach((item) => {
          const name = String(item.productName || 'Item').slice(0, 20)
          const qty = String(item.quantity || 0)
          const total = formatCurrency(Number(item.total || 0))
          doc.setFontSize(7)
          doc.text(name, margin, y)
          doc.text(`${qty} x`, pageWidth - 22, y)
          doc.text(total, pageWidth - margin, y, { align: 'right' })
          y += 5
        })
      }

      y += 4
      doc.line(margin, y, pageWidth - margin, y)
      y += 7

      doc.setFillColor(13, 45, 72)
      doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL', margin + 2, y + 7)
      doc.text(formatCurrency(receipt.total || itemSubtotal || receipt.subtotal || 0), pageWidth - margin - 2, y + 7, { align: 'right' })

      y += 16
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(7)
      doc.text('Payment Successful', margin, y)
      y += 5
      doc.text('Thank you for choosing Glow Salon Supplies!', margin, y)
      y += 10

      doc.setDrawColor(13, 45, 72)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6
      doc.setFontSize(6.5)
      doc.text('0746998111 / 0772616736', margin, y)
      doc.text('glowsalonsupplies24@gmail.com', pageWidth / 2, y)

      const filename = `receipt-${String(receipt.receiptNumber || 'receipt').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')}.pdf`

      try {
        const pdfBlob = doc.output('blob')
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch {
        doc.save(filename)
      }
    } catch (error) {
      console.error('Failed to download PDF:', error)
      window.alert('The PDF could not be generated. Please try again.')
    }
  }

  return (
    <>
      <style>{`
        @media print {
          body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .receipt-modal-shell {
            width: 80mm !important;
            max-width: 80mm !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .receipt-print-wrap {
            max-width: 80mm !important;
            width: 80mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="receipt-modal-shell max-h-[90vh] w-full max-w-[420px] overflow-y-auto rounded-[20px] bg-[#edf5fa] shadow-2xl print:max-h-none print:rounded-none print:shadow-none print:max-w-none">
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
          <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[18px] bg-[#edf4fa] shadow-[0_18px_45px_rgba(13,45,72,0.15)] print:max-w-[80mm] print:rounded-none print:shadow-none">
            <div className="relative overflow-hidden bg-[#0d2d48] px-4 pb-8 pt-6 text-white sm:px-6 sm:pb-9 sm:pt-7 lg:px-8 lg:pb-10 lg:pt-8">
              <div className="absolute -left-14 bottom-[-60px] h-36 w-36 rounded-full bg-[#f97316]/20 blur-2xl" />
              <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-[#f97316]/15 blur-2xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[1.8rem] font-black leading-[0.85] tracking-[-0.08em] text-white sm:text-[2.5rem]">GLOW</div>
                  <div className="mt-1 text-[0.46rem] font-bold uppercase tracking-[0.24em] text-[#dfeaf7] sm:text-[0.55rem]">SALON SUPPLIES</div>
                  <div className="mt-2 text-[0.42rem] font-semibold uppercase tracking-[0.2em] text-[#dfeaf7] sm:text-[0.5rem]">BEAUTY • CARE • CONFIDENCE</div>
                </div>

                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[16px] border border-white/20 bg-white/10 p-2 shadow-[0_8px_20px_rgba(15,23,42,0.25)] backdrop-blur-sm sm:h-24 sm:w-24">
                  <img src={qrCodeUrl} alt={`QR code for receipt ${receipt.receiptNumber}`} className="h-full w-full rounded-[10px] bg-white p-1 object-contain" />
                </div>
              </div>

              <div className="relative mt-5 max-w-full text-left">
                <div
                  className="leading-[0.95] tracking-[-0.04em] text-[#f7b46f] text-[1.3rem] sm:text-[1.8rem]"
                  style={{ fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' }}
                >
                  Thank you
                </div>
                <div
                  className="leading-[0.95] tracking-[-0.04em] text-[#f7b46f] text-[1.3rem] sm:text-[1.8rem]"
                  style={{ fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' }}
                >
                  for your order!
                </div>
                <div className="mt-2 text-[0.7rem] leading-4 text-[#dfeaf7]">Your support helps us keep providing quality beauty products.</div>
              </div>
            </div>

            <div className="bg-[#edf4fa] px-3 pb-5 pt-5 sm:px-4 sm:pb-6 sm:pt-6">
              <div className="flex flex-col gap-3 rounded-[18px] border border-[#dfeaf3] bg-[#f7fbff] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f97316] text-lg text-white shadow-[0_10px_20px_rgba(249,115,22,0.25)]">🧾</div>
                  <div className="min-w-0">
                    <div className="text-[1.4rem] font-extrabold uppercase tracking-[-0.04em] text-[#0d2d48] sm:text-[1.7rem]">Receipt</div>
                    <div className="hidden text-[11px] font-semibold text-[#4e6d89] sm:block">Salon Supplies • Order Confirmation</div>
                  </div>
                </div>

                <div className="rounded-[14px] border border-[#f4b870] bg-[#f9d5a8] px-3 py-2 text-left shadow-[0_8px_18px_rgba(249,115,22,0.18)] sm:min-w-[180px]">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0d2d48]">Order ID</div>
                  <div className="mt-1 break-all text-[1rem] font-black tracking-tight text-[#0d2d48] sm:text-[1.2rem]">{receipt.receiptNumber}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="flex min-w-0 items-center gap-3 rounded-[16px] border border-[#dfeaf3] bg-[#f4f9fc] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-lg text-white">📅</div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#576f89]">Date</div>
                    <div className="mt-1 text-[13px] font-extrabold leading-snug text-[#0d2d48] sm:text-[14px]">{formatReceiptDate(receipt.issuedAt)}</div>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-3 rounded-[16px] border border-[#dfeaf3] bg-[#f4f9fc] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-lg text-white">🧾</div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#576f89]">Order</div>
                    <div className="mt-1 break-all text-[11px] font-extrabold leading-snug text-[#0d2d48] sm:text-[12px]">{orderId}</div>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-3 rounded-[16px] border border-[#dfeaf3] bg-[#f4f9fc] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-lg text-white">👤</div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#576f89]">Customer</div>
                    <div className="mt-1 break-words text-[12px] font-extrabold leading-snug text-[#0d2d48] sm:text-[13px]">{customerName}</div>
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
                  receipt.items.map((item, index) => {
                    const imageUrl = getItemImageUrl(item)

                    return (
                      <div key={`${item.id || index}`} className="grid grid-cols-[1.8fr_1.2fr_0.8fr] items-center gap-2 border-t border-[#e5edf4] px-3 py-4 text-[13px] text-slate-700 last:border-b-0 sm:px-4 sm:text-[15px]">
                        <div className="flex min-w-0 items-center gap-3">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.productName || 'Product'}
                              className="h-9 w-9 shrink-0 rounded-lg border border-[#dfeaf3] bg-[#f7fafc] object-cover sm:h-10 sm:w-10"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dfeaf3] bg-[#f7fafc] text-sm text-[#0d2d48] sm:h-10 sm:w-10">📄</div>
                          )}
                          <div className="min-w-0 break-words font-extrabold text-[#0d2d48]">{item.productName}</div>
                        </div>
                        <div className="text-center font-semibold text-slate-700">
                          {item.quantity} × {formatCurrency(item.price)}
                        </div>
                        <div className="text-right font-extrabold text-[#0d2d48]">{formatCurrency(item.total)}</div>
                      </div>
                    )
                  })
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

              <div className="relative flex flex-col gap-4">
                <div
                  className="text-[2rem] font-black leading-none tracking-[-0.04em] text-[#f7b46f] sm:text-[2.8rem]"
                  style={{ fontFamily: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' }}
                >
                  Glow Salon Supplies
                </div>

                <div className="grid gap-2 text-[11px] font-medium text-slate-200 sm:text-[12px]">
                  <div className="flex items-center gap-2 break-words"><span className="w-4 shrink-0 text-center">📞</span><span>0746998111 / 0772616736</span></div>
                  <div className="flex items-center gap-2 break-words"><span className="w-4 shrink-0 text-center">✉</span><span>glowsalonsupplies24@gmail.com</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
