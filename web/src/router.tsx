import { createBrowserRouter, redirect } from 'react-router'
import { isAdmin } from './lib/pb'
import { HomePage } from './public/HomePage'
import { CatalogPage } from './public/CatalogPage'

// El catálogo público va en el bundle principal; el admin se carga aparte (lazy), así el
// cliente final que abre el catálogo en un teléfono modesto no descarga el panel.
const requireAdmin = () => (isAdmin() ? null : redirect('/admin/login'))

export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  { path: '/c/:slug', Component: CatalogPage },
  {
    path: '/admin/login',
    loader: () => (isAdmin() ? redirect('/admin') : null),
    lazy: async () => ({ Component: (await import('./admin/LoginPage')).LoginPage }),
  },
  {
    path: '/admin',
    loader: requireAdmin,
    lazy: async () => ({ Component: (await import('./admin/AdminLayout')).AdminLayout }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import('./admin/CatalogsPage')).CatalogsPage }) },
      { path: 'categorias', lazy: async () => ({ Component: (await import('./admin/CategoriesPage')).CategoriesPage }) },
      { path: 'ajustes', lazy: async () => ({ Component: (await import('./admin/SettingsPage')).SettingsPage }) },
      { path: 'perfil', lazy: async () => ({ Component: (await import('./admin/ProfilePage')).ProfilePage }) },
    ],
  },
])
