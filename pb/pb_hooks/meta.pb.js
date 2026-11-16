/// <reference path="../pb_data/types.d.ts" />
// The service says what it is (same contract as ~/dev/ayetec/infra SERVICE_CONVENTION §7):
//   GET /api/meta    {environment, version, buildHash, deployedAt}
//   GET /api/health  {status: "ok", message: "healthy"} when the database answers
// version and buildHash come from build.json, written into the image at build time
// (docker/Dockerfile), never from service variables: /api/meta cannot lie.

// Each handler runs isolated (no shared top-level variables): the start time goes in the
// app store at bootstrap, which is when this container started serving.
onBootstrap((e) => {
  e.next()
  e.app.store().set('catalog.deployedAt', new Date().toISOString())
})

routerAdd('GET', '/api/meta', (e) => {
  let build = { version: 'dev', buildHash: 'dev' }
  try {
    build = JSON.parse(toString($os.readFile(`${__hooks}/../build.json`)))
  } catch (_) {}
  const env = $os.getenv('APP_ENV')
  return e.json(200, {
    environment: env === 'staging' || env === 'production' ? env : 'development',
    version: build.version,
    buildHash: build.buildHash,
    deployedAt: e.app.store().get('catalog.deployedAt') || '',
  })
})

// PocketBase already has /api/health ("API is healthy."); answer it first, in the
// contract's shape, after actually querying the database.
routerUse((e) => {
  if (e.request.method !== 'GET' || e.request.url.path !== '/api/health') return e.next()
  try {
    e.app.db().newQuery('SELECT 1').execute()
  } catch (_) {
    return e.json(503, { status: 'error', message: 'database unavailable' })
  }
  return e.json(200, { status: 'ok', message: 'healthy' })
})
