/// <reference path="../../pb_data/types.d.ts" />
// Behind Caddy (docker/Caddyfile) every request arrives from the proxy's address, so the
// rate limits (1794768600) would be shared by every visitor. Caddy replaces X-Forwarded-For
// with the client's IP; trust that header. PocketBase is never published without the proxy.

migrate(
  (app) => {
    const s = app.settings()
    s.trustedProxy.headers = ['X-Forwarded-For']
    s.trustedProxy.useLeftmostIP = false
    app.save(s)
  },
  (app) => {
    const s = app.settings()
    s.trustedProxy.headers = []
    app.save(s)
  },
)
