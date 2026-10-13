import type { Receipt } from '../../lib/types'

export const THERMAL_PRINTER_MODEL = '58 mm ESC/POS thermal printer'
export const THERMAL_RECEIPT_WIDTH_MM = 58

const ESC = '\u001b'
const GS = '\u001d'
const LF = '\n'

const padText = (value: string, width: number) => {
  const raw = String(value ?? '')
  if (raw.length >= width) return raw.slice(0, width)
  return raw + ' '.repeat(width - raw.length)
}

// A standard 58 mm ESC/POS roll is 32 characters wide at the default font.
const formatMoney = (value: number) => Math.round(Number(value || 0)).toLocaleString('en-US')

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
  lines.push('--------------------------------')
  lines.push(`${padText('Item', 16)} ${padText('Qty', 3)} ${padText('Amount', 11)}`)
  lines.push('--------------------------------')

  rows.forEach((item) => {
    const productName = String(item.productName || 'Item')
    const total = Number(item.total || 0)
    const nameLines = chunkText(productName, 16)
    const quantityText = String(item.quantity || 0)

    nameLines.forEach((line, index) => {
      const quantity = index === 0 ? padText(quantityText, 3) : ' '.repeat(3)
      const money = index === 0 ? padText(formatMoney(total), 11) : ' '.repeat(11)
      lines.push(`${padText(line, 16)} ${quantity} ${money}`)
    })
  })

  lines.push('--------------------------------')
  lines.push(`${padText('Subtotal', 20)} ${padText(formatMoney(Number(receipt.subtotal || 0)), 11)}`)
  if (Number(receipt.tax || 0)) lines.push(`${padText('Tax', 20)} ${padText(formatMoney(Number(receipt.tax || 0)), 11)}`)
  if (Number(receipt.shipping || 0)) lines.push(`${padText('Shipping', 20)} ${padText(formatMoney(Number(receipt.shipping || 0)), 11)}`)
  lines.push(`${padText('TOTAL (UGX)', 20)} ${padText(formatMoney(Number(receipt.total || receipt.subtotal || 0)), 11)}`)
  lines.push('--------------------------------')
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
  // Feed four lines and issue a partial cut when supported by the printer.
  const feed = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x01])

  return new Uint8Array([...bytes.map((piece) => piece.charCodeAt(0)), ...payload, ...feed])
}

export const hasDirectPrinterSupport = () => {
  const nav = navigator as any
  return !!(nav.serial || nav.usb || nav.bluetooth)
}

const companionUrl = () => String(import.meta.env.VITE_THERMAL_PRINTER_COMPANION_URL || 'http://127.0.0.1:4001').replace(/\/$/, '')

/**
 * The local companion can enumerate serial ports and print without exposing the
 * computer's device list to the browser. It is tried before the browser picker.
 */
export const printWithLocalCompanion = async (receipt: Receipt): Promise<boolean> => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 1600)

  try {
    const response = await fetch(`${companionUrl()}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt }),
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => null)
    return response.ok && payload?.ok === true
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

export const requestSerialPrinter = async (receipt: Receipt): Promise<boolean> => {
  const nav = navigator as any
  if (!nav.serial) return false

  try {
    // Requesting without a vendor filter lets the operator choose any supported
    // USB-to-serial thermal printer (many 58 mm models use different chipsets).
    const port = await nav.serial.requestPort()

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
  if (await printWithLocalCompanion(receipt)) return true

  // Do not open multiple competing browser pickers. When serial is unavailable
  // or cancelled, the receipt preview falls back to the OS print dialog.
  const directPaths: Array<() => Promise<boolean>> = [requestSerialPrinter]

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
