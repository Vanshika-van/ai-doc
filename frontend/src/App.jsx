import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import RequireAuth from './components/RequireAuth'
import { useWorkspace } from './context/Workspace'
import AuthPage from './pages/AuthPage'
import Chat from './pages/Chat'
import Documents from './pages/Documents'
import Landing from './pages/Landing'

// First visit with no PDFs goes to the upload page; otherwise straight to the chat.
function AppHome() {
  const { docs, docsLoading } = useWorkspace()
  if (docsLoading) return <p className="muted page">Loading...</p>
  return <Navigate to={docs.length === 0 ? '/app/documents' : '/app/chat'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<AppHome />} />
        <Route path="documents" element={<Documents />} />
        {/* one route for /app/chat and /app/chat/<id>, so the page is not rebuilt when the id appears */}
        <Route path="chat/*" element={<Chat />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}