// Router: /?v=a-rigid|c-webgl|a-strips|b-lib|slide&paint=img|canvas[&mode=portrait|spread]
// Without params shows a menu. prefers-reduced-motion forces the slide fallback.
import { PAGES } from './pages.js'
import { createMeter } from './meter.js'
import { mountGsapBook } from './book-gsap.js'
import { mountLib } from './book-lib.js'
import { mountSlide } from './slide.js'
import { mountWebgl } from './book-webgl.js'

const report = (msg) => fetch('/__metrics', { method: 'POST', body: JSON.stringify({ type: 'error', run: 'errors', msg: String(msg) }) }).catch(() => {})
addEventListener('error', (e) => report(e.message + ' @' + e.filename + ':' + e.lineno))
addEventListener('unhandledrejection', (e) => report(e.reason && (e.reason.stack || e.reason)))
const q = new URLSearchParams(location.search)
const app = document.getElementById('app')
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
// Product-shaped setting: turn=rigid (CSS 3D leaves) | realistic (WebGL curl)
const TURNS = { rigid: 'a-rigid', realistic: 'c-webgl' }
const turnSetting = q.get('turn')
if (turnSetting && TURNS[turnSetting]) {
  q.set('v', TURNS[turnSetting])
  if (!q.get('paint')) q.set('paint', 'canvas')
}
let variant = q.get('v')

if (!variant) {
  const links = ['a-rigid', 'c-webgl', 'a-strips', 'b-lib', 'slide'].flatMap((v) =>
    ['img', 'canvas'].map((p) => `<a href="/?v=${v}&paint=${p}">${v} · ${p}</a>`),
  )
  app.innerHTML = `<div class="menu"><b>Spike page-curl</b><a href="/?turn=rigid"><b>Hoja rígida</b></a><a href="/?turn=realistic"><b>Página realista</b></a>${links.join('')}<small>reduced-motion: ${reduced}</small></div>`
} else {
  if (reduced) variant = 'slide'
  const paint = q.get('paint') || 'img'
  const mode = q.get('mode') || (innerWidth > innerHeight ? 'spread' : 'portrait')
  const spread = mode === 'spread'
  const meter = createMeter({ variant, paint, mode: variant === 'slide' ? 'portrait' : mode, run: q.get('run') || '', reduced })
  if (turnSetting) {
    const other = turnSetting === 'rigid' ? 'realistic' : 'rigid'
    const b = document.createElement('a')
    b.textContent = other === 'rigid' ? 'Cambiar a hoja rígida' : 'Cambiar a página realista'
    b.href = `/?turn=${other}`
    b.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:99;background:#fff;color:#111;padding:10px 14px;border-radius:20px;font:600 13px system-ui;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.4)'
    document.body.appendChild(b)
  }
  if (variant === 'a-rigid') mountGsapBook(app, PAGES, { spread, strips: 0, paint, meter })
  else if (variant === 'a-strips') mountGsapBook(app, PAGES, { spread, strips: Number(q.get('strips') || 8), paint, meter })
  else if (variant === 'c-webgl') mountWebgl(app, PAGES, { spread, meter })
  else if (variant === 'b-lib') mountLib(app, PAGES, { spread, paint, meter })
  else mountSlide(app, PAGES, { paint, meter })
}
