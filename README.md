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

## Release

```sh
just docker build      # imagen catalog:<version>, construida en reko-3
```

La imagen sirve todo en el puerto 8090 y guarda los datos en el volumen `/pb/pb_data`.
