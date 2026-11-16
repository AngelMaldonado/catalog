// La versión no se elige: sale de los Conventional Commits desde el último tag vX.Y.Z.
// feat sube el minor, fix el patch, «!» o un pie «BREAKING CHANGE:» el major (en 0.x,
// el minor). Mismas reglas que scripts/release de ~/dev/ayetec/comandas, sin candidatos
// -rc: aquí hay un solo entorno (producción).
//
//   node scripts/release/version.mjs            imprime la siguiente versión (sin «v»)
//   node scripts/release/version.mjs --initial 0.1.0
//
// Sale con código 3 y NADA_QUE_PUBLICAR si desde el último tag sólo hay ci/chore/docs…
import { execFileSync } from 'node:child_process'

export const NADA_QUE_PUBLICAR = 'No hay un Conventional Commit publicable después de'

const reEstable = /^v(\d+)\.(\d+)\.(\d+)$/
const reConvencional = /^([a-z]+)(?:\([^)]+\))?(!)?:/
const reRompe = /(?:^|\n)BREAKING(?: |-)CHANGE:\s*\S/

export function parseEstable(tag) {
  const m = reEstable.exec(tag)
  return m ? m.slice(1, 4).map(Number) : null
}

const menor = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

/** El vX.Y.Z más alto entre los tags; null si no hay. */
export function ultimoEstable(tags) {
  let mejor = null
  for (const t of tags) {
    const v = parseEstable(t)
    if (v && (!mejor || menor(parseEstable(mejor), v) < 0)) mejor = t
  }
  return mejor
}

/** 'major' | 'minor' | 'patch' | null, según los mensajes completos de los commits. */
export function nivelDe(mensajes) {
  let nivel = null
  for (const msg of mensajes) {
    const asunto = msg.split('\n', 1)[0].trim()
    const m = reConvencional.exec(asunto)
    if ((m && m[2] === '!') || reRompe.test(msg)) return 'major'
    if (!m) continue
    if (m[1] === 'feat') nivel = 'minor'
    else if (m[1] === 'fix' && !nivel) nivel = 'patch'
  }
  return nivel
}

export function siguiente(tagEstable, mensajes, inicial = '0.1.0') {
  if (!tagEstable) {
    if (!parseEstable(`v${inicial}`)) throw new Error(`versión inicial inválida: ${inicial}`)
    return inicial
  }
  const v = parseEstable(tagEstable)
  if (!v) throw new Error(`tag estable inválido: ${tagEstable}`)
  const [ma, mi, pa] = v
  switch (nivelDe(mensajes)) {
    case null:
      throw new Error(`${NADA_QUE_PUBLICAR} ${tagEstable}`)
    case 'major':
      if (ma > 0) return `${ma + 1}.0.0`
    // en 0.x un cambio que rompe sube el minor
    // falls through
    case 'minor':
      return `${ma}.${mi + 1}.0`
    default:
      return `${ma}.${mi}.${pa + 1}`
  }
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--initial')
  const inicial = i > 0 ? process.argv[i + 1] : '0.1.0'
  const tag = ultimoEstable(git('tag', '--merged', 'HEAD', '--list', 'v*').split('\n').filter(Boolean))
  const rango = tag ? `${tag}..HEAD` : 'HEAD'
  const mensajes = git('log', '--format=%B%x00', rango).split('\0').map((s) => s.trim()).filter(Boolean)
  try {
    console.log(siguiente(tag, mensajes, inicial))
  } catch (e) {
    console.error(`error: ${e.message}`)
    process.exit(e.message.startsWith(NADA_QUE_PUBLICAR) ? 3 : 1)
  }
}
