// The ONLY file that talks to the backend. Components call api(...) and never use fetch directly.
const KEY = 'docmind.token'

export const tokenStore = {
  get() { try { return localStorage.getItem(KEY) } catch { return null } },
  set(token) { try { localStorage.setItem(KEY, token) } catch { /* storage unavailable */ } },
  clear() { try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ } },
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}` // proves who we are on every request
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') message = data.detail
      else if (Array.isArray(data.detail) && data.detail[0]) message = data.detail[0].msg
    } catch { /* body was not JSON */ }
    throw new Error(message)
  }
  return res.status === 204 ? null : res.json()
}