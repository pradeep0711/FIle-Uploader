import 'dotenv/config'
import http from 'http'
import handler from './api/upload.js'
import presign from './api/presign.js'

const PORT = process.env.PORT || 3000

function enhance(res) {
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)) }
  return res
}

const server = http.createServer((req, resRaw) => {
  const res = enhance(resRaw)
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-client')
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.url === '/api/upload' && req.method === 'POST') {
    return handler(req, res)
  }
  if (req.url === '/api/presign' && req.method === 'POST') {
    return presign(req, res)
  }
  if (req.url?.startsWith('/api/')) {
    return res.status(404).end('Not Found')
  }
  res.status(200)
  res.setHeader('Content-Type', 'text/plain')
  res.end('API server running')
})

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})

