import PocketBase from 'pocketbase'

// Same origin everywhere: Vite proxies /api in development, PocketBase serves the SPA in production.
export const pb = new PocketBase(window.location.origin)
pb.autoCancellation(false)

/** A business account (collection `users`) is signed in. */
export const isAdmin = () => pb.authStore.isValid && pb.authStore.record?.collectionName === 'users'
