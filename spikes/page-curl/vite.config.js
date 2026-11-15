import { defineConfig } from 'vite'
import { appendFileSync } from 'node:fs'

// The phone POSTs one JSON line per measured page turn to /__metrics.
// Lines land in metrics.jsonl so they can be summarised on the Mac.
const metrics = {
  name: 'spike-metrics',
  configureServer(server) {
    server.middlewares.use('/__metrics', (req, res) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        appendFileSync('metrics.jsonl', body.trim() + '\n')
        res.statusCode = 204
        res.end()
      })
    })
  },
}

export default defineConfig({
  plugins: [metrics],
  server: { port: 5173, strictPort: true },
})
