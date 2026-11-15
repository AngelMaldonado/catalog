// Motor «Página realista»: la hoja se envuelve en un cilindro que viaja del borde libre al lomo
// (WebGL, sin librería; spike: 59.7 fps en el A04e, 0 % de cuadros perdidos). Texturas pintadas
// por la fuente; sólo viven las de ±2 hojas. Dibuja sólo cuando algo cambia.
import { MotorBase, type OpcionesMotor } from './base'

const VS = `
attribute vec2 a_uv;
uniform float u_curl; uniform float u_d; uniform float u_R;
uniform vec2 u_origin; uniform vec2 u_page; uniform vec2 u_view; uniform float u_focal; uniform float u_zbias;
varying vec2 v_uv; varying float v_theta;
void main() {
  float X = a_uv.x; float Z = 0.0; float th = 0.0;
  if (u_curl > 0.5) {
    float s = a_uv.x - u_d;
    if (s > 0.0) {
      float halfArc = 3.14159265 * u_R;
      if (s < halfArc) { th = s / max(u_R, 1e-4); X = u_d + u_R * sin(th); Z = u_R * (1.0 - cos(th)); }
      else { th = 3.14159265; X = u_d - (s - halfArc); Z = 2.0 * u_R; }
    }
  }
  v_uv = a_uv; v_theta = th;
  vec2 p = u_origin + vec2(X * u_page.x, a_uv.y * u_page.y);
  float z = Z * u_page.x;
  vec2 c = u_view * 0.5;
  vec2 q = c + (p - c) * (u_focal / (u_focal - z));
  gl_Position = vec4(q.x / u_view.x * 2.0 - 1.0, 1.0 - q.y / u_view.y * 2.0, -Z * 0.25 + u_zbias, 1.0);
}`
const FS = `
precision mediump float;
uniform sampler2D u_front; uniform sampler2D u_back;
uniform highp float u_curl; uniform float u_backMirror; uniform float u_shadowX; uniform float u_shadowAmt; uniform vec3 u_paper;
varying vec2 v_uv; varying float v_theta;
void main() {
  if (u_curl > 0.5) {
    vec3 col; float light;
    if (gl_FrontFacing) { col = texture2D(u_front, v_uv).rgb; light = 0.55 + 0.45 * cos(min(v_theta, 1.5707963)); }
    else {
      if (u_backMirror > 0.5) col = mix(texture2D(u_front, v_uv).rgb, u_paper, 0.55);
      else col = texture2D(u_back, vec2(1.0 - v_uv.x, v_uv.y)).rgb;
      light = 0.55 + 0.45 * abs(cos(max(v_theta, 1.5707963)));
    }
    gl_FragColor = vec4(col * light + 0.10 * pow(max(0.0, sin(v_theta * 2.0)), 8.0), 1.0);
  } else {
    vec3 col = texture2D(u_front, v_uv).rgb;
    float dist = v_uv.x - u_shadowX;
    gl_FragColor = vec4(col * (1.0 - u_shadowAmt * (1.0 - smoothstep(0.0, 0.35, dist)) * step(0.0, dist)), 1.0);
  }
}`
const COLS = 64
const ROWS = 6
const VENTANA = 2

const hexRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export class MotorRealista extends MotorBase {
  private lienzo!: HTMLCanvasElement
  private gl!: WebGLRenderingContext
  private U: Record<string, WebGLUniformLocation | null> = {}
  private nIdx = 0
  private texturas = new Map<number, WebGLTexture | null>() // null = cargando
  private blanco!: WebGLTexture
  private pendiente = false
  private vivo = true

  constructor(o: OpcionesMotor) {
    super(o)
    if (!this.montar()) return
    this.acomodar()
    this.avisarVista()
  }

  private montar(): boolean {
    const ancho = this.o.pliego ? this.pageW * 2 : this.pageW
    this.lienzo = document.createElement('canvas')
    this.lienzo.width = Math.round(ancho * this.dpr)
    this.lienzo.height = this.texH
    this.lienzo.style.cssText = `width:${ancho}px;height:${this.pageH}px;display:block;touch-action:none;-webkit-user-select:none;user-select:none`
    this.lienzo.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      this.o.onFallo?.('contexto WebGL perdido')
    })
    const gl = this.lienzo.getContext('webgl', { antialias: true, alpha: true })
    if (!gl) {
      queueMicrotask(() => this.o.onFallo?.('sin WebGL'))
      return false
    }
    this.gl = gl
    this.o.contenedor.append(this.lienzo)
    const sh = (t: number, src: string) => {
      const s = gl.createShader(t)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    for (const n of ['u_curl', 'u_d', 'u_R', 'u_origin', 'u_page', 'u_view', 'u_focal', 'u_zbias', 'u_front', 'u_back', 'u_backMirror', 'u_shadowX', 'u_shadowAmt', 'u_paper']) this.U[n] = gl.getUniformLocation(prog, n)
    const verts: number[] = []
    for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) verts.push(c / COLS, r / ROWS)
    const idx: number[] = []
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const a = r * (COLS + 1) + c
        idx.push(a, a + 1, a + COLS + 1, a + 1, a + COLS + 2, a + COLS + 1)
      }
    this.nIdx = idx.length
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a_uv')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.frontFace(gl.CW)
    gl.uniform2f(this.U.u_view, this.lienzo.width, this.lienzo.height)
    gl.uniform2f(this.U.u_page, this.texW, this.texH)
    gl.uniform1f(this.U.u_focal, 2200 * this.dpr)
    gl.uniform1i(this.U.u_front, 0)
    gl.uniform1i(this.U.u_back, 1)
    const [r, g, b] = hexRgb(this.o.fuente.color)
    gl.uniform3f(this.U.u_paper, r, g, b)
    this.blanco = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.blanco)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255]))
    return true
  }

  private paginasVentana() {
    const s = new Set<number>()
    for (let j = this.v - VENTANA; j <= this.v + VENTANA; j++) {
      if (j < 0 || j >= this.hojas) continue
      const [f, b] = this.caras(j)
      s.add(f).add(b)
    }
    return s
  }
  private acomodar() {
    const gl = this.gl
    const keep = this.paginasVentana()
    for (const [i, t] of this.texturas) if (!keep.has(i)) {
      if (t) gl.deleteTexture(t)
      this.texturas.delete(i)
    }
    for (const i of keep) {
      if (this.texturas.has(i)) continue
      this.texturas.set(i, null)
      this.o.fuente.lienzo(i, this.texW, this.texH).then((c) => {
        if (!this.vivo || !this.texturas.has(i)) return
        const t = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
        this.texturas.set(i, t)
        this.pedir()
      })
    }
    this.pedir()
  }
  private tex = (i: number | null) => (i === null ? null : this.texturas.get(i) || this.blanco)

  private pedir() {
    if (this.pendiente || !this.vivo) return
    this.pendiente = true
    requestAnimationFrame(() => this.dibujar())
  }
  private plana(i: number | null, x: number, sombraX = 0, sombra = 0) {
    const t = this.tex(i)
    if (!t) return
    const gl = this.gl
    gl.uniform1f(this.U.u_curl, 0)
    gl.uniform2f(this.U.u_origin, x, 0)
    gl.uniform1f(this.U.u_zbias, 0.01)
    gl.uniform1f(this.U.u_shadowX, sombraX)
    gl.uniform1f(this.U.u_shadowAmt, sombra)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_SHORT, 0)
  }
  private dibujar() {
    this.pendiente = false
    if (!this.vivo) return
    const gl = this.gl
    const lomo = this.o.pliego ? this.texW : 0
    gl.viewport(0, 0, this.lienzo.width, this.lienzo.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    const t = this.vuelta
    if (!t) {
      const vista = this.vista()
      if (this.o.pliego) this.plana(vista.izq, 0)
      this.plana(vista.der, lomo)
      return
    }
    const j = t.dir > 0 ? this.v : this.v - 1
    const [front, back, espejo] = this.caras(j)
    const lp = t.dir > 0 ? t.p : 1 - t.p
    const R = 0.16 * Math.pow(Math.sin(Math.PI * lp), 0.6) + 0.002
    const sombra = 0.5 * Math.sin(Math.PI * lp)
    const debajo = this.vista(t.dir > 0 ? this.v + 1 : this.v)
    if (this.o.pliego) {
      this.plana(this.vista(t.dir > 0 ? this.v : this.v - 1).izq, 0)
      this.plana(debajo.der, lomo, 1 - lp + R, sombra)
    } else this.plana(debajo.der, 0, 1 - lp + R, sombra)
    gl.uniform1f(this.U.u_curl, 1)
    gl.uniform1f(this.U.u_d, 1 - lp)
    gl.uniform1f(this.U.u_R, R)
    gl.uniform2f(this.U.u_origin, lomo, 0)
    gl.uniform1f(this.U.u_zbias, 0)
    gl.uniform1f(this.U.u_backMirror, espejo ? 1 : 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex(front))
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.tex(back))
    gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_SHORT, 0)
  }

  protected empezar() {
    return !!this.gl
  }
  protected ajustar() {
    this.pedir()
  }
  protected terminar() {
    this.acomodar()
  }
  protected redimensionar() {
    this.texturas.forEach((t) => t && this.gl.deleteTexture(t))
    this.texturas.clear()
    this.lienzo.remove()
    if (this.montar()) this.acomodar()
  }
  protected rectLibro() {
    return this.lienzo.getBoundingClientRect()
  }
  destruir() {
    this.vivo = false
    this.matarAnimacion()
    this.desmontarEntrada()
    this.texturas.forEach((t) => t && this.gl?.deleteTexture(t))
    this.lienzo?.remove()
  }
}
