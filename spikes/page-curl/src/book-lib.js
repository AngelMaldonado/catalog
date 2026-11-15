// Variant (b): StPageFlip (`page-flip` 2.0.7, last published 2022-05) in HTML mode.
// The library decides portrait/landscape from the parent width and keeps every page in the DOM.
import { PageFlip } from 'page-flip'
import { renderPage, FILLER } from './pages.js'

export function mountLib(app, pages, { spread, paint, meter }) {
  const ratio = 9 / 16
  const pageH = spread ? Math.min(innerHeight * 0.94, (innerWidth * 0.96) / 2 / ratio) : Math.min(innerHeight, innerWidth / ratio)
  const pageW = Math.floor(pageH * ratio)
  const host = document.createElement('div')
  host.className = 'lib-host'
  app.appendChild(host)

  let seq = pages.slice()
  const interior = seq.slice(1, -1)
  if (spread && interior.length % 2) seq = [seq[0], ...interior, FILLER, seq[seq.length - 1]]

  const els = []
  const jobs = []
  for (let i = 0; i < seq.length; i++) {
    const p = document.createElement('div')
    p.className = 'page'
    if (i === 0 || i === seq.length - 1) p.dataset.density = 'hard'
    p.style.width = pageW + 'px'
    p.style.height = Math.floor(pageH) + 'px'
    host.appendChild(p)
    const inner = document.createElement('div')
    inner.style.cssText = 'position:absolute;inset:0'
    p.appendChild(inner)
    jobs.push(renderPage(inner, seq[i], i, paint))
    els.push(p)
  }

  Promise.all(jobs).then(() => {
    const pf = new PageFlip(host, {
      width: pageW,
      height: Math.floor(pageH),
      size: 'fixed',
      showCover: true,
      usePortrait: true,
      mobileScrollSupport: false,
      maxShadowOpacity: 0.5,
      flippingTime: 700,
    })
    pf.on('changeState', (e) => {
      if (e.data === 'user_fold' || e.data === 'flipping') meter.begin('lib')
      if (e.data === 'read') meter.end()
    })
    pf.on('init', (e) => {
      document.getElementById('hud').dataset.orientation = e.data.mode
      meter.ready()
    })
    pf.loadFromHTML(els)
  })
}
