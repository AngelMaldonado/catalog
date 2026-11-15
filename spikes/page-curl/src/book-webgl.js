// Variant (c): realistic page curl in WebGL (no library).
// The turning leaf is a mesh wrapped around a vertical cylinder that travels from the free edge to
// the spine: points before the fold stay flat, points on the cylinder bend (radius R), points past
// it lie flipped on top. Pages are painted once into canvases and uploaded as textures; only the
// window of ±2 leaves keeps textures alive. Draws on demand (no loop while idle).
// Same leaf model as the CSS variant: portrait leaf i = page i + its mirrored reverse;
// spread leaf j = page 2j (front, right) + page 2j+1 (back, left).
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { paintPage, FILLER } from './pages.js'

gsap.registerPlugin(Draggable)

const VS = `
attribute vec2 a_uv;
uniform float u_curl;   // 1 = turning leaf, 0 = flat page
uniform float u_d;      // fold position, page widths from the spine
uniform float u_R;      // cylinder radius, page widths
uniform vec2 u_origin;  // left edge of a flat page, or the spine for the leaf (px)
uniform vec2 u_page;    // page size (px)
uniform vec2 u_view;    // canvas size (px)
uniform float u_focal;  // perspective focal length (px)
uniform float u_zbias;
varying vec2 v_uv;
varying float v_theta;
void main() {
  float X = a_uv.x;
  float Z = 0.0;
  float th = 0.0;
  if (u_curl > 0.5) {
    float s = a_uv.x - u_d;
    if (s > 0.0) {
      float halfArc = 3.14159265 * u_R;
      if (s < halfArc) {
        th = s / max(u_R, 1e-4);
        X = u_d + u_R * sin(th);
        Z = u_R * (1.0 - cos(th));
      } else {
        th = 3.14159265;
        X = u_d - (s - halfArc);
        Z = 2.0 * u_R;
      }
    }
  }
  v_uv = a_uv;
  v_theta = th;
  vec2 p = u_origin + vec2(X * u_page.x, a_uv.y * u_page.y);
  float z = Z * u_page.x;
  vec2 c = u_view * 0.5;
  vec2 q = c + (p - c) * (u_focal / (u_focal - z));
  gl_Position = vec4(q.x / u_view.x * 2.0 - 1.0, 1.0 - q.y / u_view.y * 2.0, -Z * 0.25 + u_zbias, 1.0);
}`

const FS = `
precision mediump float;
uniform sampler2D u_front;
uniform sampler2D u_back;
uniform highp float u_curl;
uniform float u_backMirror; // 1 = back is the mirrored reverse of the front (portrait)
uniform float u_shadowX;    // static page: curl edge, page widths from its left edge
uniform float u_shadowAmt;
varying vec2 v_uv;
varying float v_theta;
void main() {
  if (u_curl > 0.5) {
    vec3 col;
    float light;
    if (gl_FrontFacing) {
      col = texture2D(u_front, v_uv).rgb;
      light = 0.55 + 0.45 * cos(min(v_theta, 1.5707963));
    } else {
      if (u_backMirror > 0.5) col = mix(texture2D(u_front, v_uv).rgb, vec3(0.957, 0.937, 0.902), 0.55);
      else col = texture2D(u_back, vec2(1.0 - v_uv.x, v_uv.y)).rgb;
      light = 0.55 + 0.45 * abs(cos(max(v_theta, 1.5707963)));
    }
    float spec = 0.10 * pow(max(0.0, sin(v_theta * 2.0)), 8.0);
    gl_FragColor = vec4(col * light + spec, 1.0);
  } else {
    vec3 col = texture2D(u_front, v_uv).rgb;
    float dist = v_uv.x - u_shadowX;
    float sh = u_shadowAmt * (1.0 - smoothstep(0.0, 0.35, dist)) * step(0.0, dist);
    gl_FragColor = vec4(col * (1.0 - sh), 1.0);
  }
}`

