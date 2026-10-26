import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { IconClose, IconExternal, IconLock, IconSend } from '../components/Icons'
import { LogoMark } from '../components/Logo'
import RichText from '../components/RichText'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/Toasts'
import { useWorkspace } from '../context/Workspace'
import { api, openDocument, streamChat } from '../lib/api'

const SUGGESTIONS = ['Summarize the main points', 'What are the key dates and numbers?', 'What are the conclusions or recommendations?']

// Shown instead of the chat until at least one PDF is Ready
function Locked() {
  const { docs, docsLoading, processingDocs } = useWorkspace()
  if (docsLoading) return <div className="locked"><span className="spinner big" /></div>
  if (processingDocs.length > 0) {
    return (
      <div className="locked">
        <span className="locked-icon"><span className="spinner big" /></span>
        <h2>Reading your PDF</h2>
        <p className="muted">This takes a few seconds. Chat unlocks as soon as it shows Ready.</p>
      </div>
    )
  }
  const failed = docs.length > 0
  return (
    <div className="locked">
      <span className="locked-icon"><IconLock width={24} height={24} /></span>
      <h2>{failed ? 'Your PDF could not be read' : 'Add a PDF to start asking'}</h2>
      <p className="muted">
        {failed
          ? 'DocMind could not find text in it. Scanned pages are images, so try a PDF where you can select the text.'
          : 'Questions unlock as soon as your first PDF shows Ready.'}
      </p>
      <Link className="btn btn-primary" to="/app/documents">{failed ? 'Go to My PDFs' : 'Upload a PDF'}</Link>
    </div>
  )
}

