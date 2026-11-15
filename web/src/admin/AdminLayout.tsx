import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { BookOpen, Settings, Tags, User } from 'lucide-react'
import { MenuInferior, type ItemMenu } from '../components/shell/MenuInferior'

const items: ItemMenu[] = [
  { to: '/admin', texto: 'Catálogos', icono: BookOpen, exacto: true, tambien: '/admin/catalogos' },
  { to: '/admin/categorias', texto: 'Categorías', icono: Tags },
  { to: '/admin/ajustes', texto: 'Ajustes', icono: Settings },
  { to: '/admin/perfil', texto: 'Perfil', icono: User },
]

// Armazón del admin (patrón de Comandas): la ventana no se desplaza; cada pantalla trae su
// encabezado y su contenido desplazable, y el menú inferior queda fijo abajo.
export function AdminLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <Outlet />
      <MenuInferior items={items} />
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}
