import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, openDocument, streamChat } from '../lib/api'

// Turns "...1.5 percent [1]." into text with a clickable [1] button
function Answer({ text, onCite }) {
  return text.split(/(\[\d+\])/).map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (!match) return part
    return <button key={i} type="button" className="cite" onClick={() => onCite(Number(match[1]))}>{match[1]}</button>
  })
}

// Chat with your documents. Left: saved conversations. Right: the messages and the question box.
export default function Chat() {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null) // null = a new, unsaved conversation
  const [messages, setMessages] = useState([])   // [{ role, content, sources }]
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const bottom = useRef(null)
  const [picked, setPicked] = useState(null) // { message: 2, index: 1 } = source [1] of message 2 is highlighted

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

  function cite(messageIndex, sourceIndex) {
    setPicked({ message: messageIndex, index: sourceIndex })
    // wait a moment for the source list to open, then scroll to the chosen source
    setTimeout(() => document.getElementById(`src-${messageIndex}-${sourceIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  async function openSource(source) {
    try {
      await openDocument(source.document_id, source.page)
    } catch (err) {
      setError(err.message)
    }
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
              <p className="bubble">
                {m.content ? <Answer text={m.content} onCite={(n) => cite(i, n)} /> : (streaming && i === messages.length - 1 ? '...' : '')}
              </p>
              {m.sources?.length > 0 && (
                // key changes when a citation is clicked, so the list re-renders OPEN
                <details className="sources" key={picked?.message === i ? `open-${picked.index}` : 'closed'} open={picked?.message === i}>
                  <summary>{m.sources.length} sources</summary>
                  {m.sources.map((s) => (
                    <div key={s.index} id={`src-${i}-${s.index}`} className={`src ${picked?.message === i && picked.index === s.index ? 'picked' : ''}`}>
                      <strong>[{s.index}] {s.filename} · page {s.page}</strong>
                      <button type="button" className="open" onClick={() => openSource(s)}>Open page {s.page}</button>
                      <p>{s.text}</p>
                    </div>
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