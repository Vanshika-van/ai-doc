import { createContext, useContext, useEffect, useState } from 'react'
import { api, tokenStore } from '../lib/api'

// Context = a box any component can read from, so we don't pass `user` down through every level.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while we check an existing token on page load

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return }
    api('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear()) // token expired or invalid
      .finally(() => setLoading(false))
  }, [])

  const accept = (data) => { tokenStore.set(data.access_token); setUser(data.user) }

  const value = {
    user,
    loading,
    login: async (email, password) => accept(await api('/auth/login', { method: 'POST', body: { email, password } })),
    register: async (name, email, password) =>
      accept(await api('/auth/register', { method: 'POST', body: { name, email, password } })),
    logout: () => { tokenStore.clear(); setUser(null) },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)