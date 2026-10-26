import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/app" replace />

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function submit(e) {
    e.preventDefault() // stop the browser's default full-page form submit
    setError('')
    setBusy(true)
    try {
      if (isRegister) await register(form.name, form.email, form.password)
      else await login(form.email, form.password)
      navigate('/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <Logo />
        <figure>
          <blockquote>
            Either party may terminate this agreement with <span className="mark sweep">sixty days’ written notice</span>.
          </blockquote>
          <figcaption>Employment agreement.pdf, page 7</figcaption>
        </figure>
        <p className="muted">Ask your PDF. Check the page.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-top"><Logo className="auth-logo-m" /><ThemeToggle /></div>
        <form className="auth-form" onSubmit={submit}>
          <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className="muted">{isRegister ? 'It takes a minute. Then upload your first PDF.' : 'Sign in to open your PDFs and chats.'}</p>

          {isRegister && (
            <label>Name
              <input value={form.name} onChange={set('name')} autoComplete="name" required />
            </label>
          )}
          <label>Email
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
          </label>
          <label>Password
            <input type="password" value={form.password} onChange={set('password')} minLength={8}
              autoComplete={isRegister ? 'new-password' : 'current-password'} required />
            {isRegister && <small className="muted">Use at least 8 characters.</small>}
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
          <p className="muted auth-alt">
            {isRegister
              ? <>Already have an account? <Link to="/login">Sign in</Link></>
              : <>New to DocMind? <Link to="/register">Create an account</Link></>}
          </p>
        </form>
      </main>
    </div>
  )
}