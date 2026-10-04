// the demo on the home page. nothing downloads until you ask; then the model runs in
// workers (public/engine.js, the hand-written webassembly engine): one drives, the
// rest help, all on one shared memory. unload stops every worker so the memory can go
import { useEffect, useRef, useState } from 'react'
import models from '../data/models.json'
import './chat.css'

const CACHE = 'mnemonic-models'
const mb = n => (n / 1048576).toFixed(0)
const examples = ['Hi! Who are you?', 'What is photosynthesis?', 'Give me three tips for studying.', 'Write a short poem about the ocean.']

function cores() {
  return (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4
}

const defaults = () => ({ temp: 0.7, topp: 0.9, max: 400, multi: false, threads: Math.max(1, Math.min(16, Math.floor(cores() * 3 / 4))) })

export default function Chat() {
  const [phase, setPhase] = useState('idle')     // idle, loading, ready, error
  const [pick, setPick] = useState(models[0].id)
  const [cached, setCached] = useState({})
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [msgs, setMsgs] = useState([])
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null)
  const [s, setS] = useState(defaults)
  const eng = useRef(null)
  const log = useRef(null)
  const model = models.find(m => m.id === pick)

  useEffect(() => {
    try { setS({ ...defaults(), ...JSON.parse(localStorage.getItem('mnemonic') || '{}') }) } catch {}
    checkCache()
    return () => unload()
  }, [])

  useEffect(() => {
    try { localStorage.setItem('mnemonic', JSON.stringify(s)) } catch {}
  }, [s])

  useEffect(() => {
    const el = log.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight
  }, [msgs])

  async function checkCache() {
    const got = {}
    try {
      const cache = await caches.open(CACHE)
      for (const m of models) {
        const r = await cache.match(m.url)
        got[m.id] = !!r && +r.headers.get('content-length') === m.bytes
      }
    } catch {}
    setCached(got)
  }

  async function start() {
    setError('')
    if (!globalThis.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined')
      return fail("This browser can't run the demo here: it needs shared memory for its threads. A recent Chrome, Edge, Firefox or Safari should work.")
    setPhase('loading')
    setProgress({ got: 0, total: model.bytes, cached: !!cached[pick], rate: 0 })
    let module
    try { module = await WebAssembly.compileStreaming(fetch('/engine.wasm')) }
    catch { return fail("This browser can't run the demo: it needs WebAssembly SIMD (Chrome 91+, Firefox 89+, Safari 16.4+).") }
    // the model, its kv cache and buffers all live in one shared memory
    const pages = Math.min(65536, Math.ceil((model.bytes * 1.3 + (256 << 20)) / 65536))
    let mem
    try { mem = new WebAssembly.Memory({ initial: 256, maximum: pages, shared: true }) }
    catch { return fail("Couldn't get enough memory for the model. Closing other tabs might help.") }
    const stop = new Int32Array(new SharedArrayBuffer(4))
    const n = cores() - 1
    const helpers = []
    for (let i = 0; i < n; i++) {
      const w = new Worker('/engine.js')
      w.postMessage({ type: 'helper', module, mem, id: i })
      helpers.push(w)
    }
    const driver = new Worker('/engine.js')
    const t0 = performance.now()
    eng.current = { driver, helpers, stop }
    driver.onmessage = ({ data }) => {
      const on = handlers[data.type]
      if (on) on(data)
    }
    const handlers = {
      progress: ({ got, total, cached }) => setProgress({ got, total, cached, rate: got / Math.max(0.001, (performance.now() - t0) / 1000) }),
      ready: ({ threads, info }) => {
        setStatus({ threads, quant: ['f32', 'int8', 'int4'][info.quant] })
        setPhase('ready')
        setCached(c => ({ ...c, [pick]: true }))
      },
      tok: ({ text }) => setMsgs(m => {
        const last = m[m.length - 1]
        return [...m.slice(0, -1), { ...last, text: last.text + text }]
      }),
      done: ({ n, secs, stopped, note }) => {
        const rate = n > 1 ? `${n} tokens · ${(n / secs).toFixed(1)} tok/s` : `${n} token${n === 1 ? '' : 's'}`
        setMsgs(m => {
          const last = m[m.length - 1]
          return [...m.slice(0, -1), { ...last, meta: rate + (stopped ? ' · stopped' : ''), note }]
        })
        setBusy(false)
      },
      threads: ({ threads }) => setStatus(st => st && { ...st, threads }),
      error: ({ msg }) => { setBusy(false); fail('Something went wrong: ' + msg) },
    }
    driver.postMessage({
      type: 'load', module, mem, stop: stop.buffer, tokenizer: '/tokenizer.bin', helpers: n, threads: s.threads,
      model: { url: model.url, bytes: model.bytes },
    })
  }

  function fail(msg) {
    unload()
    setError(msg)
    setPhase('error')
  }

  // every worker goes, and with them the last references to the shared memory
  function unload() {
    const e = eng.current
    if (e) {
      e.driver.terminate()
      e.helpers.forEach(w => w.terminate())
    }
    eng.current = null
    setBusy(false)
    setMsgs([])
    setStatus(null)
    setProgress(null)
    setPhase('idle')
  }

  async function forget() {
    try { await (await caches.open(CACHE)).delete(model.url) } catch {}
    checkCache()
  }

  function ask(q) {
    if (busy || !eng.current) return
    setMsgs(m => [...m, { role: 'user', text: q }, { role: 'bot', text: '', meta: '' }])
    setBusy(true)
    eng.current.driver.postMessage({ type: 'chat', text: q, s: { temp: s.temp, topp: s.topp, max: s.max, multi: s.multi } })
  }

  function submit(ev) {
    ev.preventDefault()
    if (busy) { Atomics.store(eng.current.stop, 0, 1); return }
    const q = text.trim()
    if (!q) return
    setText('')
    ask(q)
  }

  function newChat() {
    if (busy) return
    setMsgs([])
    eng.current?.driver.postMessage({ type: 'chat-reset' })
  }

  function set(k, v) {
    setS(old => ({ ...old, [k]: v }))
    if (k === 'threads' && eng.current && !busy) eng.current.driver.postMessage({ type: 'threads', threads: v })
  }

  if (phase === 'idle' || phase === 'error') {
    return (
      <div className="demo gate">
        <p className="demo-about">
          A small demo that runs entirely on your device. The model downloads once, then everything happens
          locally in WebAssembly, and nothing you type is sent anywhere.
        </p>
        <fieldset className="models">
          <legend className="label">Model</legend>
          {models.map(m => (
            <label key={m.id} className={m.id === pick ? 'model on' : 'model'}>
              <input type="radio" name="model" checked={m.id === pick} onChange={() => setPick(m.id)} />
              <span className="model-name">{m.name}</span>
              <span className="model-size">{cached[m.id] ? 'downloaded' : `${mb(m.bytes)} MB`}</span>
              <span className="model-about">{m.about}</span>
            </label>
          ))}
        </fieldset>
        {error && <p className="demo-error">{error}</p>}
        <div className="gate-actions">
          <button className="btn" onClick={start}>
            {cached[pick] ? 'Start' : 'Download and start'}
            <span className="dim">{cached[pick] ? 'already downloaded' : `${mb(model.bytes)} MB`}</span>
          </button>
          {cached[pick] && <button className="link" onClick={forget}>Delete the downloaded copy</button>}
        </div>
        <p className="demo-note">
          It uses about {mb(model.bytes + (160 << 20))} MB of memory while it's loaded, and you can unload it at any time.
        </p>
      </div>
    )
  }

  if (phase === 'loading') {
    const p = progress || { got: 0, total: model.bytes }
    return (
      <div className="demo gate">
        <p className="demo-about">
          {p.cached ? `Loading ${model.name} from your browser's cache…` : `Downloading ${model.name}…`}
        </p>
        <div className="bar"><div style={{ width: `${(100 * p.got) / p.total}%` }} /></div>
        <div className="bar-meta">
          <span>{mb(p.got)} of {mb(p.total)} MB{!p.cached && p.rate > 0 ? ` · ${(p.rate / 1048576).toFixed(1)} MB/s` : ''}</span>
          <button className="link" onClick={unload}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="demo live">
      <div className="live-head">
        <span className="live-status">
          {model.name.replace(', small download', '')} · {status?.quant} · {status?.threads} thread{status?.threads === 1 ? '' : 's'} · on your device
        </span>
        <button className="link" onClick={newChat} disabled={busy}>New chat</button>
        <button className="link" onClick={unload}>Unload</button>
      </div>
      <div className="log" ref={log}>
        {msgs.length === 0 && (
          <div className="empty">
            <p>Ask it something, or try one of these:</p>
            <ul>{examples.map(e => <li key={e}><button className="link" onClick={() => ask(e)}>{e}</button></li>)}</ul>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <span className="label">{m.role === 'user' ? 'You' : 'Mnemonic'}</span>
            {m.role === 'user'
              ? <div className="text">{m.text}</div>
              : <div className="text" dangerouslySetInnerHTML={{ __html: md(m.text) || (busy && i === msgs.length - 1 ? '<span class="cursor"></span>' : '') }} />}
            {m.note && <p className="note">{m.note}</p>}
            {m.meta && <span className="meta">{m.meta}</span>}
          </div>
        ))}
      </div>
      <form className="ask" onSubmit={submit}>
        <textarea
          rows={1}
          value={text}
          placeholder="Message Mnemonic"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e) }}
        />
        <button className="btn" disabled={!busy && !text.trim()}>{busy ? 'Stop' : 'Send'}</button>
      </form>
      <details className="settings">
        <summary>Settings</summary>
        <Slider label="Temperature" min={0} max={1.5} step={0.05} v={s.temp} show={v => v.toFixed(2)} on={v => set('temp', v)} />
        <Slider label="Top-p" min={0.1} max={1} step={0.05} v={s.topp} show={v => v.toFixed(2)} on={v => set('topp', v)} />
        <Slider label="Longest reply" min={50} max={1000} step={50} v={s.max} show={v => `${v} tokens`} on={v => set('max', v)} />
        <Slider label="Threads" min={1} max={cores()} step={1} v={s.threads} show={v => `${v} of ${cores()}`} on={v => set('threads', v)} />
        <label className="check">
          <input type="checkbox" checked={s.multi} onChange={e => set('multi', e.target.checked)} />
          Remember earlier turns (it's small, it does better one question at a time)
        </label>
      </details>
    </div>
  )
}

