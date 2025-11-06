import React, { useRef, useState } from 'react'

export default function App() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')

  function onSelect(e) {
    setLink('')
    setError('')
    const f = e.target.files?.[0]
    if (!f) { setFile(null); return }
    const maxBytes = (Number(10) || 10) * 1024 * 1024 // mirror server default
    const allowed = ['image/', 'text/plain', 'application/pdf']
    const okType = allowed.some(rule => rule.endsWith('/') ? (f.type || '').startsWith(rule) : (f.type === rule))
    if (!okType) {
      setError(`Unsupported file type: ${f.type || 'unknown'}`)
      setFile(null)
      return
    }
    if (f.size > maxBytes) {
      setError(`File too large. Max 10 MB.`)
      setFile(null)
      return
    }
    setFile(f)
  }

  async function onUpload() {
    if (!file) return
    setUploading(true)
    setProgress(0)
    setError('')
    setLink('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      const promise = new Promise((resolve, reject) => {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const p = Math.round((evt.loaded / evt.total) * 100)
            setProgress(p)
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText)
          } else {
            try {
              const data = JSON.parse(xhr.responseText)
              const msg = typeof data?.error === 'string' ? data.error : 'Upload failed'
              reject(new Error(msg))
            } catch (_) {
              reject(new Error(xhr.responseText || 'Upload failed'))
            }
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
      })

      const apiUrl = (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3000/api/upload'
      xhr.open('POST', apiUrl)
      xhr.setRequestHeader('x-upload-client', 'neo-uploader')
      xhr.send(formData)
      const resText = await promise
      const json = JSON.parse(resText)
      setLink(json.url)
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="site">
      <header className="nav">
        <div className="brand">
          <span className="logo">⬆</span>
          <span>File Uploader</span>
        </div>
        <div className="links">
          <span className="badge">made by pradeep0711</span>
        </div>
      </header>

      <main className="hero">
        <div className="hero-left">
          <div className="badge">Cloud Upload • Secure • Fast</div>
          <h1>
            Ask for a link.<br />
            <span className="highlight">Upload any file</span> instantly.
          </h1>
          <p className="sub">Drag & drop or pick a file. We stream it to cloud storage and return a shareable link.</p>
          <div className="picker">
            <input ref={inputRef} type="file" accept="image/*,text/plain,application/pdf" onChange={onSelect} />
            <button disabled={!file || uploading} onClick={onUpload}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
          {uploading && (
            <div className="progress">
              <div className="bar" style={{ width: `${progress}%` }} />
              <span>{progress}%</span>
            </div>
          )}
          {error && <div className="error">{error}</div>}
          {link && (
            <div className="success">
              Uploaded! <a href={link} target="_blank" rel="noreferrer">Open file</a>
            </div>
          )}
          
          <div className="stats">
            <div><strong>10 MB</strong><span>Default max size</span></div>
            <div><strong>Streaming</strong><span>Multipart to S3</span></div>
            <div><strong>Signed URLs</strong><span>Private by default</span></div>
          </div>
        </div>

        <div className="hero-right">
          <div className="panel">
            <div className="panel-title">User File</div>
            <pre className="panel-code">{file ? file.name : 'Select a file to begin…'}</pre>
          </div>
          <div className="arrow">↓</div>
          <div className="panel">
            <div className="panel-title">Uploaded URL</div>
            <pre className="panel-code">{link ? link : 'Awaiting upload…'}</pre>
          </div>
        </div>
        <div className="glow1" />
        <div className="glow2" />
      </main>

      <footer className="foot">
        <span className="tiny">Max size and types enforced server-side. image/*, text/plain, application/pdf</span>
      </footer>
    </div>
  )}

