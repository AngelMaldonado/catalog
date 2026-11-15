import { useState } from 'react'
import { useNavigate } from 'react-router'
import { LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { pb } from '../lib/pb'
import { cn, iniciales } from '../lib/utils'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

type Tema = 'sistema' | 'claro' | 'oscuro'
declare global {
  interface Window {
    aplicarTema?: (t: Tema) => void
  }
}
const temas: { valor: Tema; texto: string; icono: typeof Sun }[] = [
  { valor: 'sistema', texto: 'Sistema', icono: Monitor },
  { valor: 'claro', texto: 'Claro', icono: Sun },
  { valor: 'oscuro', texto: 'Oscuro', icono: Moon },
]
const temaGuardado = (): Tema => {
  try {
    return (localStorage.getItem('tema') as Tema) || 'sistema'
  } catch {
    return 'sistema'
  }
}

export function ProfilePage() {
  const navigate = useNavigate()
  const usuario = pb.authStore.record
  const [tema, setTema] = useState<Tema>(temaGuardado)
  const elegir = (t: Tema) => {
    setTema(t)
    window.aplicarTema?.(t)
  }
  const salir = () => {
    pb.authStore.clear()
    navigate('/admin/login', { replace: true })
  }
  return (
    <Pantalla encabezado={<Encabezado marca titulo="Perfil" />}>
      <div className="mx-auto w-full max-w-3xl space-y-4 p-3">
        <Card className="flex-row items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
            {iniciales(usuario?.name || usuario?.email || '')}
          </span>
          <div className="min-w-0">
            {usuario?.name && <p className="text-lg font-semibold">{usuario.name}</p>}
            <p className="truncate text-muted-foreground">{usuario?.email}</p>
          </div>
        </Card>
        <Card>
          <p className="font-semibold">Apariencia en este dispositivo</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
            {temas.map((t) => (
              <button
                key={t.valor}
                type="button"
                role="radio"
                aria-checked={tema === t.valor}
                onClick={() => elegir(t.valor)}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-medium',
                  tema === t.valor ? 'border-acento bg-acento-tinte text-acento-texto' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <t.icono className="size-5" />
                {t.texto}
              </button>
            ))}
          </div>
        </Card>
        <Button variant="destructive" className="w-full" onClick={salir}>
          <LogOut /> Salir
        </Button>
      </div>
    </Pantalla>
  )
}