function Message({ m, last, streaming, onCite }) {
  if (m.role === 'user') return <div className="msg user"><p>{m.content}</p></div>
  const waiting = !m.content && streaming && last
  const manyFiles = new Set(m.sources.map((s) => s.document_id)).size > 1
  return (
    <div className="msg assistant">
      <span className="avatar"><LogoMark size={22} /></span>
      <div className="answer">
        {waiting ? (
          <span className="typing" role="status" aria-label="DocMind is thinking"><i /><i /><i /></span>
        ) : m.failed ? (
          <p className="answer-error" role="alert">{m.content}</p>
        ) : (
          <div className={`prose ${streaming && last ? 'live' : ''}`}>
            <RichText text={m.content} sources={m.sources} onCite={onCite} />
          </div>
        )}
        {m.sources.length > 0 && !waiting && (
          <div className="src-row">
            <span className="muted">Sources</span>
            {m.sources.map((s) => (
              <button key={s.index} type="button" className="cite" onClick={() => onCite(s.index)} title={`${s.filename}, page ${s.page}`}>
                {manyFiles ? `${s.filename.replace(/\.pdf$/i, '').slice(0, 16)} p. ${s.page}` : `p. ${s.page}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SourceDrawer({ sources, picked, onClose }) {
  const notify = useToast()
  useEffect(() => {
    document.getElementById(`src-${picked}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [picked])

  async function open(source) {
    try { await openDocument(source.document_id, source.page) } catch (err) { notify(err.message) }
  }

  return (
    <aside className="drawer" aria-label="Sources">
      <header>
        <h2>Where this came from</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close sources"><IconClose /></button>
      </header>
      <ul>
        {sources.map((s) => (
          <li key={s.index} id={`src-${s.index}`} className={s.index === picked ? 'picked' : ''}>
            <div className="src-head"><strong title={s.filename}>{s.filename}</strong><span className="cite">p. {s.page}</span></div>
            {/* the key restarts the marker sweep each time a different source is picked */}
            <blockquote key={s.index === picked ? 'picked' : 'idle'}>
              {s.index === picked ? <span className="mark sweep" style={{ '--delay': '0.1s' }}>{s.text}</span> : s.text}
            </blockquote>
            <button className="btn btn-ghost btn-sm" onClick={() => open(s)}><IconExternal width={15} height={15} /> Open page {s.page}</button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default function Chat() {
  const { '*': routeId } = useParams()
  const id = routeId || null // /app/chat has no id; /app/chat/abc123 has one
  const location = useLocation()
  const navigate = useNavigate()
  const notify = useToast()
  const { user } = useAuth()
  const { docs, docsLoading, readyDocs, conversations, loadConversations } = useWorkspace()

  const [messages, setMessages] = useState([]) // [{ role, content, sources, failed? }]
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [scope, setScope] = useState('all') // "all" or the id of one PDF
  const [drawer, setDrawer] = useState(null) // { message: 2, picked: 1 }
  const run = useRef(0)            // bumps whenever a stream should be ignored (new chat, other chat)
  const justCreated = useRef(null) // id of a chat we just created ourselves: do not reload it
  const bottom = useRef(null)
  const box = useRef(null)

  const canAsk = readyDocs.length > 0
  const scopeDoc = readyDocs.find((d) => String(d.id) === String(scope))
  const title = conversations.find((c) => c.id === id)?.title

  // Load a chat when the address changes, or reset when "New chat" is pressed
  useEffect(() => {
    if (location.state?.scope) setScope(String(location.state.scope))
    if (justCreated.current === id && id) { justCreated.current = null; return }
    run.current += 1 // anything still streaming belongs to the old view
    setStreaming(false)
    setDrawer(null)
    if (!id) { setMessages([]); return }
    api(`/chat/conversations/${id}`)
      .then((detail) => setMessages(detail.messages))
      .catch((err) => { notify(err.message); navigate('/app/chat', { replace: true }) })
  }, [id, location.state?.fresh]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end', behavior: streaming ? 'auto' : 'smooth' }) }, [messages, streaming])

  // A PDF chosen in the scope list may have been deleted since
  useEffect(() => { if (scope !== 'all' && !scopeDoc && !docsLoading) setScope('all') }, [scope, scopeDoc, docsLoading])

  function resize() {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }
  useEffect(resize, [input])

  const updateLast = (change) =>
    setMessages((all) => all.map((m, i) => (i === all.length - 1 ? { ...m, ...change(m) } : m)))

  async function send(text) {
    const question = text.trim()
    if (question.length < 2 || streaming || !canAsk) return
    const mine = ++run.current
    setInput('')
    setStreaming(true)
    setDrawer(null)
    // Show the question and an empty answer straight away; the answer fills in as pieces arrive
    setMessages((all) => [...all, { role: 'user', content: question, sources: [] }, { role: 'assistant', content: '', sources: [] }])
    try {
      await streamChat({ question, conversation_id: id, document_id: scopeDoc ? scopeDoc.id : null }, (name, data) => {
        if (run.current !== mine) return
        if (name === 'meta') {
          if (!id) { justCreated.current = data.conversation_id; navigate(`/app/chat/${data.conversation_id}`, { replace: true }) }
          updateLast(() => ({ sources: data.sources }))
        } else if (name === 'token') {
          updateLast((m) => ({ content: m.content + data.text }))
        } else if (name === 'error') {
          updateLast(() => ({ content: data.message, failed: true }))
        }
      })
      if (run.current === mine) loadConversations()
    } catch (err) {
      if (run.current !== mine) return
      setMessages((all) => all.slice(0, -2)) // take the unsent question back out ...
      setInput(question)                     // ... and put it back in the box
      notify(err.message)
    } finally {
      if (run.current === mine) setStreaming(false)
    }
  }

  const openSources = (index, i) => setDrawer({ message: i, picked: index })
  const drawerSources = drawer ? messages[drawer.message]?.sources ?? [] : []
  const firstName = user.name.split(' ')[0]

  return (
    <div className={`chat-layout ${drawer ? 'with-drawer' : ''}`}>
      <section className="chat-main">
        <header className="chat-top">
          <h1>{title || 'New chat'}</h1>
          {canAsk && (
            <label className="scope">
              <span className="sr-only">Ask</span>
              <select value={scopeDoc ? scope : 'all'} onChange={(e) => setScope(e.target.value)} aria-label="Which PDFs to ask">
                <option value="all">All my PDFs ({readyDocs.length})</option>
                {readyDocs.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
              </select>
            </label>
          )}
        </header>

        <div className="thread">
          {!canAsk && messages.length === 0 ? (
            <Locked />
          ) : messages.length === 0 ? (
            <div className="welcome">
              <h2>Hi {firstName}. What would you like to know?</h2>
              <p className="muted">
                {scopeDoc ? <>Asking only <strong>{scopeDoc.filename}</strong>.</> : <>Asking across {readyDocs.length === 1 ? 'your PDF' : `all ${readyDocs.length} PDFs`}.</>}
              </p>
              <div className="suggest">
                {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((m, i) => (
                <Message key={i} m={m} last={i === messages.length - 1} streaming={streaming} onCite={(n) => openSources(n, i)} />
              ))}
            </div>
          )}
          <div ref={bottom} />
        </div>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input) }}>
          <textarea
            ref={box} rows={1} value={input} disabled={!canAsk || streaming}
            placeholder={canAsk ? 'Ask a question about your PDFs' : 'Upload a PDF to ask questions'}
            aria-label="Your question"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input) } }}
          />
          <button className="send" disabled={!canAsk || streaming || input.trim().length < 2} aria-label="Send question"><IconSend /></button>
        </form>
        <p className="composer-note muted">Answers come only from your PDFs. Click a page chip to check the source.</p>
      </section>

      {drawer && drawerSources.length > 0 && (
        <SourceDrawer sources={drawerSources} picked={drawer.picked} onClose={() => setDrawer(null)} />
      )}
    </div>
  )
}