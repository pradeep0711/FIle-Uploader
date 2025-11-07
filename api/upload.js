// Vercel serverless function: Node.js
import Busboy from 'busboy'
import { PassThrough } from 'stream'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const MB = 1024 * 1024

const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_S3_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
})

function parseAllowedTypes(envVal) {
  const fallbacks = ['image/*', 'text/plain', 'application/pdf']
  const tokens = (envVal || '').split(',').map(t => t.trim()).filter(Boolean)
  return tokens.length ? tokens : fallbacks
}

function mimeAllowed(mime, allowedList) {
  if (!mime) return false
  return allowedList.some(rule => {
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, rule.indexOf('/'))
      return mime.startsWith(prefix + '/')
    }
    return mime === rule
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  console.log('request_start', {
    method: req.method,
    url: req.url,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  })

  const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 5)
  const allowed = parseAllowedTypes(process.env.ALLOWED_MIME)

  const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET
  const region = process.env.AWS_REGION || process.env.AWS_S3_REGION
  if (!bucket || !region) {
    return res.status(500).json({ error: 'Server not configured: missing S3_BUCKET or AWS_REGION' })
  }

  try {
    const result = await streamSingleFileToS3(req, {
      bucket,
      region,
      allowedMime: allowed,
      maxBytes: maxFileSizeMb * MB
    })

    const { objectKey, url, fileSize, mimeType, meta } = result

    console.log('upload_success', { objectKey, bucket, region, fileSize, mimeType, meta })
    return res.status(200).json({ url, key: objectKey })
  } catch (err) {
    console.error('upload_error', { message: err.message })
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 500
    return res.status(status).json({ error: err.message || 'Upload failed' })
  }
}

function generateObjectKey(originalName) {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const safeName = (originalName || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120)
  const rand = Math.random().toString(36).slice(2, 10)
  return `uploads/${y}/${m}/${d}/${Date.now()}-${rand}-${safeName}`
}

async function streamSingleFileToS3(req, { bucket, region, allowedMime, maxBytes }) {
  return new Promise((resolve, reject) => {
    const ct = req.headers['content-type']
    if (!ct || !ct.toLowerCase().includes('multipart/form-data')) {
      return reject(new Error('Invalid content-type; expected multipart/form-data'))
    }
    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: maxBytes } })
    let totalBytes = 0
    let resolved = false
    let gotFile = false

    busboy.on('file', (fieldname, file, info) => {
      console.log('busboy_file_event', { fieldname, info })
      gotFile = true
      const { filename, mimeType } = info
      if (!mimeAllowed(mimeType, allowedMime)) {
        file.resume()
        return reject(new Error(`Unsupported file type: ${mimeType}`))
      }

      const objectKey = generateObjectKey(filename)
      const clientHint = req.headers['x-upload-client'] || 'unknown'
      const meta = {
        'uploaded-by': clientHint.toString().slice(0, 64),
        'original-name': filename.slice(0, 128)
      }

      const pass = new PassThrough()

      // Track size while streaming
      file.on('data', (chunk) => {
        totalBytes += chunk.length
        if (totalBytes > maxBytes) {
          file.unpipe(pass)
          pass.end()
          return reject(Object.assign(new Error('File too large'), { code: 'LIMIT_FILE_SIZE' }))
        }
      })
      file.on('limit', () => {
        return reject(Object.assign(new Error('File too large'), { code: 'LIMIT_FILE_SIZE' }))
      })
      file.on('error', (e) => reject(e))
      file.on('end', () => {
        // Ensure S3 stream ends when incoming stream ends
        try { pass.end() } catch {}
      })

      // Start multipart upload
      const uploader = new Upload({
        client: s3,
        params: {
          Bucket: bucket,
          Key: objectKey,
          Body: pass,
          ContentType: mimeType || 'application/octet-stream',
          Metadata: meta
        },
        queueSize: 8,      // increase parallelism
        partSize: 8 * MB   // 8MB parts
      })

      uploader.done().then(async () => {
        if (resolved) return
        let signedUrl = ''
        try {
          signedUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: objectKey }), { expiresIn: 3600 })
        } catch {}
        const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(objectKey)}`
        resolved = true
        resolve({ objectKey, url: signedUrl || publicUrl, fileSize: totalBytes, mimeType, meta })
      }).catch(err => reject(err))

      // Pipe the incoming file stream into PassThrough for S3
      file.pipe(pass)
    })

    busboy.on('finish', () => {
      if (!gotFile) {
        console.log('busboy_finish_no_file', { gotFile })
        reject(new Error('No file uploaded. Field name: file'))
      }
      // If a file was received, do nothing here; resolution will occur when the S3 upload completes.
    })
    busboy.on('error', (err) => reject(err))
    req.pipe(busboy)
  })
}

