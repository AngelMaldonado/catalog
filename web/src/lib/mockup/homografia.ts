// Homografía (transformación proyectiva) entre el cuadrado unitario y un cuadrilátero:
// lleva el diseño, dibujado en el "espacio del área" (u, v ∈ [0, 1]), al área de impresión de
// la foto, que puede ser un trapecio (la gorra). Se usa al revés: por cada píxel de salida se
// pregunta de qué (u, v) viene.

export type Punto = [number, number]
/** Esquinas en orden: arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda. */
export type Cuad = [Punto, Punto, Punto, Punto]
export type Matriz = [number, number, number, number, number, number, number, number, number]

/** Homografía que lleva (0,0),(1,0),(1,1),(0,1) a las cuatro esquinas de `q`. */
export function homografiaDesdeUnitario(q: Cuad): Matriz {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const sx = x0 - x1 + x2 - x3
  const sy = y0 - y1 + y2 - y3
  let g = 0
  let h = 0
  if (Math.abs(sx) > 1e-12 || Math.abs(sy) > 1e-12) {
    const det = dx1 * dy2 - dx2 * dy1
    g = (sx * dy2 - dx2 * sy) / det
    h = (dx1 * sy - sx * dy1) / det
  }
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1]
}

export function invertir(m: Matriz): Matriz {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h
  const B = -(d * i - f * g)
  const C = d * h - e * g
  const det = a * A + b * B + c * C
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det]
}

export function aplicar(m: Matriz, x: number, y: number): Punto {
  const w = m[6] * x + m[7] * y + m[8]
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w]
}
