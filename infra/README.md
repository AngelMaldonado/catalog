# Infraestructura del catálogo

Una VPS Ubuntu 24.04 (o más nueva) que corre el catálogo en Docker, detrás de Caddy, en
`octopusslp.online`. Ansible con la misma forma que `~/dev/ayetec/taxi/infra`: primer
contacto (`bootstrap`), convergencia (`platform`) y comprobación (`verify`).

```text
Internet ── 80/443 ──▶ caddy (HTTPS automático) ──▶ catalog:8090 (PocketBase + SPA)
                        /opt/catalog/compose.yaml  ← docker/compose.production.yaml
```

Lo que deja la provisión:

- Usuario `angel` con sudo y la llave que ya tenía `root`; SSH sin contraseña y sin root
  (el drop-in es `00-catalog-hardening.conf`: sshd se queda con el PRIMER valor que lee, y
  como `99-*` perdía contra `50-cloud-init.conf`).
- UFW: sólo SSH, 80 y 443. Fail2ban en SSH. Actualizaciones de seguridad automáticas.
- Docker Engine + Compose desde el repositorio oficial, con logs limitados (10m × 3).
- `/opt/catalog` con el compose, la configuración de Caddy y `.env` (`CATALOG_DOMAIN` lo
  escribe Ansible; `CATALOG_TAG`, `just release deploy`). Nada más publica puertos: Docker se
  salta UFW con los puertos publicados.

## Provisionar

1. En DigitalOcean (Networking → Domains), registro **A** de `octopusslp.online` a la IP de la
   VPS. Los nameservers del dominio ya son los de DigitalOcean.
2. La IP en `ansible/inventories/production/hosts.yml` (`ansible_host`).
3. Desde la raíz del repo:

```bash
just infra provision            # bootstrap como root + platform + verify
```

Después, `just infra platform` vuelve a converger (idempotente) y `just infra platform diff`
muestra qué cambiaría sin tocar nada. `just infra check` valida inventario, sintaxis y lint.

## Probar sin tocar la VPS

`just infra sandbox up|provision|status|destroy` levanta un Ubuntu 24.04 desechable en reko-3
(Docker dentro) y le corre los mismos playbooks.

## Pendiente

- Respaldos de `pb_data` (volumen `catalog_catalog-data`): backups del Droplet o los respaldos
  programados de PocketBase a S3/Spaces. Hasta decidirlo, el servicio no está terminado.
