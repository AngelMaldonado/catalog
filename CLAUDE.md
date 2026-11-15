# Catálogo

Catálogo de temporada «de bolsillo» para negocios chicos de ropa estampada: el negocio arrastra sus diseños, la app genera los mockups, y su cliente hojea el catálogo en el móvil y pide por WhatsApp. Una instalación (PocketBase + SPA) por negocio.

## Mapa

- `web/`: SPA (Vite + React + TypeScript + React Router + TanStack Query + Tailwind + GSAP).
  - `/admin` es el panel del negocio, con login contra la colección `users`.
  - `/` y `/c/:slug` son el visor público.
- `pb/pb_migrations/`: esquema y datos base como migraciones JS. Nunca edites una migración aplicada; agrega otra.
- `pb/pb_hooks/`: lógica de servidor en JS (URLs firmadas, contadores).
- `pb/seed/`: archivos que siembran las migraciones. Las prendas tienen foto base, máscara y sombreado; los temas, un fondo por tipo de página. Cada carpeta tiene su `PROVENANCE.md`.
- `pb/tools/`: pipelines de assets, con su propio `package.json`.
  - `garments.mjs`: máscara, sombreado y áreas de impresión.
  - `themes.mjs`: arte de los temas, con dos vías:
    - la API de OpenAI, opt-in con el token de quien despliega;
    - importar los PNG de Codex CLI, que es como se hizo el arte del seed.
- `docker/`: imagen de release (PocketBase oficial + `web` compilado en `pb_public`).
- `spikes/page-curl/`: spike medido de la vuelta de página (hoja rígida CSS 3D y página realista WebGL). Es la base del visor; se borra cuando el visor lo porte.

## Ceremonias (`just`)

- `just setup`: baja PocketBase (versión fijada en el `justfile`) a `.bin/` e instala las dependencias de `web/`.
- `just dev`: levanta PocketBase (`:8097`) y Vite (`:5177`, con proxy a la API) en la sesión tmux `ayetec-catalog`. `just stop` la cierra.
- `just test`, `just build`, `just docker build`.
- `just pb superuser <email> <pass>` y `just pb user <email> <pass>` crean cuentas en el PocketBase local.
- `just garments prepare` y `just themes generate [--dry-run | --import <dir> | --prompts-json <f>]` regeneran los assets del seed.

## Convenciones

- Interfaz y textos en español; moneda configurable, MXN por defecto.
- **Shell mobile first con el patrón de Comandas** (`~/dev/ayetec/comandas/web`):
  - La ventana nunca se desplaza. Cada pantalla es un `<Pantalla>` con `<Encabezado>` arriba, contenido desplazable y una barra opcional abajo; el admin agrega `<MenuInferior>`.
  - Las listas van en `<Grupo>` y `<Fila>`, y los formularios en `<Hoja>`: cajón vaul en el celular, diálogo Radix desde 640 px.
  - Usa los tokens oklch de `styles.css`: base monocromática, `acento` para lo seleccionado y `marca` para el negocio.
  - Fuentes: Inter para el texto y Bebas Neue (`font-titulo`, sin negritas) para los títulos.
  - Transiciones por profundidad de ruta (`lib/transicion.ts`).
  - El admin se carga aparte (`lazy`); el bundle público debe quedar ligero.
- PocketBase sin modificar, extendido con hooks JS. Go sólo si un hook lo exige.
- Las reglas de acceso viven en las migraciones. El público sólo lee lo publicado; escribir requiere un usuario de `users`; `designs` (los originales) nunca es público.
- Las páginas del visor se pintan en canvas con un solo pintor (`paintPage`); la vuelta es `page_turn` = `rigid` | `realistic` por catálogo, la elige el admin.
- Docker siempre con `--context` explícito; las imágenes se construyen en `reko-3`.

## Bubble Work

Versión de esta sección: `bubble-work connect 7d913dee76e1df50`.

El trabajo de este proyecto se planea y se anota en Bubble Work, por MCP. El proyecto es `catalogo`.

**Al empezar cada sesión, antes de cualquier otra cosa:** si la forma de trabajar del departamento no está ya en tu contexto, llama a `agents_md` y síguela. Es la guía de Bubble Work y la forma de trabajar del departamento; se lee en vivo y manda sobre lo que recuerdes y sobre esta sección.

**Antes de crear, busca.** Lo normal es que ya exista un hilo a medias para lo que te piden: trabaja en ese. Lo que encuentres, decidas o dejes a medias va en el documento de SU hilo.
