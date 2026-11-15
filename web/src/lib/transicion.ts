// Dirección de la transición entre pantallas, por profundidad de la ruta (patrón de Comandas):
// más adentro → 'adelante', de regreso → 'atras', mismo nivel (pestañas) → 'cambio'.
// React Router envuelve la navegación en document.startViewTransition (viewTransition: true);
// aquí sólo se marca la dirección en <html> para que el CSS elija la animación.
const profundidad = (p: string) => p.split('/').filter(Boolean).length

export function marcarDireccion(desde: string, hacia: string) {
  if (!('startViewTransition' in document) || desde === hacia) return
  const d = profundidad(hacia) - profundidad(desde)
  const html = document.documentElement
  html.dataset.transicion = d > 0 ? 'adelante' : d < 0 ? 'atras' : 'cambio'
  window.setTimeout(() => delete html.dataset.transicion, 400)
}
