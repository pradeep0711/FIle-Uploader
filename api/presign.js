import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_S3_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
})

function generateKey(originalName) {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const safe = (originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const rand = Math.random().toString(36).slice(2, 10)
  return `uploads/${y}/${m}/${d}/${Date.now()}-${rand}-${safe}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET
  const region = process.env.AWS_REGION || process.env.AWS_S3_REGION
  if (!bucket || !region) {
    return res.status(500).json({ error: 'Server not configured: missing S3_BUCKET or AWS_REGION' })
  }

  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString('utf8') || '{}'
    let body = {}
    try { body = JSON.parse(raw) } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
    const { filename, contentType } = body
    if (!filename) {
      return res.status(400).json({ error: 'filename is required' })
    }
    const key = generateKey(filename)

    const putCmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType || 'application/octet-stream' })
    const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key })

    const putUrl = await getSignedUrl(s3, putCmd, { expiresIn: 900 }) // 15 min
    const getUrl = await getSignedUrl(s3, getCmd, { expiresIn: 3600 }) // 1 hour

    return res.status(200).json({ bucket, region, key, putUrl, getUrl })
  } catch (e) {
    console.error('presign_error', { message: e?.message, name: e?.name, code: e?.code })
    const msg = e?.message || 'Failed to presign URL'
    return res.status(500).json({ error: msg })
  }
}


