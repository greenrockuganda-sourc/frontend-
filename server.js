import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const port = Number(process.env.PORT || 3000)

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
}

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  return mimeTypes[ext] || 'application/octet-stream'
}

const serveFile = async (filePath, res) => {
  try {
    const data = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': getContentType(filePath) })
    res.end(data)
  } catch (error) {
    res.writeHead(404)
    res.end('Not found')
  }
}

async function readRequestBody(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// Railway injects API_BASE_URL when configured. Keep the deployed backend as a
// fallback so the frontend can still proxy authenticated API requests if the
// frontend service variables have not yet been configured.
const DEFAULT_BACKEND_BASE_URL = 'https://backends-production-3d0b.up.railway.app'
const backendBaseUrl = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || DEFAULT_BACKEND_BASE_URL
const shouldProxyApi = backendBaseUrl.trim() !== ''
const API_VERSION = process.env.API_VERSION || 'v1'

// Simple file-backed storage for categories and brands when no external API is configured
const dataDir = path.join(__dirname, 'data')
const categoriesFile = path.join(dataDir, 'categories.json')
const brandsFile = path.join(dataDir, 'brands.json')

async function ensureDataDir() {
  try {
    await mkdir(dataDir, { recursive: true })
  } catch (e) {
    // ignore
  }
}

async function readJsonFile(filePath, defaultValue) {
  try {
    const txt = await readFile(filePath, 'utf8')
    return JSON.parse(txt)
  } catch (err) {
    return defaultValue
  }
}

async function writeJsonFile(filePath, data) {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${port}`)
  const requestPath = requestUrl.pathname

  if (shouldProxyApi && requestPath.startsWith('/api')) {
    try {
      const parts = requestPath.replace(/^\/+|\/+$/g, '').split('/')
      let proxyPath = requestUrl.pathname + requestUrl.search

      if (parts[0] === 'api' && (parts[1] === 'categories' || parts[1] === 'brands')) {
        const resource = parts[1]
        const remainder = parts.slice(2).join('/')
        proxyPath = `/api/${API_VERSION}/${resource}${remainder ? `/${remainder}` : ''}${requestUrl.search}`
      }

      const base = backendBaseUrl.trim().replace(/\/$/, '')
      const proxyUrl = new URL(proxyPath, base).toString()
      const headers = new Headers()

      for (const [name, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          const headerValue = Array.isArray(value) ? value.join(', ') : String(value)
          headers.set(name, headerValue)
        }
      }
      headers.delete('host')

      // Allow a special header to forward an auth token from the client if provided
      // Client can set `x-forward-auth-token: <token>` and the server will forward
      // as `Authorization: Bearer <token>` to the backend.
      const forwardToken = req.headers['x-forward-auth-token']
      if (forwardToken) {
        headers.set('Authorization', `Bearer ${Array.isArray(forwardToken) ? forwardToken[0] : String(forwardToken)}`)
      }

      const body = ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : await readRequestBody(req)
      const backendResponse = await fetch(proxyUrl, {
        method: req.method || 'GET',
        headers,
        body,
        redirect: 'manual',
      })

      const responseHeaders = {}
      backendResponse.headers.forEach((value, name) => {
        if (['content-encoding', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) {
          return
        }
        responseHeaders[name] = value
      })

      const responseBuffer = Buffer.from(await backendResponse.arrayBuffer())
      res.writeHead(backendResponse.status, responseHeaders)
      res.end(responseBuffer)
      return
    } catch (error) {
      console.error('API proxy failed:', backendBaseUrl, req.url, error)
      res.writeHead(502, { 'Content-Type': 'text/plain' })
      res.end(`Bad gateway: unable to proxy request to backend (${error instanceof Error ? error.message : String(error)})`)
      return
    }
  }

  // If no external backend is configured, provide minimal API for categories and brands
  if (!shouldProxyApi && requestPath.startsWith('/api')) {
    await ensureDataDir()

    // normalize paths without trailing slash
    const parts = requestPath.replace(/^\/|\/$/g, '').split('/') // e.g. ["api","categories","id"]

    // Helper: read body as JSON
    async function readJsonBody(req) {
      try {
        const buf = await readRequestBody(req)
        if (!buf || buf.length === 0) return null
        return JSON.parse(buf.toString('utf8'))
      } catch (e) {
        return null
      }
    }

    // categories
    if (parts[1] === 'categories') {
      const categories = await readJsonFile(categoriesFile, [])
      const id = parts[2]

      if ((req.method === 'GET' || req.method === 'get') && !id) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(categories))
        return
      }

      if ((req.method === 'GET' || req.method === 'get') && id) {
        const item = categories.find(c => String(c.id) === String(id))
        if (!item) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ detail: 'Not found' }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(item))
        return
      }

      if ((req.method === 'POST' || req.method === 'post')) {
        const body = await readJsonBody(req)
        if (!body || !body.category_name) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ detail: 'category_name required' }))
          return
        }
        const now = new Date().toISOString()
        const newItem = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          category_name: body.category_name,
          description: body.description || '',
          image_url: body.image_url || null,
          created_at: now,
          updated_at: now,
        }
        categories.push(newItem)
        await writeJsonFile(categoriesFile, categories)
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(newItem))
        return
      }
    }

    // brands
    if (parts[1] === 'brands') {
      const brands = await readJsonFile(brandsFile, [])
      const id = parts[2]

      if ((req.method === 'GET' || req.method === 'get') && !id) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(brands))
        return
      }

      if ((req.method === 'GET' || req.method === 'get') && id) {
        const item = brands.find(b => String(b.id) === String(id))
        if (!item) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ detail: 'Not found' }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(item))
        return
      }

      if ((req.method === 'POST' || req.method === 'post')) {
        const body = await readJsonBody(req)
        if (!body || !body.brand_name) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ detail: 'brand_name required' }))
          return
        }
        const now = new Date().toISOString()
        const newItem = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          brand_name: body.brand_name,
          description: body.description || '',
          country: body.country || '',
          logo: body.logo || null,
          created_at: now,
          updated_at: now,
        }
        brands.push(newItem)
        await writeJsonFile(brandsFile, brands)
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(newItem))
        return
      }
    }

    // If we didn't handle it, fallthrough to 404
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ detail: 'API endpoint not found' }))
    return
  }

  let filePath = path.join(distDir, requestPath)

  if (requestPath === '/' || requestPath === '') {
    filePath = path.join(distDir, 'index.html')
  }

  try {
    const fileStat = await import('node:fs/promises').then(({ stat }) => stat(filePath))
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }
    await serveFile(filePath, res)
  } catch {
    await serveFile(path.join(distDir, 'index.html'), res)
  }
}).listen(port, () => {
  // eslint-disable-next-line no-console
  if (shouldProxyApi) {
    console.log(`Server listening on port ${port} and proxying /api to ${backendBaseUrl}`)
  } else {
    console.log(`Server listening on port ${port}`)
  }
})
