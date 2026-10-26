import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconExternal, IconFile, IconTrash, IconUpload } from '../components/Icons'
import { useToast } from '../context/Toasts'
import { useWorkspace } from '../context/Workspace'
import { openDocument } from '../lib/api'
import { plural, prettySize } from '../lib/format'

function Status({ doc }) {
  if (doc.status === 'ready') return <span className="pill ok">Ready</span>
  if (doc.status === 'failed') return <span className="pill bad">Could not read</span>
  return <span className="pill"><span className="spinner" /> Reading</span>
}

export default function Documents() {
  const { docs, docsLoading, uploading, uploadPdf, removeDoc } = useWorkspace()
  const notify = useToast()
  const navigate = useNavigate()
  const input = useRef(null)
  const [over, setOver] = useState(false) // true while a file is dragged over the drop area
  const [confirming, setConfirming] = useState(null) // id of the PDF whose delete button was clicked once

  async function addFiles(files) {
    for (const file of files) await uploadPdf(file) // one after the other
    if (input.current) input.current.value = ''     // allow choosing the same file again
  }

  function onDrop(e) {
    e.preventDefault()
    setOver(false)
    addFiles([...e.dataTransfer.files])
  }

  async function open(doc) {
    try { await openDocument(doc.id) } catch (err) { notify(err.message) }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>My PDFs</h1>
        <p className="muted">Ask questions as soon as a PDF shows Ready.</p>
      </header>

      <label
        className={`drop ${over ? 'over' : ''} ${uploading ? 'busy' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <span className="drop-icon"><IconUpload width={22} height={22} /></span>
        <strong>{uploading ? 'Uploading your PDF...' : over ? 'Drop to upload' : 'Drop a PDF here, or choose a file'}</strong>
        <span className="muted">PDF only, up to 15 MB</span>
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="sr-only" disabled={uploading}
          onChange={(e) => addFiles([...e.target.files])} />
      </label>

      {docsLoading ? (
        <p className="muted empty">Loading your PDFs...</p>
      ) : docs.length === 0 ? (
        <p className="muted empty">No PDFs yet. Add one above, then ask it anything.</p>
      ) : (
        <ul className="docs">
          {docs.map((d) => (
            <li key={d.id} className="doc">
              <span className="doc-icon"><IconFile /></span>
              <div className="doc-main">
                <strong title={d.filename}>{d.filename}</strong>
                <div className="doc-meta">
                  <span>{prettySize(d.size_bytes)}</span>
                  {d.status === 'ready' && <span>{plural(d.page_count, 'page')}</span>}
                  <Status doc={d} />
                </div>
                {d.status === 'failed' && <p className="doc-error">{d.error}</p>}
              </div>
              <div className="doc-actions">
                {d.status === 'ready' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/chat', { state: { fresh: Date.now(), scope: d.id } })}>
                    Ask about this PDF
                  </button>
                )}
                <button className="icon-btn" aria-label={`Open ${d.filename}`} title="Open the PDF" onClick={() => open(d)}><IconExternal /></button>
                {confirming === d.id ? (
                  <>
                    <button className="btn btn-sm btn-danger" onClick={() => { removeDoc(d.id); setConfirming(null) }}>Delete PDF</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(null)}>Keep</button>
                  </>
                ) : (
                  <button className="icon-btn" aria-label={`Delete ${d.filename}`} title="Delete" onClick={() => setConfirming(d.id)}><IconTrash /></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}