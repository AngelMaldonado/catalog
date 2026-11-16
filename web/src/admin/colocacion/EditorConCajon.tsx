import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Pencil } from 'lucide-react'
import { Drawer } from 'vaul'
import { Pantalla } from '../../components/shell/Pantalla'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import { useEscritorio } from '../../lib/useMediaQuery'

// cajón de ajustes en el celular: cerrado del todo, a media altura (se ve el diseño arriba y
// los controles de colocación abajo) o abierto casi completo
const MEDIO = 0.55
const ABIERTO = 0.9

/** Pantalla de edición con vista previa y ajustes (editor de producto, ajuste en lote, portada).
 *  Escritorio: dos columnas (la vista fija, los controles se desplazan) y Guardar abajo. Celular: la vista ocupa la pantalla; Editar y
 *  Guardar van en la barra de abajo; los ajustes viven en un cajón que se abre con «Editar» o
 *  arrastrando la barra hacia arriba, y que al cerrarse desaparece del todo. */
export function EditorConCajon({ encabezado, vista, controles, guardar, debajo }: {
  encabezado: ReactNode
  vista: ReactNode
  controles: ReactNode
  guardar: ReactNode
  /** bajo la vista previa (p. ej. navegar entre productos del lote) */
  debajo?: ReactNode
}) {
  const escritorio = useEscritorio()
  const [contenedor, setContenedor] = useState<HTMLDivElement | null>(null)
  const [cajon, setCajon] = useState(false)
  const [anclaje, setAnclaje] = useState<number | string | null>(MEDIO)
  const teclado = useTeclado()
  const abrirCajon = () => {
    setAnclaje(MEDIO)
    setCajon(true)
  }

  if (escritorio)
    return (
      <Pantalla encabezado={encabezado} abajo={guardar}>
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 items-start gap-4 p-3">
          {/* la vista queda fija mientras se desplazan los controles */}
          <div className="sticky top-3 space-y-3">
            {vista}
            {debajo}
          </div>
          {controles}
        </div>
      </Pantalla>
    )

  // El encabezado queda fuera del contenedor del cajón: así el cajón nunca lo tapa (con el teclado
  // abierto el contenedor es chico). overflow-clip, no hidden: un contenedor hidden lo puede
  // desplazar el navegador al enfocar un campo.
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="vt-encabezado shrink-0">{encabezado}</div>
      <div ref={setContenedor} className="relative flex min-h-0 flex-1 flex-col overflow-clip">
        <Pantalla>
          <div className="space-y-3 p-3">
            {vista}
            {debajo}
          </div>
        </Pantalla>
        <BarraArrastrable onArriba={abrirCajon}>
          <Button variant="outline" size="lg" className="shrink-0" onClick={abrirCajon}>
            <Pencil /> Editar
          </Button>
          <div className="min-w-0 flex-1">{guardar}</div>
        </BarraArrastrable>
        {contenedor && (
          // repositionInputs apagado: con anclajes, vaul suma el anclaje al alto del teclado y empuja
          // el cajón de más. El teclado encoge la ventana (interactive-widget=resizes-content en
          // index.html) y con ella el contenedor; al enfocar un campo el cajón sube al 90 %.
          <Drawer.Root open={cajon} onOpenChange={setCajon} modal={false} noBodyStyles repositionInputs={false} container={contenedor}
            snapPoints={[MEDIO, ABIERTO]} fadeFromIndex={1} activeSnapPoint={anclaje} setActiveSnapPoint={setAnclaje}>
            <Drawer.Portal>
              <Drawer.Content aria-describedby={undefined}
                onFocus={(e) => {
                  if (e.target.matches('input:not([type=range]), select, textarea')) setAnclaje(ABIERTO)
                }}
                className="absolute inset-x-0 bottom-0 z-30 flex h-full flex-col rounded-t-4xl border-t bg-background shadow-[0_-8px_24px_rgb(0_0_0/0.08)] outline-none">
                <Drawer.Title className="sr-only">Ajustes</Drawer.Title>
                {/* vaul mide los anclajes con el contenido a alto completo: abierto, el último 10 % queda
                    bajo el borde. El contenido mide el 90 % para que su scroll termine en el borde visible
                    (si no, el navegador deja el campo enfocado escondido ahí). */}
                <div className="flex min-h-0 flex-col" style={{ height: `${ABIERTO * 100}%` }}>
                  <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" aria-hidden />
                  <div className="flex shrink-0 gap-2 px-3 pt-3 pb-3">
                    <Button variant="outline" size="lg" className="shrink-0" onClick={() => setCajon(false)}>
                      <ChevronDown /> Cerrar
                    </Button>
                    <div className="min-w-0 flex-1">{guardar}</div>
                  </div>
                  <div className={cn('min-h-0 flex-1 px-3', anclaje === ABIERTO ? 'overflow-y-auto' : 'overflow-hidden')}
                    style={{ paddingBottom: `calc(1.5rem + ${teclado}px)` }}>
                    {controles}
                  </div>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        )}
      </div>
    </div>
  )
}

/** Alto del teclado cuando se SUPERPONE a la ventana (Safari en iOS no soporta
 *  interactive-widget). En Chrome con resizes-content la ventana se encoge y esto da 0. */
function useTeclado() {
  const [alto, setAlto] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const medir = () => setAlto(Math.max(0, Math.round(innerHeight - vv.height)))
    vv.addEventListener('resize', medir)
    return () => vv.removeEventListener('resize', medir)
  }, [])
  return alto
}

/** Barra inferior con manija: arrastrarla hacia arriba llama a `onArriba`. */
function BarraArrastrable({ onArriba, children }: { onArriba: () => void; children: ReactNode }) {
  const inicio = useRef<number | null>(null)
  return (
    <div
      className="shrink-0 touch-none border-t bg-background px-3 pb-3"
      onPointerDown={(e) => (inicio.current = e.clientY)}
      onPointerMove={(e) => {
        if (inicio.current !== null && inicio.current - e.clientY > 24) {
          inicio.current = null
          onArriba()
        }
      }}
      onPointerUp={() => (inicio.current = null)}
      onPointerCancel={() => (inicio.current = null)}
    >
      <div className="mx-auto mt-2 mb-2 h-1.5 w-12 rounded-full bg-muted" aria-hidden />
      <div className="mx-auto flex max-w-3xl gap-2">{children}</div>
    </div>
  )
}
