import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { IconQuote, IconSpark, IconLock, IconFile, IconChat } from '../components/Icons'
import { useAuth } from '../context/AuthContext'

const QUESTION = 'What interest do late invoices carry?'
const ANSWER = 'Late invoices accrue interest at 1.5% per month.'

// One timeline drives the whole demo: the question types, the answer streams,
// the page chip pops in, and the sentence on the PDF page is highlighted.
function useTimeline() {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [t, setT] = useState(reduced ? 99999 : 0)
  useEffect(() => {
    if (reduced) return undefined
    const start = performance.now()
    const id = setInterval(() => {
      const now = performance.now() - start
      setT(now)
      if (now > 7000) clearInterval(id)
    }, 40)
    return () => clearInterval(id)
  }, [reduced])
  return t
}

function Demo() {
  const t = useTimeline()
  const q = QUESTION.slice(0, Math.max(0, Math.floor((t - 600) / 38)))
  const a = ANSWER.slice(0, Math.max(0, Math.floor((t - 2600) / 30)))
  const done = a.length === ANSWER.length
  const chip = t > 2600 + ANSWER.length * 30 + 150
  const lit = t > 2600 + ANSWER.length * 30 + 500

  return (
    <div className="stage" role="img" aria-label="Demo: the question 'What interest do late invoices carry?' is answered, and page 14 of the PDF is shown with the source sentence highlighted.">
      <div className="stage-bar" aria-hidden="true"><i /><i /><i /><span>docmind.ai / chat</span></div>
      <div className="stage-body" aria-hidden="true">
        <div className="chat-pane">
          <div className="bubble-q" style={{ opacity: q ? 1 : 0 }}>{q || QUESTION[0]}</div>
          {a && (
            <div className="bubble-a">
              <span className="orb"><IconSpark width={14} height={14} /></span>
              <p>
                {a}{!done && <span className="caret" />}
                {chip && <span className="cite pop">p. 14</span>}
              </p>
            </div>
          )}
        </div>
        <figure className={`paper ${lit ? 'lit' : ''}`}>
          <figcaption><IconFile width={14} height={14} /> Employment agreement.pdf <span>page 14</span></figcaption>
          <h3>7. Payment terms</h3>
          <p>
            Payment is due within thirty days of receipt of the invoice.{' '}
            <span className={`mark ${lit ? 'sweep' : 'off'}`}>Late invoices accrue interest at 1.5 percent per month.</span>{' '}
            Either party may terminate this agreement with sixty days’ written notice, unless a breach is not corrected within that period.
          </p>
        </figure>
      </div>
    </div>
  )
}

const STEPS = [
  [IconFile, 'Upload a PDF', 'Drop in a contract, report or lecture notes. DocMind reads it page by page in a few seconds.'],
  [IconChat, 'Ask in plain language', 'Try “What is the notice period?” or “Which deadlines are mentioned?”. Ask one PDF, or all of them.'],
  [IconQuote, 'Check the page', 'Every answer carries page chips. Click one to see the passage, or open your PDF on that exact page.'],
]

const PROMISES = [
  ['Page citations on every answer', 'Each claim points to the passage it came from, with its page number.'],
  ['Answers only from your PDFs', 'The AI is told to use the passages it is given, and to say so when the answer is not there.'],
  ['One PDF or all of them', 'Pick a single document, or search across everything you have uploaded.'],
  ['Chats are saved', 'Come back later and the conversation is still there, sources included.'],
  ['Private to your account', 'Only you can see and open the PDFs you upload.'],
]

export default function Landing() {
  const { user } = useAuth()
  const go = user ? '/app' : '/register'
  return (
    <div className="landing">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <header className="l-header">
        <Logo />
        <nav className="l-nav" aria-label="Main"><a href="#how">How it works</a><a href="#verify">Why you can trust it</a></nav>
        <div className="l-actions">
          {user ? (
            <Link className="btn btn-primary btn-sm" to="/app">Open workspace</Link>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" to="/login">Sign in</Link>
              <Link className="btn btn-primary btn-sm" to="/register">Get started</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="badge"><IconLock width={13} height={13} /> Answers only from your own PDFs</p>
          <h1>
            Ask your PDF.
            <span className="h1-2"><span className="mark sweep" style={{ '--delay': '0.5s' }}>Check the page.</span></span>
          </h1>
          <p className="lede">
            Upload a PDF and ask in plain language. Every answer points to the exact page it came from,
            so you never have to take the AI’s word for it.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg glow" to={go}>Upload a PDF</Link>
            {!user && <Link className="btn btn-ghost btn-lg" to="/login">Sign in</Link>}
          </div>
          <p className="hero-note">PDF files up to 15 MB. Free to try.</p>
          <Demo />
        </section>

        <section id="how" className="how">
          <h2>From file to checked answer in three steps</h2>
          <ol>
            {STEPS.map(([Icon, title, text], i) => (
              <li key={title}>
                <span className="step-icon"><Icon width={22} height={22} /></span>
                <span className="step-n" aria-hidden="true">{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="verify" className="verify">
          <div className="verify-lead">
            <h2>Built for checking, not guessing</h2>
            <p>
              Long PDFs hide the one sentence you need. DocMind finds it, answers from it,
              and shows you where it sits, so a quick read replaces an hour of scrolling.
            </p>
          </div>
          <dl>
            {PROMISES.map(([term, text]) => (
              <div key={term}><dt>{term}</dt><dd>{text}</dd></div>
            ))}
          </dl>
        </section>

        <section className="final">
          <h2>Try it on a PDF you need to read this week.</h2>
          <Link className="btn btn-primary btn-lg glow" to={go}>Upload a PDF</Link>
        </section>
      </main>

      <footer className="l-footer">
        <Logo />
        <p>A portfolio project built with React, FastAPI, PostgreSQL with pgvector, MongoDB and Ollama or Claude.</p>
      </footer>
    </div>
  )
}