// Frame meter: records rAF timestamps during a page turn (press → animation settled),
// then POSTs one summary line to /__metrics. Also draws a small live HUD.

export function createMeter(config) {
  const hud = document.getElementById('hud')
  let rec = null
  let last = performance.now()
  let live = []
  const t0 = performance.now()
  let readyMs = null
  let turns = 0

  function tick(now) {
    const dt = now - last
    last = now
    live.push(dt)
    if (live.length > 30) live.shift()
    if (rec) rec.frames.push(dt)
    if (now - (tick.hudAt || 0) > 500) {
      tick.hudAt = now
      const avg = live.reduce((a, b) => a + b, 0) / live.length
      hud.textContent = `${config.variant} ${config.mode} ${config.paint}\n${(1000 / avg).toFixed(0)} fps · vueltas ${turns}${readyMs != null ? ` · listo ${readyMs.toFixed(0)} ms` : ''}`
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  return {
    ready() {
      readyMs = performance.now() - t0
      send({ type: 'ready', ms: Math.round(readyMs) })
    },
    begin(kind) {
      if (rec) return
      rec = { kind, start: performance.now(), frames: [] }
    },
    end() {
      if (!rec) return
      const r = rec
      rec = null
      turns++
      const f = r.frames.slice(1) // first delta spans the press
      if (f.length < 5) return
      const dur = f.reduce((a, b) => a + b, 0)
      const sorted = [...f].sort((a, b) => a - b)
      const p95 = sorted[Math.floor(sorted.length * 0.95)]
      const jank = f.filter((d) => d > 20).length / f.length
      send({
        type: 'turn',
        kind: r.kind,
        frames: f.length,
        ms: Math.round(dur),
        fps: +(f.length / (dur / 1000)).toFixed(1),
        p95ms: +p95.toFixed(1),
        worstMs: +sorted[sorted.length - 1].toFixed(1),
        jankPct: +(jank * 100).toFixed(1),
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      })
    },
  }

  function send(data) {
    const line = JSON.stringify({ ...config, ...data, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, at: new Date().toISOString() })
    fetch('/__metrics', { method: 'POST', body: line, keepalive: true }).catch(() => {})
  }
}
