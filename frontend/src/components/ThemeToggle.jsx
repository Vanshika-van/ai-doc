import { useState } from 'react'
import { currentTheme, setTheme } from '../lib/theme'
import { IconMoon, IconSun } from './Icons'

export default function ThemeToggle({ className = '' }) {
  const [theme, setLocal] = useState(currentTheme())
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => { setTheme(next); setLocal(next) }}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  )
}