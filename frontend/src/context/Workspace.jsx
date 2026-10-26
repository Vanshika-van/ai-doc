import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useToast } from './Toasts'

// Everything the signed-in area shares: your PDFs and your saved chats.
const WorkspaceContext = createContext(null)
const MAX_MB = 15

export function WorkspaceProvider({ children }) {
  const notify = useToast()
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [conversations, setConversations] = useState([])

  const loadDocs = useCallback(
    () => api('/documents').then(setDocs).catch((e) => notify(e.message)).finally(() => setDocsLoading(false)),
    [notify],
  )
  const loadConversations = useCallback(
    () => api('/chat/conversations').then(setConversations).catch((e) => notify(e.message)),
    [notify],
  )
  useEffect(() => { loadDocs(); loadConversations() }, [loadDocs, loadConversations])

  // While a PDF is still being read, check again every 2 seconds
  const processing = docs.some((d) => d.status === 'processing')
  useEffect(() => {
    if (!processing) return
    const timer = setInterval(loadDocs, 2000)
    return () => clearInterval(timer)
  }, [processing, loadDocs])

  async function uploadPdf(file) {
    // Check in the browser first, so a wrong file gets an instant, clear message
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      notify('Only PDF files are supported. Choose a file that ends in .pdf.')
      return false
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      notify(`That PDF is larger than ${MAX_MB} MB. Try a smaller file.`)
      return false
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file) // "file" must match the parameter name in the backend
      await api('/documents', { method: 'POST', form })
      await loadDocs()
      return true
    } catch (err) {
      notify(err.message)
      return false
    } finally {
      setUploading(false)
    }
  }

  async function removeDoc(id) {
    try {
      await api(`/documents/${id}`, { method: 'DELETE' })
      setDocs((all) => all.filter((d) => d.id !== id))
    } catch (err) {
      notify(err.message)
    }
  }

  async function removeConversation(id) {
    try {
      await api(`/chat/conversations/${id}`, { method: 'DELETE' })
      setConversations((all) => all.filter((c) => c.id !== id))
    } catch (err) {
      notify(err.message)
    }
  }

  const value = useMemo(
    () => ({
      docs, docsLoading, uploading, uploadPdf, removeDoc,
      readyDocs: docs.filter((d) => d.status === 'ready'),
      processingDocs: docs.filter((d) => d.status === 'processing'),
      conversations, loadConversations, removeConversation,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docs, docsLoading, uploading, conversations],
  )
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export const useWorkspace = () => useContext(WorkspaceContext)