function Slider({ label, min, max, step, v, show, on }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={e => on(+e.target.value)} />
      <output>{show(v)}</output>
    </label>
  )
}

// a little markdown for the replies: paragraphs, lists, headings, code, bold, italics
function md(src) {
  const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const inline = t => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
  const out = []
  let para = [], list = null
  const endPara = () => { if (para.length) out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = [] }
  const endList = () => { if (list) out.push(`</${list}>`); list = null }
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    let m
    if (l.trimStart().startsWith('```')) {
      endPara(); endList()
      const code = []
      while (++i < lines.length && !lines[i].trimStart().startsWith('```')) code.push(lines[i])
      out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>')
    } else if ((m = l.match(/^#{1,6}\s+(.*)/))) {
      endPara(); endList()
      out.push(`<h4>${inline(m[1])}</h4>`)
    } else if ((m = l.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)/))) {
      endPara()
      const kind = m[1] ? 'ol' : 'ul'
      if (list !== kind) { endList(); out.push(kind === 'ol' ? `<ol start="${m[1]}">` : '<ul>'); list = kind }
      out.push(`<li>${inline(m[2])}</li>`)
    } else if (!l.trim()) {
      endPara()
    } else {
      endList()
      para.push(l)
    }
  }
  endPara(); endList()
  return out.join('')
}
