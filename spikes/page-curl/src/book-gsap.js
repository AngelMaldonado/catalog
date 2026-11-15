// Variant (a): own page turn with GSAP Draggable + CSS 3D, "book of leaves" model.
// Every leaf (sheet of paper) is built once, in idle time, with its front and back faces and
// is never re-parented: turning a page only changes the leaf's rotateY and z-index, so the
// compositor reuses the already-rastered layers (re-parenting caused raster jank at drag start).
//   strips = 0  → rigid leaf rotating around the spine
//   strips = N  → leaf split in N nested strips that bend while turning (cheap curl)
// Portrait (mobile): leaf i = page i on the front, its mirrored reverse on the back.
// Spread (landscape/desktop): leaf j = page 2j on the front (right), page 2j+1 on the back (left);
// cover alone on the right, back cover alone on the left, filler appended if interior is odd.
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { renderPage, FILLER } from './pages.js'

gsap.registerPlugin(Draggable)

const el = (tag, cls) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  return e
}
const clamp = (x) => Math.max(0, Math.min(1, x))
const WINDOW = 2 // leaves kept alive around the current position

export function mountGsapBook(app, pages, { spread, strips, paint, meter }) {
  const ratio = 9 / 16
  const vw = innerWidth
  const vh = innerHeight
  const pageH = spread ? Math.min(vh * 0.94, (vw * 0.96) / 2 / ratio) : Math.min(vh, vw / ratio)
  const pageW = pageH * ratio
  const book = el('div', 'book')
  book.style.width = (spread ? pageW * 2 : pageW) + 'px'
  book.style.height = pageH + 'px'
  app.appendChild(book)

  let seq = pages.slice()
  if (spread) {
    const interior = seq.slice(1, -1)
    if (interior.length % 2) interior.push(FILLER)
    seq = [seq[0], ...interior, seq[seq.length - 1]]
  }
  const count = spread ? seq.length / 2 : seq.length // number of leaves
  const faces = (j) => (spread ? [2 * j, 2 * j + 1, false] : [j, j, true]) // front, back, back is mirrored
  let v = 0 // flipped leaves; current view = back of leaf v-1 (left) + front of leaf v (right)

  const left = spread ? pageW : 0
  const shade = el('div', 'shade')
  shade.style.left = left + 'px'
  shade.style.width = pageW + 'px'
  book.appendChild(shade)

  // ---- leaves -------------------------------------------------------------
  const leaves = new Map() // j → leaf
  const jobs = []

  function pageInto(parent, idx, mirrored) {
    let target = parent
    if (mirrored) {
      target = el('div', 'reverse')
      parent.appendChild(target)
      const veil = el('div')
      veil.style.cssText = 'position:absolute;inset:0;background:rgba(244,239,230,.55)'
      parent.appendChild(veil)
    }
    jobs.push(renderPage(target, seq[idx], idx, paint))
  }

  function buildLeaf(j) {
    const [fi, bi, mirrored] = faces(j)
    const root = el('div', 'sheet')
    root.style.left = left + 'px'
    if (!strips) {
      root.style.width = pageW + 'px'
      const f = el('div', 'face front')
      const b = el('div', 'face back')
      pageInto(f, fi, false)
      pageInto(b, bi, mirrored)
      const fl = el('div', 'light')
      const bl = el('div', 'light')
      f.appendChild(fl)
      b.appendChild(bl)
      root.append(f, b)
      const setRot = gsap.quickSetter(root, 'rotationY', 'deg')
      return {
        root,
        set(a) {
          setRot(a)
          const t = Math.abs(a)
          fl.style.opacity = t === 0 ? 0 : Math.min(1, t / 90) * 0.8
          bl.style.opacity = t === 180 ? 0 : Math.min(1, (180 - t) / 90) * 0.8
        },
      }
    }
    const sw = pageW / strips
    root.style.width = '0px'
    const list = []
    let parent = root
    for (let k = 0; k < strips; k++) {
      const s = el('div', 'strip')
      s.style.width = sw + 0.5 + 'px' // overlap hides seams
      s.style.left = (k === 0 ? 0 : sw) + 'px'
      const f = el('div', 'face front')
      const b = el('div', 'face back')
      const fin = el('div', 'inner')
      fin.style.width = pageW + 'px'
      fin.style.left = -(k * sw) + 'px'
      pageInto(fin, fi, false)
      const bin = el('div', 'inner')
      bin.style.width = pageW + 'px'
      bin.style.left = -(pageW - (k + 1) * sw) + 'px'
      pageInto(bin, bi, mirrored)
      const fl = el('div', 'light')
      const bl = el('div', 'light')
      f.append(fin, fl)
      b.append(bin, bl)
      s.append(f, b)
      parent.appendChild(s)
      parent = s
      list.push({ set: gsap.quickSetter(s, 'rotationY', 'deg'), fl, bl })
    }
    const BEND = 70
    return {
      root,
      set(a) {
        const p = Math.abs(a) / 180
        const bend = BEND * Math.sin(Math.PI * p)
        let prev = 0
        for (let k = 0; k < strips; k++) {
          const theta = Math.max(-180, Math.min(0, a - bend * Math.pow(k / (strips - 1), 1.4)))
          list[k].set(theta - prev)
          prev = theta
          const t = Math.abs(theta)
          list[k].fl.style.opacity = t === 0 ? 0 : Math.min(1, t / 90) * 0.75
          list[k].bl.style.opacity = t === 180 ? 0 : Math.min(1, (180 - t) / 90) * 0.75
        }
      },
    }
  }

  function restZ(j) {
    // unflipped leaves stack with the next one on top; flipped ones with the last flipped on top
    return j >= v ? count - j : j + 1
  }
  function layout() {
    for (let j = Math.max(0, v - WINDOW); j < Math.min(count, v + WINDOW + 1); j++) {
      if (!leaves.has(j)) {
        const leaf = buildLeaf(j)
        book.appendChild(leaf.root)
        leaves.set(j, leaf)
      }
    }
    for (const [j, leaf] of leaves) {
      if (j < v - WINDOW || j > v + WINDOW) {
        leaf.root.remove()
        leaves.delete(j)
        continue
      }
      leaf.set(j < v ? -180 : 0)
      leaf.root.style.zIndex = restZ(j)
      // portrait: flipped leaves sit off-screen to the left; keep only the last one visible
      leaf.root.style.visibility = !spread && j < v - 1 ? 'hidden' : 'visible'
    }
    shade.style.zIndex = 0
  }
  const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 600 }) : setTimeout(fn, 30))

  // ---- turning --------------------------------------------------------------
  function beginTurn(dir) {
    const j = dir > 0 ? v : v - 1 // the leaf that moves
    const leaf = leaves.get(j)
    if (!leaf) return null
    leaf.root.style.zIndex = count + 2
    leaf.root.style.visibility = 'visible'
    shade.style.zIndex = count + 1
    return {
      dir,
      p: 0,
      set(p) {
        this.p = p
        const a = dir > 0 ? -180 * p : -180 * (1 - p)
        leaf.set(a)
        shade.style.opacity = 0.55 * Math.sin((Math.PI * Math.abs(a)) / 180)
      },
      finish(commit) {
        if (commit) v += dir
        shade.style.opacity = 0
        layout()
        idle(layout)
      },
    }
  }

  // ---- input ------------------------------------------------------------------
  const proxy = el('div')
  proxy.style.cssText = 'position:absolute;width:1px;height:1px;left:-10px;top:-10px'
  document.body.appendChild(proxy)
  const span = spread ? pageW * 1.2 : pageW * 0.85
  let turn = null
  let startX = 0
  let lastX = 0
  let lastT = 0
  let vel = 0
  let animating = false

  Draggable.create(proxy, {
    type: 'x',
    trigger: book,
    minimumMovement: 4,
    onPress() {
      startX = lastX = this.pointerX
      lastT = performance.now()
      vel = 0
    },
    onDragStart() {
      if (animating) return
      const dir = this.pointerX - startX < 0 ? 1 : -1
      if (dir > 0 ? v >= count - (spread ? 0 : 1) : v <= 0) return
      turn = beginTurn(dir)
      if (turn) meter.begin(dir > 0 ? 'fwd' : 'back')
    },
    onDrag() {
      if (!turn) return
      const now = performance.now()
      vel = (this.pointerX - lastX) / Math.max(1, now - lastT)
      lastX = this.pointerX
      lastT = now
      const dx = this.pointerX - startX
      turn.set(clamp(turn.dir > 0 ? -dx / span : dx / span))
    },
    onRelease() {
      if (!turn) return
      const t = turn
      turn = null
      const fling = t.dir > 0 ? vel < -0.4 : vel > 0.4
      const commit = t.p > 0.35 || fling
      animating = true
      gsap.to(t, {
        p: commit ? 1 : 0,
        duration: 0.12 + 0.45 * (commit ? 1 - t.p : t.p),
        ease: 'power2.out',
        onUpdate: () => t.set(t.p),
        onComplete: () => {
          t.finish(commit)
          animating = false
          meter.end()
        },
      })
    },
  })

  layout()
  Promise.all(jobs).then(() => meter.ready())
}
