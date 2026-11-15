// Motor «deslizar»: respaldo para prefers-reduced-motion (o equipos que no dan los fps).
// Las vistas anterior, actual y siguiente van en fila; arrastrar las desplaza.
import { MotorBase, type OpcionesMotor, type Vista } from './base'

export class MotorDeslizar extends MotorBase {
  private marco!: HTMLDivElement
  private fila!: HTMLDivElement
  private vivo = true

  constructor(o: OpcionesMotor) {
    super(o)
    this.montar()
    this.avisarVista()
  }

  private get ancho() {
    return this.o.pliego ? this.pageW * 2 : this.pageW
  }

  private montar() {
    this.marco = document.createElement('div')
    this.marco.style.cssText = `position:relative;width:${this.ancho}px;height:${this.pageH}px;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none`
    this.fila = document.createElement('div')
    this.fila.style.cssText = `position:absolute;inset:0;will-change:transform`
    this.marco.append(this.fila)
    this.o.contenedor.append(this.marco)
    this.poblar()
  }

  private vistaEl(v: Vista, x: number) {
    const el = document.createElement('div')
    el.style.cssText = `position:absolute;top:0;left:${x}px;width:${this.ancho}px;height:100%;display:flex`
    for (const i of this.o.pliego ? [v.izq, v.der] : [v.der]) {
      const c = document.createElement('canvas')
      c.width = this.texW
      c.height = this.texH
      c.style.cssText = `width:${this.pageW}px;height:100%;display:block;${i === null ? 'visibility:hidden' : ''}`
      if (i !== null) {
        const ctx = c.getContext('2d')!
        ctx.fillStyle = this.o.fuente.color
        ctx.fillRect(0, 0, c.width, c.height)
        this.o.fuente.lienzo(i, this.texW, this.texH).then((src) => this.vivo && ctx.drawImage(src, 0, 0))
      }
      el.append(c)
    }
    return el
  }

  private poblar() {
    this.fila.replaceChildren()
    this.fila.style.transform = 'translateX(0px)'
    for (const d of [-1, 0, 1]) {
      const v = this.v + d
      if (v < 0 || v > this.maxV) continue
      this.fila.append(this.vistaEl(this.vista(v), d * this.ancho))
    }
  }

  protected empezar() {
    return true
  }
  protected ajustar(p: number) {
    this.fila.style.transform = `translateX(${-this.vuelta!.dir * p * this.ancho}px)`
  }
  protected terminar() {
    this.poblar()
  }
  protected redimensionar() {
    this.marco.remove()
    this.montar()
  }
  protected rectLibro() {
    return this.marco.getBoundingClientRect()
  }
  destruir() {
    this.vivo = false
    this.matarAnimacion()
    this.desmontarEntrada()
    this.marco.remove()
  }
}
