import express from 'express'
import { SerialPort } from 'serialport'

const app = express()
const port = Number(process.env.PORT || 4001)

// Epson, FTDI and CH340 are common USB-to-serial chipsets in 58 mm printers.
const vendorIds = [0x04b8, 0x0403, 0x0fe6, 0x1a86]

const padText = (value, width) => {
  const text = String(value ?? '')
  if (text.length >= width) return text.slice(0, width)
  return text + ' '.repeat(width - text.length)
}

const buildEscPosReceipt = (receipt) => {
  const lines = []
  const width = 32

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

  ;(receipt.items || []).forEach((item) => {
    const lineName = String(item.productName || 'Item')
    const total = Number(item.total || 0)
    const nameSlice = lineName.length > 18 ? lineName.slice(0, 18) : lineName
    lines.push(`${padText(nameSlice, 18)} ${padText(String(item.quantity || 0), 4)} ${padText(`UGX ${Number(total || 0).toFixed(2)}`, 8)}`)
  })

  lines.push('')
  lines.push(`${padText('Subtotal', 18)} ${padText(`UGX ${Number(receipt.subtotal || 0).toFixed(2)}`, 12)}`)
  lines.push(`${padText('Tax', 18)} ${padText(`UGX ${Number(receipt.tax || 0).toFixed(2)}`, 12)}`)
  lines.push(`${padText('Shipping', 18)} ${padText(`UGX ${Number(receipt.shipping || 0).toFixed(2)}`, 12)}`)
  lines.push(`${padText('TOTAL', 18)} ${padText(`UGX ${Number(receipt.total || receipt.subtotal || 0).toFixed(2)}`, 12)}`)
  lines.push('')
  lines.push('Payment Successful')
  lines.push('Thank you for choosing Glow Salon Supplies!')
  lines.push('0746998111 / 0771616736')
  lines.push('glowsalonsupplies24@gmail.com')
  lines.push('')

  const body = lines.map((line) => line.slice(0, width)).join('\n')
  const esc = Buffer.from([0x1b, 0x40, 0x1b, 0x61, 0x00, 0x1b, 0x64, 0x04])
  const ending = Buffer.from([0x0a, 0x0a])
  return Buffer.concat([esc, Buffer.from(body, 'latin1'), ending])
}

const findPrinterPort = async () => {
  const ports = await SerialPort.list()
  const match = ports.find((device) => vendorIds.includes(Number(device.vendorId || 0)))
  // Some low-cost printers do not expose a vendor ID. A single connected serial
  // device is safe to treat as the printer; with several devices, require a match.
  return match?.path || (ports.length === 1 ? ports[0].path : null)
}

const printToPort = async (receipt, portPath) => {
  const portPathToUse = portPath || (await findPrinterPort())
  if (!portPathToUse) {
    throw new Error('No supported thermal printer port found.')
  }

  const serialPort = new SerialPort({ path: portPathToUse, baudRate: 115200 })
  const payload = buildEscPosReceipt(receipt)

  await new Promise((resolve, reject) => {
    serialPort.once('open', () => {
      serialPort.write(payload, (err) => {
        if (err) return reject(err)
        serialPort.close((closeErr) => {
          if (closeErr) return reject(closeErr)
          resolve()
        })
      })
    })

    serialPort.once('error', reject)
  })
}

// The dashboard is normally served from a different localhost port.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  // Required by Chromium when a hosted dashboard calls a localhost device service.
  res.header('Access-Control-Allow-Private-Network', 'true')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.use(express.json({ limit: '1mb' }))

app.get('/status', async (_req, res) => {
  try {
    const ports = await SerialPort.list()
    const printers = ports.map((item) => ({
      path: item.path,
      manufacturer: item.manufacturer || 'Unknown device',
      vendorId: item.vendorId,
      productId: item.productId,
      supported: vendorIds.includes(Number(item.vendorId || 0)),
    }))
    res.json({ ok: true, model: '58 mm ESC/POS thermal printer', ports: printers, discovered: printers.filter((item) => item.supported) })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.post('/print', async (req, res) => {
  try {
    const { receipt, port } = req.body || {}
    if (!receipt) {
      return res.status(400).json({ ok: false, error: 'Receipt payload is required.' })
    }

    await printToPort(receipt, port)
    res.json({ ok: true, printer: port || (await findPrinterPort()), model: '58 mm thermal printer' })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Glow 58 mm printer companion listening on http://127.0.0.1:${port}`)
})
