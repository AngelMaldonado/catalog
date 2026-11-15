// Base común de los motores del libro: tamaño de página 9:16 dentro del contenedor, modelo de
// hojas (móvil: hoja i = página i con su reverso; pliego: hoja j = páginas 2j y 2j+1), entrada
// con Pointer Events (arrastrar desde cualquier punto; tocar los bordes pasa página; tocar el
// resto avisa al visor), animación con GSAP y medición de fps de las primeras vueltas.
import { gsap } from 'gsap'
import type { FuentePaginas } from '../datos'

export interface Vista {
  izq: number | null
  der: number | null
}
export interface OpcionesMotor {
  contenedor: HTMLElement
  fuente: FuentePaginas
  pliego: boolean
  /** hojas ya volteadas al iniciar */
  inicial?: number
  onVista(v: Vista, hoja: number): void
  /** toque fuera de los bordes: página y coordenadas normalizadas (0–1) dentro de ella */
  onToque(pagina: number, x: number, y: number): void
  onFps?(fps: number): void
  onFallo?(motivo: string): void
}
export interface Vuelta {
  dir: 1 | -1
  p: number
}

export const RATIO = 9 / 16
const BORDE = 0.16 // fracción de la página que pasa de hoja al tocarla

export abstract class MotorBase {
  protected o: OpcionesMotor
  protected v: number
  protected pageW = 0
  protected pageH = 0
  protected dpr = Math.min(devicePixelRatio, 2)
  protected vuelta: Vuelta | null = null
  protected animando = false
  private tween: gsap.core.Tween | null = null
  private ro: ResizeObserver
  private inicio: { x: number; y: number; id: number } | null = null
  private arrastrando = false
  private ultimo = { x: 0, t: 0, vel: 0 }
  private cuadros: number[] = []
  private midiendo = false
  private abierta = false
  private vueltasMedidas = 0

  constructor(o: OpcionesMotor) {
    this.o = o
    this.v = Math.min(o.inicial ?? 0, this.maxV)
    this.medir()
    this.ro = new ResizeObserver(() => {
      const w = this.pageW
      this.medir()
      if (Math.abs(w - this.pageW) > 1) this.redimensionar()
    })
    this.ro.observe(o.contenedor)
    o.contenedor.addEventListener('pointerdown', this.bajar)
    o.contenedor.addEventListener('pointermove', this.mover)
    o.contenedor.addEventListener('pointerup', this.soltar)
    o.contenedor.addEventListener('pointercancel', this.soltar)
    o.contenedor.addEventListener('contextmenu', this.sinMenu)
  }

  get hojas() {
    return this.o.pliego ? this.o.fuente.total / 2 : this.o.fuente.total
  }
  get maxV() {
    return this.o.pliego ? this.hojas : this.hojas - 1
  }
  /** páginas visibles con `v` hojas volteadas */
  vista(v = this.v): Vista {
    const n = this.o.fuente.total
    if (!this.o.pliego) return { izq: null, der: v < n ? v : null }
    return { izq: v > 0 ? 2 * v - 1 : null, der: v < this.hojas ? 2 * v : null }
  }
  /** página del frente / reverso de la hoja j */
  protected caras(j: number): [number, number, boolean] {
    return this.o.pliego ? [2 * j, 2 * j + 1, false] : [j, j, true]
  }

  private medir() {
    const { clientWidth: W, clientHeight: H } = this.o.contenedor
    this.pageH = Math.max(1, Math.floor(this.o.pliego ? Math.min(H, W / 2 / RATIO) : Math.min(H, W / RATIO)))
    this.pageW = Math.floor(this.pageH * RATIO)
  }
  protected get texW() {
    return Math.round(this.pageW * this.dpr)
  }
  protected get texH() {
    return Math.round(this.pageH * this.dpr)
  }

  protected abstract redimensionar(): void
  protected abstract rectLibro(): DOMRect
  protected abstract empezar(dir: 1 | -1): boolean
  protected abstract ajustar(p: number): void
  protected abstract terminar(commit: boolean): void
  abstract destruir(): void

  protected avisarVista() {
    this.o.onVista(this.vista(), this.v)
  }

  siguiente() {
    this.automatica(1)
  }
  anterior() {
    this.automatica(-1)
  }

  private automatica(dir: 1 | -1) {
    if (this.animando || this.vuelta) return
    if (dir > 0 ? this.v >= this.maxV : this.v <= 0) return
    if (!this.empezar(dir)) return
    this.vuelta = { dir, p: 0 }
    this.animar(true, 0.55)
  }

