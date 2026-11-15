/// <reference path="../../pb_data/types.d.ts" />
// Rate limits for the public viewer API (thread «Visor público»), with PocketBase's own limiter.

const REGLAS = [
  { label: '/api/visor', audience: '', duration: 60, maxRequests: 120 },
  { label: 'POST /api/visor/evento', audience: '', duration: 60, maxRequests: 40 },
  { label: '/api/r/', audience: '', duration: 60, maxRequests: 900 },
]

migrate(
  (app) => {
    const s = app.settings()
    s.rateLimits.enabled = true
    const otras = s.rateLimits.rules.filter((r) => !REGLAS.some((x) => x.label === r.label))
    s.rateLimits.rules = [...otras, ...REGLAS]
    app.save(s)
  },
  (app) => {
    const s = app.settings()
    s.rateLimits.rules = s.rateLimits.rules.filter((r) => !REGLAS.some((x) => x.label === r.label))
    app.save(s)
  },
)
