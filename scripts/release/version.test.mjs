import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nivelDe, siguiente, ultimoEstable, NADA_QUE_PUBLICAR } from './version.mjs'

test('sin tags: la versión inicial', () => {
  assert.equal(siguiente(null, ['feat: algo']), '0.1.0')
  assert.equal(siguiente(null, [], '1.0.0'), '1.0.0')
})

test('feat sube el minor, fix el patch', () => {
  assert.equal(siguiente('v0.1.0', ['fix: a']), '0.1.1')
  assert.equal(siguiente('v0.1.3', ['fix: a', 'feat(ui): b']), '0.2.0')
})

test('un cambio que rompe: major, salvo en 0.x (minor)', () => {
  assert.equal(siguiente('v1.4.2', ['feat!: quitar ruta']), '2.0.0')
  assert.equal(siguiente('v0.4.2', ['refactor: x\n\nBREAKING CHANGE: cambia la API']), '0.5.0')
})

test('sólo ci/chore/docs: nada que publicar', () => {
  assert.throws(() => siguiente('v0.1.0', ['chore: x', 'docs: y']), new RegExp(NADA_QUE_PUBLICAR))
})

test('el último estable ignora candidatos y basura', () => {
  assert.equal(ultimoEstable(['v0.2.0', 'v0.10.0', 'v0.3.0-rc.1', 'foo']), 'v0.10.0')
  assert.equal(ultimoEstable([]), null)
})

test('nivelDe ignora asuntos que no son convencionales', () => {
  assert.equal(nivelDe(['Merge branch x', 'wip']), null)
})
