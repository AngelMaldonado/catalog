// Fuentes del título del catálogo (portada, separadores, imagen para redes). Las «alocadas» se
// cargan bajo demanda (import dinámico: cada una es su propio CSS + woff2), así el visor sólo
// baja la que eligió el catálogo y el bundle público no crece.

export interface Fuente {
  id: string
  nombre: string
  /** familia CSS (con comillas si lleva espacios) */
  familia: string
  cargar: () => Promise<unknown>
}

export const FUENTES: Fuente[] = [
  { id: 'bungee', nombre: 'Bungee', familia: "'Bungee'", cargar: () => import('@fontsource/bungee') },
  { id: 'bangers', nombre: 'Bangers', familia: "'Bangers'", cargar: () => import('@fontsource/bangers') },
  { id: 'monoton', nombre: 'Monoton', familia: "'Monoton'", cargar: () => import('@fontsource/monoton') },
  { id: 'pacifico', nombre: 'Pacifico', familia: "'Pacifico'", cargar: () => import('@fontsource/pacifico') },
  { id: 'lobster', nombre: 'Lobster', familia: "'Lobster'", cargar: () => import('@fontsource/lobster') },
  { id: 'shrikhand', nombre: 'Shrikhand', familia: "'Shrikhand'", cargar: () => import('@fontsource/shrikhand') },
  { id: 'abril', nombre: 'Abril Fatface', familia: "'Abril Fatface'", cargar: () => import('@fontsource/abril-fatface') },
  { id: 'creepster', nombre: 'Creepster', familia: "'Creepster'", cargar: () => import('@fontsource/creepster') },
  { id: 'navidad', nombre: 'Mountains of Christmas', familia: "'Mountains of Christmas'", cargar: () => import('@fontsource/mountains-of-christmas') },
  { id: 'pixel', nombre: 'Press Start 2P', familia: "'Press Start 2P'", cargar: () => import('@fontsource/press-start-2p') },
]

const listas = new Map<string, Promise<string | undefined>>()

/** Carga la fuente (una vez) y espera a que el navegador la tenga para el canvas. Devuelve su
 *  familia CSS, o undefined si no existe o no cargó (entonces se usa la del tema). */
export function cargarFuente(id: string | undefined): Promise<string | undefined> {
  const f = FUENTES.find((x) => x.id === id)
  if (!f) return Promise.resolve(undefined)
  if (!listas.has(f.id))
    listas.set(
      f.id,
      f
        .cargar()
        .then(() => document.fonts.load(`400 48px ${f.familia}`))
        .then(() => f.familia)
        .catch(() => undefined),
    )
  return listas.get(f.id)!
}
