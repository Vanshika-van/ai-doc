// Light / dark theme. index.html sets the first value before the page paints; this changes it later.
export const currentTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem('docmind.theme', theme) } catch { /* storage unavailable */ }
}