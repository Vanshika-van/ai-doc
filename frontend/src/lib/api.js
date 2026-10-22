// The ONLY file that talks to the backend. Components call api(...) / streamChat(...) and never use fetch directly.
const KEY = 'docmind.token'

export const tokenStore = {
  get() { try { return localStorage.getItem(KEY) } catch { return null } },
  set(token) { try { localStorage.setItem(KEY, token) } catch { /* storage unavailable */ } },
  clear() { try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ } },
}

// Turn a failed response into a short message a person can read
async function errorMessage(res) {
  let message = `Request failed (${res.status})`
  try {
    const data = await res.json()
    if (typeof data.detail === 'string') message = data.detail
    else if (Array.isArray(data.detail) && data.detail[0]) message = data.detail[0].msg
  } catch { /* body was not JSON */ }
  return message
}

function authHeaders() {
  const token = tokenStore.get()
  return token ? { Authorization: `Bearer ${token}` } : {} // proves who we are on every request
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = authHeaders()
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  // For file uploads we send a FormData. The browser sets its own Content-Type, so we must NOT.

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.status === 204 ? null : res.json()
}

// The server sends events like "event: token\ndata: {...}\n\n". This cuts a text buffer into
// complete events and returns the leftover (an event that has not fully arrived yet).
export function parseEvents(buffer) {
  const blocks = buffer.split('\n\n')
  const rest = blocks.pop() // the last piece may be incomplete: keep it for the next round
  const events = []
  for (const block of blocks) {
    let name = 'message'
    let data = ''
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) name = line.slice(7)
      else if (line.startsWith('data: ')) data += line.slice(6)
    }
    if (data) events.push({ name, data: JSON.parse(data) })
  }
  return { events, rest }
}

// Ask a question and receive the answer piece by piece. onEvent(name, data) is called for each event.
export async function streamChat(body, onEvent) {
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await errorMessage(res))

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseEvents(buffer)
    buffer = parsed.rest
    parsed.events.forEach((e) => onEvent(e.name, e.data))
  }
}


// Open the ORIGINAL document in a new tab, at the cited page (PDF viewers understand "#page=3").
// A normal link cannot send our login token, so we download the file first and open that copy.
export async function openDocument(documentId, page) {
  const tab = window.open('', '_blank') // open the tab NOW, while the click still counts (popup blockers)
  try {
    const res = await fetch(`/api/documents/${documentId}/file`, { headers: authHeaders() })
    if (!res.ok) throw new Error(await errorMessage(res))
    const url = URL.createObjectURL(await res.blob())
    if (tab) tab.location.href = page ? `${url}#page=${page}` : url
  } catch (err) {
    tab?.close()
    throw err
  }
}