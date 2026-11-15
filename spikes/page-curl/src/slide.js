// Fallback for prefers-reduced-motion or slow devices: plain horizontal slide, one page.
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { renderPage } from './pages.js'

gsap.registerPlugin(Draggable)

export function mountSlide(app, pages, { paint, meter }) {
  const ratio = 9 / 16
  const pageH = Math.min(innerHeight, innerWidth / ratio)
  const pageW = pageH * ratio
  const box = document.createElement('div')
  box.style.cssText = `position:relative;width:${pageW}px;height:${pageH}px;overflow:hidden`
  app.appendChild(box)
  const mk = (i) => {
    const s = document.createElement('div')
    s.className = 'slide'
    box.appendChild(s)
    if (pages[i]) renderPage(s, pages[i], i, paint)
    return s
  }
  let i = 0
  let cur = mk(0)
  let next = null
  let dir = 0
  const proxy = document.createElement('div')
  document.body.appendChild(proxy)
  Draggable.create(proxy, {
    type: 'x',
    trigger: box,
    onDragStart() {
      dir = this.getDirection('start') === 'left' ? 1 : -1
      if (!pages[i + dir]) return (dir = 0)
      meter.begin('slide')
      next = mk(i + dir)
    },
    onDrag() {
      if (!dir) return
      const dx = this.x - this.startX
      gsap.set(cur, { x: dx })
      gsap.set(next, { x: dx + dir * pageW })
    },
    onRelease() {
      if (!dir) return
      const dx = this.x - this.startX
      const commit = Math.abs(dx) > pageW * 0.25
      const d = dir
      gsap.to(cur, { x: commit ? -d * pageW : 0, duration: 0.3, ease: 'power2.out' })
      gsap.to(next, {
        x: commit ? 0 : d * pageW,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          if (commit) {
            cur.remove()
            cur = next
            i += d
          } else next.remove()
          next = null
          meter.end()
        },
      })
      dir = 0
    },
  })
  meter.ready()
}
