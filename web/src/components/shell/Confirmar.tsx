import { useSyncExternalStore } from 'react'
import { Hoja } from './Hoja'
import { Button } from '../ui/button'

// Confirmación con el patrón del shell (hoja: cajón en el celular, diálogo en escritorio),
// en lugar del confirm() nativo del navegador. Uso: if (await confirmar({...})) …
type Pedido = { titulo: string; texto?: string; accion: string; peligro?: boolean; responder: (si: boolean) => void }

let actual: Pedido | null = null
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((o) => o())

export function confirmar(p: Omit<Pedido, 'responder'>): Promise<boolean> {
  actual?.responder(false)
  return new Promise((ok) => {
    actual = { ...p, responder: ok }
    avisar()
  })
}

function responder(si: boolean) {
  const p = actual
  actual = null
  avisar()
  p?.responder(si)
}

/** Se monta una vez en el layout del admin. */
export function Confirmaciones() {
  const p = useSyncExternalStore(
    (cb) => {
      oyentes.add(cb)
      return () => oyentes.delete(cb)
    },
    () => actual,
  )
  return (
    <Hoja
      abierta={!!p}
      onClose={() => responder(false)}
      titulo={p?.titulo ?? ''}
      descripcion={p?.texto}
      pie={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => responder(false)}>
            Cancelar
          </Button>
          <Button variant={p?.peligro ? 'destructive' : 'default'} onClick={() => responder(true)}>
            {p?.accion}
          </Button>
        </div>
      }
    >
      <span />
    </Hoja>
  )
}
