import type { Receipt } from '../../lib/types'

export const THERMAL_PRINTER_MODEL = 'Epson TM-T20II / 58mm thermal printer'

const ESC = '\u001b'
const GS = '\u001d'
const LF = '\n'

const padText = (value: string, width: number) => {
  const raw = String(value ?? '')
  if (raw.length >= width) return raw.slice(0, width)
  return raw + ' '.repeat(width - raw.length)
}

const formatMoney = (value: number) => `UGX ${Number(value || 0).toFixed(2)}`

const chunkText = (text: string, maxChars: number) => {
  const lines: string[] = []
  let current = text
  while (current.length > maxChars) {
    lines.push(current.slice(0, maxChars))
    current = current.slice(maxChars)
  }
  if (current.length > 0) lines.push(current)
  return lines
}

const buildReceiptText = (receipt: Receipt) => {
  const width = 32
  const rows = receipt.items || []
  const lines: string[] = []

  lines.push('GLOW')
  lines.push('SALON SUPPLIES')
  lines.push('BEAUTY • CARE • CONFIDENCE')
  lines.push('')
  lines.push('RECEIPT')
  lines.push(`No: ${receipt.receiptNumber || '—'}`)
  lines.push(`Date: ${new Date(receipt.issuedAt || Date.now()).toLocaleDateString('en-GB')}`)
  lines.push(`Cust: ${receipt.customerName || 'Walk-in'}`)
  lines.push('')
  lines.push(`${padText('Item', 18)} ${padText('Qty', 4)} ${padText('Amt', 8)}`)

  rows.forEach((item) => {
    const productName = String(item.productName || 'Item')
    const total = Number(item.total || 0)
    const nameLines = chunkText(productName, 18)
    const quantityText = String(item.quantity || 0)

    nameLines.forEach((line, index) => {
      const quantity = index === 0 ? padText(quantityText, 4) : ' '.repeat(4)
      const money = index === 0 ? padText(formatMoney(total), 8) : ' '.repeat(8)
      lines.push(`${padText(line, 18)} ${quantity} ${money}`)
    })
  })

  lines.push('')
  lines.push(`${padText('Subtotal', 18)} ${padText(formatMoney(Number(receipt.subtotal || 0)), 12)}`)
  lines.push(`${padText('Tax', 18)} ${padText(formatMoney(Number(receipt.tax || 0)), 12)}`)
  lines.push(`${padText('Shipping', 18)} ${padText(formatMoney(Number(receipt.shipping || 0)), 12)}`)
  lines.push(`${padText('TOTAL', 18)} ${padText(formatMoney(Number(receipt.total || receipt.subtotal || 0)), 12)}`)
  lines.push('')
  lines.push('Payment Successful')
  lines.push('Thank you for choosing Glow Salon Supplies!')
  lines.push('0746998111 / 0771616736')
  lines.push('glowsalonsupplies24@gmail.com')
  lines.push('')
  lines.push('')

  return lines.map((line) => line.slice(0, width)).join(LF)
}

export const buildEpsonTmT20ReceiptCommand = (receipt: Receipt) => {
  const text = buildReceiptText(receipt)

  const bytes = [
    ESC, '@',
    ESC, '!', '\x00',
    ESC, 'a', '0',
    ESC, 'd', '4',
  ]

  const body = text
    .split(LF)
    .map((line) => `${line}\n`)
    .join('')

  const payload = new TextEncoder().encode(body)
  const feed = new Uint8Array([0x0a, 0x0a, 0x1b, 0x64, 0x04])

  return new Uint8Array([...bytes.map((piece) => piece.charCodeAt(0)), ...payload, ...feed])
}

export const hasDirectPrinterSupport = () => {
  const nav = navigator as any
  return !!(nav.serial || nav.usb || nav.bluetooth)
}

export const requestSerialPrinter = async (receipt: Receipt): Promise<boolean> => {
  const nav = navigator as any
  if (!nav.serial) return false

  try {
    const port = await nav.serial.requestPort({
      filters: [{ usbVendorId: 0x04b8 }, { usbVendorId: 0x0fe6 }, { usbVendorId: 0x1a86 }],
    })

    await port.open({ baudRate: 115200 })
    const writer = port.writable?.getWriter()
    if (!writer) return false

    const data = buildEpsonTmT20ReceiptCommand(receipt)
    await writer.write(data)
    writer.releaseLock()
    await port.close()
    return true
  } catch (error) {
    console.error('Serial printer connection failed:', error)
    return false
  }
}

export const requestUsbPrinter = async (receipt: Receipt): Promise<boolean> => {
  const nav = navigator as any
  if (!nav.usb) return false

  try {
    const device = await nav.usb.requestDevice({
      filters: [{ vendorId: 0x04b8 }, { vendorId: 0x0fe6 }, { vendorId: 0x1a86 }],
    })

    if (!device) return false
    await device.open()
    await device.selectConfiguration(1)
    await device.claimInterface(0)

    const buffer = buildEpsonTmT20ReceiptCommand(receipt)
    const endpoint = device.configuration?.interfaces[0]?.alternate?.endpoints?.find((endpointItem: any) => endpointItem.direction === 'out')
    if (!endpoint) {
      await device.close()
      return false
    }

    await device.transferOut(endpoint.endpointNumber, buffer)
    await device.close()
    return true
  } catch (error) {
    console.error('USB printer connection failed:', error)
    return false
  }
}

export const requestBluetoothPrinter = async (receipt: Receipt): Promise<boolean> => {
  const nav = navigator as any
  if (!nav.bluetooth) return false

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: false,
      filters: [{ services: ['00001101-0000-0000-8000-00805f9b34fb'] }],
    })

    const gatt = await device.gatt?.connect()
    const service = await gatt?.getPrimaryService('00001101-0000-0000-8000-00805f9b34fb')
    const characteristic = await service?.getCharacteristic('00000003-0000-1000-8000-00805f9b34fb')
    if (!characteristic) return false

    const data = buildEpsonTmT20ReceiptCommand(receipt)
    await characteristic.writeValue(data)
    await device.gatt?.disconnect()
    return true
  } catch (error) {
    console.error('Bluetooth printer connection failed:', error)
    return false
  }
}

export const printReceiptDirectly = async (receipt: Receipt): Promise<boolean> => {
  const directPaths: Array<() => Promise<boolean>> = [requestSerialPrinter, requestUsbPrinter, requestBluetoothPrinter]

  for (const run of directPaths) {
    try {
      const ok = await run(receipt)
      if (ok) return true
    } catch {
      // continue to next supported printer path
    }
  }

  return false
}