const COLS = 64
const ROWS = 6
const WINDOW = 2
const clamp = (x) => Math.max(0, Math.min(1, x))

export function mountWebgl(app, pages, { spread, meter }) {
  const ratio = 9 / 16
  const vw = innerWidth
  const vh = innerHeight
  const pageH = spread ? Math.min(vh * 0.94, (vw * 0.96) / 2 / ratio) : Math.min(vh, vw / ratio)
  const pageW = pageH * ratio
  const dpr = Math.min(devicePixelRatio, 2)
  const bookW = spread ? pageW * 2 : pageW

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bookW * dpr)
  canvas.height = Math.round(pageH * dpr)
  canvas.style.cssText = `width:${bookW}px;height:${pageH}px;display:block;touch-action:none`
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  app.appendChild(canvas)
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true })
  if (!gl) {
    document.getElementById('hud').textContent = 'WebGL no disponible'
    return
  }

  // ---- program ------------------------------------------------------------
  const sh = (type, src) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
    return s
  }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
  gl.useProgram(prog)
  const U = {}
  for (const n of ['u_curl', 'u_d', 'u_R', 'u_origin', 'u_page', 'u_view', 'u_focal', 'u_zbias', 'u_front', 'u_back', 'u_backMirror', 'u_shadowX', 'u_shadowAmt'])
    U[n] = gl.getUniformLocation(prog, n)

  // grid mesh in uv space
  const verts = []
  for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) verts.push(c / COLS, r / ROWS)
  const idx = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const a = r * (COLS + 1) + c
      const b = a + 1
      const d = a + COLS + 1
      const e = d + 1
      idx.push(a, b, d, b, e, d)
    }
  const vb = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vb)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
  const ib = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a_uv')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  gl.enable(gl.DEPTH_TEST)
  gl.depthFunc(gl.LEQUAL)
  gl.frontFace(gl.CW) // uv grid is clockwise once y is flipped to NDC
  gl.uniform2f(U.u_view, canvas.width, canvas.height)
  gl.uniform2f(U.u_page, pageW * dpr, pageH * dpr)
  gl.uniform1f(U.u_focal, 2200 * dpr)
  gl.uniform1i(U.u_front, 0)
  gl.uniform1i(U.u_back, 1)

  // ---- pages and textures -----------------------------------------------------
  let seq = pages.slice()
  if (spread) {
    const interior = seq.slice(1, -1)
    if (interior.length % 2) interior.push(FILLER)
    seq = [seq[0], ...interior, seq[seq.length - 1]]
  }
  const count = spread ? seq.length / 2 : seq.length
  let v = 0
  const blank = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, blank)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([244, 239, 230, 255]))
  const textures = new Map() // page index → { tex, ready }
  const tw = Math.round(pageW * dpr)
  const th = Math.round(pageH * dpr)

  function texture(i) {
    if (i == null || i < 0 || i >= seq.length) return null
    let t = textures.get(i)
    if (!t) {
      t = { tex: null, ready: paintPage(seq[i], tw, th, i).then((c) => {
        const tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
        t.tex = tex
        request()
      }) }
      textures.set(i, t)
    }
    return t
  }
  const texOf = (i) => (i == null ? null : texture(i)?.tex || blank)
  function windowPages() {
    const s = new Set()
    for (let j = v - WINDOW; j <= v + WINDOW; j++) {
      if (j < 0 || j >= count) continue
      if (spread) s.add(2 * j).add(2 * j + 1)
      else s.add(j)
    }
    return s
  }
  function evictAndWarm() {
    const keep = windowPages()
    for (const [i, t] of textures) if (!keep.has(i)) {
      if (t.tex) gl.deleteTexture(t.tex)
      textures.delete(i)
    }
    for (const i of keep) texture(i)
  }

  // ---- drawing ------------------------------------------------------------------
  const spineX = spread ? pageW * dpr : 0
  let turn = null
  let pending = false
  function request() {
    if (pending) return
    pending = true
    requestAnimationFrame(draw)
  }
  function flat(i, leftEdge, shadowX, shadowAmt) {
    const t = texOf(i)
    if (!t) return
    gl.uniform1f(U.u_curl, 0)
    gl.uniform2f(U.u_origin, leftEdge, 0)
    gl.uniform1f(U.u_zbias, 0.01)
    gl.uniform1f(U.u_shadowX, shadowX)
    gl.uniform1f(U.u_shadowAmt, shadowAmt)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0)
  }
  function leaf(front, back, mirror, p) {
    const R = 0.16 * Math.pow(Math.sin(Math.PI * p), 0.6) + 0.002
    const d = 1 - p
    gl.uniform1f(U.u_curl, 1)
    gl.uniform1f(U.u_d, d)
    gl.uniform1f(U.u_R, R)
    gl.uniform2f(U.u_origin, spineX, 0)
    gl.uniform1f(U.u_zbias, 0)
    gl.uniform1f(U.u_backMirror, mirror ? 1 : 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texOf(front) || blank)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, texOf(back) || blank)
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0)
    return { d, R }
  }
  // page indices shown at rest for view v
  const restLeft = (vv) => (spread && vv > 0 ? 2 * vv - 1 : null)
  const restRight = (vv) => (spread ? (vv < count ? 2 * vv : null) : vv)

  function draw() {
    pending = false
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    if (!turn) {
      if (spread) flat(restLeft(v), 0, 0, 0)
      flat(restRight(v), spineX, 0, 0)
      return
    }
    const { dir, p } = turn
    const j = dir > 0 ? v : v - 1 // moving leaf
    const front = spread ? 2 * j : j
    const back = spread ? 2 * j + 1 : j
    const lp = dir > 0 ? p : 1 - p // leaf progress: 0 flat on the right, 1 flipped
    const R = 0.16 * Math.pow(Math.sin(Math.PI * lp), 0.6) + 0.002
    const shadowAmt = 0.5 * Math.sin(Math.PI * lp)
    if (spread) {
      flat(restLeft(dir > 0 ? v : v - 1), 0, 0, 0)
      flat(restRight(dir > 0 ? v + 1 : v), spineX, 1 - lp + R, shadowAmt)
    } else {
      flat(dir > 0 ? v + 1 : v, 0, 1 - lp + R, shadowAmt)
    }
    leaf(front, back, !spread, lp)
  }

  // ---- input --------------------------------------------------------------------
  const proxy = document.createElement('div')
  proxy.style.cssText = 'position:absolute;width:1px;height:1px;left:-10px;top:-10px'
  document.body.appendChild(proxy)
  const span = spread ? pageW * 1.2 : pageW * 0.85
  let startX = 0
  let lastX = 0
  let lastT = 0
  let vel = 0
  let animating = false
  Draggable.create(proxy, {
    type: 'x',
    trigger: canvas,
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
      turn = { dir, p: 0 }
      meter.begin(dir > 0 ? 'fwd' : 'back')
      request()
    },
    onDrag() {
      if (!turn) return
      const now = performance.now()
      vel = (this.pointerX - lastX) / Math.max(1, now - lastT)
      lastX = this.pointerX
      lastT = now
      const dx = this.pointerX - startX
      turn.p = clamp(turn.dir > 0 ? -dx / span : dx / span)
      request()
    },
    onRelease() {
      if (!turn) return
      const t = turn
      const fling = t.dir > 0 ? vel < -0.4 : vel > 0.4
      const commit = t.p > 0.35 || fling
      animating = true
      gsap.to(t, {
        p: commit ? 1 : 0,
        duration: 0.12 + 0.5 * (commit ? 1 - t.p : t.p),
        ease: 'power2.out',
        onUpdate: request,
        onComplete: () => {
          if (commit) v += t.dir
          turn = null
          animating = false
          evictAndWarm()
          request()
          meter.end()
        },
      })
    },
  })

  evictAndWarm()
  Promise.all([...textures.values()].map((t) => t.ready)).then(() => {
    request()
    meter.ready()
  })
}
