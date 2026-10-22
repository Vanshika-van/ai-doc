import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wrap a page in this to make it private: visitors who are not signed in get sent to /login.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="center muted">Loading...</p>
  return user ? children : <Navigate to="/login" replace />
}