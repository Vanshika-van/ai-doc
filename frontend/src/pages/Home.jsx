import { useAuth } from '../context/AuthContext'

// A private page. Later this becomes the document library.
export default function Home() {
  const { user, logout } = useAuth()
  return (
    <main className="card">
      <h1>Hello, {user.name}</h1>
      <p className="muted">You are signed in as {user.email}. Next step: uploading documents.</p>
      <button onClick={logout}>Sign out</button>
    </main>
  )
}