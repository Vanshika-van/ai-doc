import { Link } from 'react-router-dom'

// The mark is a page with a folded corner and a marker stroke across it: the product in one picture.
export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M19 3v7h7" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      <rect x="10" y="15" width="12" height="5" rx="1" fill="var(--mark)" />
      <path d="M10 24h8" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`logo ${className}`} aria-label="DocMind AI home">
      <LogoMark />
      <span>DocMind<span className="logo-sub"> AI</span></span>
    </Link>
  )
}