import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, streamChat } from '../lib/api'

// Chat with your documents. Left: saved conversations. Right: the messages and the question box.
export default function Chat() {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null) // null = a new, unsaved conversation
  const [messages, setMessages] = useState([])   // [{ role, content, sources }]
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const bottom = useRef(null)

  const loadConversations = () => api('/chat/conversations').then(setConversations).catch((e) => setError(e.message))
  useEffect(() => { loadConversations() }, [])
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages]) // keep the newest text in view

  async function open(id) {
    setError('')
    try {
      const detail = await api(`/chat/conversations/${id}`)
      setActiveId(id)
      setMessages(detail.messages)
    } catch (err) {
      setError(err.message)
    }
  }

  function startNew() {
    setActiveId(null)
    setMessages([])
    setError('')
  }

  async function remove(id) {
    await api(`/chat/conversations/${id}`, { method: 'DELETE' })
    if (id === activeId) startNew()
    loadConversations()
  }

  // Change the LAST message (the assistant answer being written) without touching the others
  const updateLast = (change) =>
    setMessages((all) => all.map((m, i) => (i === all.length - 1 ? { ...m, ...change(m) } : m)))

  async function send(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || streaming) return
    setError('')
    setInput('')
    setStreaming(true)
    // Show the question and an empty answer straight away; the answer fills in as tokens arrive
    setMessages((all) => [...all, { role: 'user', content: question, sources: [] }, { role: 'assistant', content: '', sources: [] }])
    try {
      await streamChat({ question, conversation_id: activeId }, (name, data) => {
        if (name === 'meta') {
          setActiveId(data.conversation_id)
          updateLast(() => ({ sources: data.sources }))
        } else if (name === 'token') {
          updateLast((m) => ({ content: m.content + data.text }))
        } else if (name === 'error') {
          setError(data.message)
        }
      })
      loadConversations()
    } catch (err) {
      setError(err.message)
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="chat">
      <aside className="side">
        <Link to="/" className="back">← Documents</Link>
        <button onClick={startNew}>+ New chat</button>
        <ul>
          {conversations.map((c) => (
            <li key={c.id} className={c.id === activeId ? 'active' : ''}>
              <button className="title" onClick={() => open(c.id)}>{c.title}</button>
              <button className="x" aria-label="Delete conversation" onClick={() => remove(c.id)}>×</button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="main">
        <div className="messages">
          {messages.length === 0 && <p className="muted center">Ask a question about your documents.</p>}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <p className="bubble">{m.content || (streaming && i === messages.length - 1 ? '...' : '')}</p>
              {m.sources?.length > 0 && (
                <details className="sources">
                  <summary>{m.sources.length} sources</summary>
                  {m.sources.map((s) => (
                    <p key={s.index}><strong>[{s.index}] {s.filename} · page {s.page}</strong><br />{s.text}</p>
                  ))}
                </details>
              )}
            </div>
          ))}
          <div ref={bottom} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <form className="searchbar" onSubmit={send}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." disabled={streaming} />
          <button disabled={streaming || input.trim().length < 2}>{streaming ? '...' : 'Send'}</button>
        </form>
      </section>
    </div>
  )
}