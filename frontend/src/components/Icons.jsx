// Small inline SVG icons. No icon library needed, so there is nothing extra to install.
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const IconFile = (p) => <svg {...base} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
export const IconUpload = (p) => <svg {...base} {...p}><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>
export const IconSend = (p) => <svg {...base} {...p}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>
export const IconTrash = (p) => <svg {...base} {...p}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="m6 7 1 13h10l1-13" /></svg>
export const IconPlus = (p) => <svg {...base} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
export const IconClose = (p) => <svg {...base} {...p}><path d="m6 6 12 12" /><path d="M18 6 6 18" /></svg>
export const IconMenu = (p) => <svg {...base} {...p}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
export const IconSun = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
export const IconMoon = (p) => <svg {...base} {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>
export const IconExternal = (p) => <svg {...base} {...p}><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
export const IconLogout = (p) => <svg {...base} {...p}><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" /><path d="m16 8 4 4-4 4" /><path d="M20 12H9" /></svg>
export const IconChat = (p) => <svg {...base} {...p}><path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /></svg>
export const IconLock = (p) => <svg {...base} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
export const IconSpark = (p) => <svg {...base} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
export const IconQuote = (p) => <svg {...base} {...p}><path d="M7 7h4v5a4 4 0 0 1-4 4" /><path d="M14 7h4v5a4 4 0 0 1-4 4" /></svg>