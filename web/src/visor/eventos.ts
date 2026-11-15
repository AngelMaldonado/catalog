// Contadores (hilo «Visor público»): una vista por dispositivo y día (el servidor la deduplica)
// y cada clic a WhatsApp. Sin cookies ni datos personales: un id aleatorio en localStorage.
function dispositivo(): string {
  try {
    let id = localStorage.getItem('catalogo-dispositivo')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('catalogo-dispositivo', id)
    }
    return id
  } catch {
    return ''
  }
}

export function registrar(evento: { kind: 'view' | 'click'; slug?: string; product?: string; color?: string; size?: string }) {
  const body = JSON.stringify({ ...evento, slug: evento.slug ?? '', device: dispositivo() })
  const blob = new Blob([body], { type: 'application/json' })
  if (!navigator.sendBeacon?.('/api/visor/evento', blob)) fetch('/api/visor/evento', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {})
}