  private animar(commit: boolean, dur?: number) {
    const t = this.vuelta!
    this.animando = true
    this.tween = gsap.to(t, {
      p: commit ? 1 : 0,
      duration: dur ?? 0.12 + 0.45 * (commit ? 1 - t.p : t.p),
      ease: 'power2.out',
      onUpdate: () => this.ajustar(t.p),
      onComplete: () => {
        if (commit) this.v += t.dir
        this.vuelta = null
        this.animando = false
        this.terminar(commit)
        this.avisarVista()
        this.cerrarMedicion()
      },
    })
  }

  // ---- medición de fps (primeras vueltas) -----------------------------------
  private marcar = (t: number) => {
    this.cuadros.push(t)
    if (this.midiendo) requestAnimationFrame(this.marcar)
  }
  private abrirMedicion() {
    if (!this.o.onFps) return
    this.cuadros = []
    this.abierta = true
    this.midiendo = true
    requestAnimationFrame(this.marcar)
  }
  private cerrarMedicion() {
    this.midiendo = false
    if (!this.abierta) return
    this.abierta = false
    if (this.cuadros.length < 6 || !this.o.onFps) return
    this.vueltasMedidas++
    const f = this.cuadros
    const fps = ((f.length - 1) * 1000) / (f[f.length - 1] - f[0])
    if (this.vueltasMedidas > 1) this.o.onFps(fps) // la primera incluye el calentamiento
  }

  // ---- entrada --------------------------------------------------------------
  private sinMenu = (e: Event) => e.preventDefault()
  private bajar = (e: PointerEvent) => {
    if (this.animando || this.inicio) return
    this.inicio = { x: e.clientX, y: e.clientY, id: e.pointerId }
    this.arrastrando = false
    this.ultimo = { x: e.clientX, t: performance.now(), vel: 0 }
  }
  private mover = (e: PointerEvent) => {
    if (!this.inicio || e.pointerId !== this.inicio.id) return
    const dx = e.clientX - this.inicio.x
    const now = performance.now()
    this.ultimo = { x: e.clientX, t: now, vel: (e.clientX - this.ultimo.x) / Math.max(1, now - this.ultimo.t) }
    if (!this.arrastrando) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - this.inicio.y)) return
      const dir: 1 | -1 = dx < 0 ? 1 : -1
      if (dir > 0 ? this.v >= this.maxV : this.v <= 0) return
      if (!this.empezar(dir)) return
      this.arrastrando = true
      this.vuelta = { dir, p: 0 }
      this.o.contenedor.setPointerCapture(e.pointerId)
      this.abrirMedicion()
    }
    const span = this.o.pliego ? this.pageW * 1.2 : this.pageW * 0.85
    const t = this.vuelta!
    t.p = Math.max(0, Math.min(1, t.dir > 0 ? -dx / span : dx / span))
    this.ajustar(t.p)
  }
  private soltar = (e: PointerEvent) => {
    if (!this.inicio || e.pointerId !== this.inicio.id) return
    const ini = this.inicio
    this.inicio = null
    if (this.arrastrando && this.vuelta) {
      const t = this.vuelta
      const fling = t.dir > 0 ? this.ultimo.vel < -0.4 : this.ultimo.vel > 0.4
      this.animar(t.p > 0.35 || fling)
      return
    }
    if (e.type === 'pointercancel' || Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 10) return
    this.tocar(e.clientX, e.clientY)
  }

  private tocar(cx: number, cy: number) {
    const r = this.rectLibro()
    const x = cx - r.left
    const y = (cy - r.top) / this.pageH
    if (y < 0 || y > 1) return
    const vista = this.vista()
    let pagina: number | null
    let px: number
    if (this.o.pliego) {
      const izquierda = x < this.pageW
      pagina = izquierda ? vista.izq : vista.der
      px = (izquierda ? x : x - this.pageW) / this.pageW
      if (pagina === null) return
      if (izquierda && px < BORDE) return this.anterior()
      if (!izquierda && px > 1 - BORDE) return this.siguiente()
    } else {
      pagina = vista.der
      px = x / this.pageW
      if (pagina === null) return
      if (px < BORDE) return this.anterior()
      if (px > 1 - BORDE) return this.siguiente()
    }
    if (px >= 0 && px <= 1) this.o.onToque(pagina, px, y)
  }

  protected matarAnimacion() {
    this.tween?.kill()
    this.tween = null
  }

  protected desmontarEntrada() {
    this.ro.disconnect()
    const c = this.o.contenedor
    c.removeEventListener('pointerdown', this.bajar)
    c.removeEventListener('pointermove', this.mover)
    c.removeEventListener('pointerup', this.soltar)
    c.removeEventListener('pointercancel', this.soltar)
    c.removeEventListener('contextmenu', this.sinMenu)
  }
}
