import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('quita acentos y espacios', () => {
    expect(slugify('Día de Muertos 2026')).toBe('dia-de-muertos-2026')
  })
  it('colapsa símbolos y recorta guiones', () => {
    expect(slugify('  ¡Navidad & Año Nuevo!  ')).toBe('navidad-ano-nuevo')
  })
  it('respeta el máximo de 60 caracteres', () => {
    expect(slugify('a'.repeat(80))).toHaveLength(60)
  })
})
