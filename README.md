# Catálogo

Catálogo de temporada para negocios chicos de ropa estampada:

- un catálogo por temporada (Navidad, Día de Muertos…);
- mockups generados al arrastrar los diseños;
- un visor móvil donde las páginas se pasan como en una revista;
- pedidos por WhatsApp.

Una instalación por negocio: PocketBase (SQLite) sirve la SPA. La planeación y las decisiones viven en Bubble, en el proyecto `catalogo`.

## Desarrollo

Requisitos: `just`, `pnpm`, `tmux`.

```sh
just setup                                  # PocketBase en .bin/ + dependencias de web/
just dev                                    # PocketBase :8097 y Vite :5177 en tmux «ayetec-catalog»
just pb superuser admin@local.test 1234567890   # operador (dashboard /_/)
just pb user dueno@local.test 1234567890        # cuenta del negocio (/admin)
```

- Panel del negocio: http://localhost:5177/admin
- Dashboard de PocketBase (sólo operador): http://localhost:8097/_/

## Producción

Una VPS con Docker y Caddy en `octopusslp.online` (provisión en [`infra/`](infra/README.md)).

```sh
just infra provision           # una vez: usuario, SSH, UFW, Fail2ban, Docker y /opt/catalog
just release next              # qué versión saldría (Conventional Commits desde el último tag)
just release tag               # crea y empuja vX.Y.Z de main → GitHub Actions publica la imagen
just release deploy vX.Y.Z     # el servidor corre esa imagen
just release verify <sha>      # espera a que https://octopusslp.online sirva ese commit
just prod logs                 # logs del stack, en la sesión tmux ayetec-catalog-prod
```

La imagen (`ghcr.io/angelmaldonado/catalog`, pública) sirve todo en el puerto 8090, guarda los datos en el volumen `/pb/pb_data` y responde `/api/meta` (versión y commit) y `/api/health`. `just docker build` la construye localmente en reko-3 para probarla.

El primer superusuario: `just prod logs` muestra el enlace `…/_/#/pbinstall/<token>` que PocketBase imprime mientras no hay ninguno; ábrelo cambiando el host por `https://octopusslp.online`.
