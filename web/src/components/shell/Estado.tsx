import { cn } from '../../lib/utils'

// Estados con un solo lenguaje visual (patrón de Comandas).
export type TonoEstado = 'exito' | 'aviso' | 'peligro' | 'neutro' | 'info'
const tonos: Record<TonoEstado, string> = {
  exito: 'bg-exito text-exito-foreground',
  aviso: 'bg-aviso text-aviso-foreground',
  peligro: 'bg-destructive/10 text-destructive',
  neutro: 'bg-muted text-muted-foreground',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
}

export function Estado({ tono, texto, className }: { tono: TonoEstado; texto: string; className?: string }) {
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', tonos[tono], className)}>{texto}</span>
}
