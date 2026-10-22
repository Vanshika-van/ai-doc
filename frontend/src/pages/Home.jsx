import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function prettySize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function Status({ doc }) {
  if (doc.status === 'ready') {
    return <small className="badge ok">Ready · {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'} · {doc.chunk_count} chunks</small>
  }
  if (doc.status === 'failed') return <small className="badge bad">Failed: {doc.error}</small>
  return <small className="badge">Processing...</small>
}

// The document library: upload files, see your list, delete.
export default function Home() {
  const { user, logout } = useAuth()
  const [docs, setDocs] = useState([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef(null)

  const load = () => api('/documents').then(setDocs).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  // While any document is still being processed, ask the server again every 2 seconds
  const processing = docs.some((d) => d.status === 'processing')
  useEffect(() => {
    if (!processing) return
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer) // stop the timer when nothing is processing any more
  }, [processing])

  async function upload(e) {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file) // "file" must match the parameter name in the backend
      await api('/documents', { method: 'POST', form })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      fileInput.current.value = '' // allow choosing the same file again
    }
  }

  async function remove(id) {
    setError('')
    try {
      await api(`/documents/${id}`, { method: 'DELETE' })
      setDocs(docs.filter((d) => d.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="card wide">
      <header className="row">
        <h1>Your documents</h1>
        <button className="ghost" onClick={logout}>Sign out ({user.name})</button>
      </header>

      <label className="drop">
        {uploading ? 'Uploading...' : 'Click to upload a PDF, TXT or Markdown file'}
        <input ref={fileInput} type="file" accept=".pdf,.txt,.md" onChange={upload} disabled={uploading} hidden />
      </label>
      {error && <p className="error" role="alert">{error}</p>}

      {docs.length === 0 ? (
        <p className="muted">No documents yet. Upload your first one above.</p>
      ) : (
        <ul className="docs">
          {docs.map((d) => (
            <li key={d.id}>
              <span>
                {d.filename} <small className="muted">{prettySize(d.size_bytes)}</small>
                <br /><Status doc={d} />
              </span>
              <button className="ghost" onClick={() => remove(d.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}

      <Link to="/chat" className="cta">Chat with your documents →</Link>
    </main>
  )
}