// Motor «Hoja rígida»: modelo de hojas en CSS 3D (spike: 55–58 fps en el A04e). Cada hoja se
// construye una vez con su frente y su reverso y nunca se mueve en el DOM; pasar página sólo
// cambia rotateY y z-index. Luces y sombra en capas propias (will-change: opacity).
import { gsap } from 'gsap'
import { MotorBase, type OpcionesMotor } from './base'

const VENTANA = 2

interface Hoja {
  root: HTMLDivElement
  set(a: number): void
}

const div = (css: string, ...hijos: HTMLElement[]) => {
  const d = document.createElement('div')
  d.style.cssText = css
  d.append(...hijos)
  return d
}

export class MotorRigido extends MotorBase {
  private libro!: HTMLDivElement
  private sombra!: HTMLDivElement
  private hojasVivas = new Map<number, Hoja>()
  private moviendo: Hoja | null = null
  private vivo = true

  constructor(o: OpcionesMotor) {
    super(o)
    this.montar()
    this.avisarVista()
  }

  private montar() {
    const ancho = this.o.pliego ? this.pageW * 2 : this.pageW
    this.libro = div(`position:relative;width:${ancho}px;height:${this.pageH}px;perspective:2200px;touch-action:none;-webkit-user-select:none;user-select:none`)
    this.sombra = div(`position:absolute;top:0;left:${this.o.pliego ? this.pageW : 0}px;width:${this.pageW}px;height:100%;pointer-events:none;opacity:0;will-change:opacity;background:linear-gradient(to right,rgba(0,0,0,.55),rgba(0,0,0,0) 60%)`)
    this.libro.append(this.sombra)
    this.o.contenedor.append(this.libro)
    this.acomodar()
  }

  private cara(pagina: number, reverso: boolean, atras: boolean) {
    const lienzo = document.createElement('canvas')
    lienzo.width = this.texW
    lienzo.height = this.texH
    lienzo.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;${reverso ? 'transform:scaleX(-1);' : ''}`
    const ctx = lienzo.getContext('2d')!
    ctx.fillStyle = this.o.fuente.color
    ctx.fillRect(0, 0, lienzo.width, lienzo.height)
    this.o.fuente.lienzo(pagina, this.texW, this.texH).then((src) => this.vivo && ctx.drawImage(src, 0, 0, lienzo.width, lienzo.height))
    const capas: HTMLElement[] = [lienzo]
    if (reverso) capas.push(div(`position:absolute;inset:0;background:${this.o.fuente.color};opacity:.55`))
    const luz = div(`position:absolute;inset:0;pointer-events:none;opacity:0;will-change:opacity;background:linear-gradient(to ${atras ? 'right' : 'left'},rgba(0,0,0,.45),rgba(0,0,0,0) 70%)`)
    capas.push(luz)
    const el = div(`position:absolute;inset:0;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;${atras ? 'transform:rotateY(180deg);' : ''}`, ...capas)
    return { el, luz }
  }

  private construir(j: number): Hoja {
    const [fi, bi, espejo] = this.caras(j)
    const frente = this.cara(fi, false, false)
    const dorso = this.cara(bi, espejo, true)
    const root = div(`position:absolute;top:0;left:${this.o.pliego ? this.pageW : 0}px;width:${this.pageW}px;height:100%;transform-style:preserve-3d;transform-origin:0% 50%;will-change:transform`, frente.el, dorso.el)
    const rot = gsap.quickSetter(root, 'rotationY', 'deg') as (v: number) => void
    return {
      root,
      set(a) {
        rot(a)
        const t = Math.abs(a)
        frente.luz.style.opacity = String(t === 0 ? 0 : Math.min(1, t / 90) * 0.8)
        dorso.luz.style.opacity = String(t === 180 ? 0 : Math.min(1, (180 - t) / 90) * 0.8)
      },
    }
  }

  private acomodar() {
    for (let j = Math.max(0, this.v - VENTANA); j < Math.min(this.hojas, this.v + VENTANA + 1); j++) {
      if (!this.hojasVivas.has(j)) {
        const h = this.construir(j)
        this.libro.append(h.root)
        this.hojasVivas.set(j, h)
      }
    }
    for (const [j, h] of this.hojasVivas) {
      if (j < this.v - VENTANA || j > this.v + VENTANA) {
        h.root.remove()
        this.hojasVivas.delete(j)
        continue
      }
      h.set(j < this.v ? -180 : 0)
      h.root.style.zIndex = String(j >= this.v ? this.hojas - j : j + 1)
      h.root.style.visibility = !this.o.pliego && j < this.v - 1 ? 'hidden' : 'visible'
    }
    this.sombra.style.zIndex = '0'
  }

  protected empezar(dir: 1 | -1) {
    const h = this.hojasVivas.get(dir > 0 ? this.v : this.v - 1)
    if (!h) return false
    h.root.style.zIndex = String(this.hojas + 2)
    h.root.style.visibility = 'visible'
    this.sombra.style.zIndex = String(this.hojas + 1)
    this.moviendo = h
    return true
  }
  protected ajustar(p: number) {
    const dir = this.vuelta!.dir
    const a = dir > 0 ? -180 * p : -180 * (1 - p)
    this.moviendo?.set(a)
    this.sombra.style.opacity = String(0.55 * Math.sin((Math.PI * Math.abs(a)) / 180))
  }
  protected terminar() {
    this.moviendo = null
    this.sombra.style.opacity = '0'
    this.acomodar()
  }
  protected redimensionar() {
    this.hojasVivas.forEach((h) => h.root.remove())
    this.hojasVivas.clear()
    this.libro.remove()
    this.montar()
  }
  protected rectLibro() {
    return this.libro.getBoundingClientRect()
  }
  destruir() {
    this.vivo = false
    this.matarAnimacion()
    this.desmontarEntrada()
    this.libro.remove()
  }
}
