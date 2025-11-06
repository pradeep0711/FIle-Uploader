import fs from 'fs'

const endpoint = process.env.API_URL || 'http://localhost:3000/api/upload'
const filePath = process.env.FILE || './test.txt'

if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, 'hello world', 'utf8')
}

const blob = new Blob([fs.readFileSync(filePath)], { type: 'text/plain' })
const form = new FormData()
form.append('file', blob, 'test.txt')

const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'x-upload-client': 'neo-uploader-node' },
  body: form
})

const text = await res.text()
console.log('status', res.status)
console.log(text)

