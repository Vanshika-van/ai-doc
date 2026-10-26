// A tiny Markdown reader for answers: paragraphs, bullet and numbered lists, **bold**,
// and citations like [1], which become clickable page chips.
function inline(text, sources, onCite) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>
    const match = part.match(/^\[(\d+)\]$/)
    if (!match) return part
    const n = Number(match[1])
    const source = sources.find((s) => s.index === n)
    if (!source) return null // the model made up a number: show nothing rather than a broken chip
    return (
      <button key={i} type="button" className="cite" onClick={() => onCite(n)} title={`${source.filename}, page ${source.page}`}>
        p. {source.page}
      </button>
    )
  })
}

const LIST_LINE = /^\s*([-*•]|\d+\.)\s+/

export default function RichText({ text, sources = [], onCite }) {
  return text.split(/\n{2,}/).map((block, bi) => {
    const lines = block.split('\n').filter((l) => l.trim())
    if (lines.length && lines.every((l) => LIST_LINE.test(l))) {
      const Tag = /^\s*\d+\./.test(lines[0]) ? 'ol' : 'ul'
      return <Tag key={bi}>{lines.map((l, li) => <li key={li}>{inline(l.replace(LIST_LINE, ''), sources, onCite)}</li>)}</Tag>
    }
    return (
      <p key={bi}>
        {lines.map((l, li) => <span key={li}>{li > 0 && <br />}{inline(l, sources, onCite)}</span>)}
      </p>
    )
  })
}