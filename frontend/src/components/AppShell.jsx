import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { IconChat, IconClose, IconFile, IconLogout, IconMenu, IconPlus, IconTrash } from './Icons'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { ToastProvider } from '../context/Toasts'
import { WorkspaceProvider, useWorkspace } from '../context/Workspace'

function Shell() {
  const { user, logout } = useAuth()
  const { docs, conversations, removeConversation } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false) // the sidebar is a slide-in menu on phones
  useEffect(() => setMenuOpen(false), [location.pathname])

  const activeChat = location.pathname.match(/^\/app\/chat\/([^/]+)/)?.[1]

  async function deleteChat(id) {
    await removeConversation(id)
    if (id === activeChat) navigate('/app/chat', { state: { fresh: Date.now() } })
  }

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`} aria-label="Sidebar">
        <div className="sb-top">
          <Logo to="/" />
          <button className="icon-btn sb-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><IconClose /></button>
        </div>

        <button className="btn btn-primary new-chat" onClick={() => navigate('/app/chat', { state: { fresh: Date.now() } })}>
          <IconPlus /> New chat
        </button>

        <nav className="sb-nav" aria-label="Workspace">
          <NavLink to="/app/chat"><IconChat /> Chat</NavLink>
          <NavLink to="/app/documents"><IconFile /> My PDFs <span className="count">{docs.length}</span></NavLink>
        </nav>

        <div className="sb-chats">
          <h2>Recent chats</h2>
          {conversations.length === 0 ? (
            <p className="muted">Your chats will appear here.</p>
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <NavLink to={`/app/chat/${c.id}`} title={c.title}>{c.title}</NavLink>
                  <button className="icon-btn" aria-label={`Delete chat: ${c.title}`} onClick={() => deleteChat(c.id)}><IconTrash width={15} height={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sb-user">
          <span className="avatar-user" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
          <span className="sb-name" title={user.email}>{user.name}</span>
          <ThemeToggle />
          <button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={() => { logout(); navigate('/') }}><IconLogout /></button>
        </div>
      </aside>

      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <div className="content">
        <header className="mobilebar">
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><IconMenu /></button>
          <Logo to="/" />
        </header>
        <Outlet />
      </div>
    </div>
  )
}

export default function AppShell() {
  return (
    <ToastProvider>
      <WorkspaceProvider>
        <Shell />
      </WorkspaceProvider>
    </ToastProvider>
  )
}