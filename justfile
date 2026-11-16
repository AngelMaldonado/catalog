set shell := ["bash", "-euo", "pipefail", "-c"]

pb_version := "0.40.6"
pb_port := "8097"
web_port := "5177"
session := "ayetec-catalog"
docker_context := env("CATALOG_DOCKER_CONTEXT", "reko-3")
pb := ".bin/pocketbase --dir=pb_data --migrationsDir=pb/pb_migrations --hooksDir=pb/pb_hooks"

# Producción: una VPS (infra/), un dominio. El host SSH sale del inventario de Ansible
# (una sola fuente para la IP); CATALOG_PROD_SSH lo reemplaza si hace falta.
domain := "octopusslp.online"
image := "ghcr.io/angelmaldonado/catalog"
prod_ip := `grep -m1 'ansible_host:' infra/ansible/inventories/production/hosts.yml | awk '{print $2}'`
prod_ssh := env("CATALOG_PROD_SSH", "angel@" + prod_ip)
prod_session := "ayetec-catalog-prod"

default:
    @just --list

# PocketBase en .bin/ + dependencias de web/ + hook de commits
setup: hooks
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p .bin
    if [ ! -x .bin/pocketbase ] || ! .bin/pocketbase --version | grep -q "{{pb_version}}"; then
      os=$(uname -s | tr '[:upper:]' '[:lower:]'); arch=$(uname -m)
      case "$arch" in x86_64) arch=amd64;; aarch64|arm64) arch=arm64;; esac
      url="https://github.com/pocketbase/pocketbase/releases/download/v{{pb_version}}/pocketbase_{{pb_version}}_${os}_${arch}.zip"
      echo "→ $url"
      curl -fsSL "$url" -o .bin/pb.zip
      unzip -o -q .bin/pb.zip pocketbase -d .bin && rm .bin/pb.zip
    fi
    .bin/pocketbase --version
    pnpm -C web install
    pnpm -C pb/tools install

# hook commit-msg: Conventional Commits (de ellos sale la versión del release)
hooks:
    git config core.hooksPath .githooks

# PocketBase :{{pb_port}} y Vite :{{web_port}} en la sesión tmux ayetec-catalog
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    if tmux has-session -t {{session}} 2>/dev/null; then echo "ya corre: tmux attach -t {{session}}"; exit 0; fi
    tmux new-session -d -s {{session}} -n pb -c "$PWD"
    tmux send-keys -t {{session}}:pb "CATALOG_SEED_DIR=pb/seed {{pb}} serve --http=127.0.0.1:{{pb_port}}" Enter
    tmux new-window -t {{session}} -n web -c "$PWD/web"
    tmux send-keys -t {{session}}:web "CATALOG_PB_URL=http://127.0.0.1:{{pb_port}} pnpm dev --port {{web_port}}" Enter
    echo "PocketBase http://127.0.0.1:{{pb_port}}/_/  ·  web http://localhost:{{web_port}}/admin"
    if [ -t 1 ] && [ -z "${TMUX:-}" ]; then tmux attach -t {{session}}; else echo "tmux attach -t {{session}}"; fi

# cierra la sesión de desarrollo
stop:
    tmux kill-session -t {{session}} 2>/dev/null || true

test:
    pnpm -C web test
    node --test scripts/release/version.test.mjs

build:
    pnpm -C web build

# just pb superuser <email> <pass> · just pb user <email> <pass> · just pb migrate
pb action *args:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{action}}" in
      superuser) CATALOG_SEED_DIR=pb/seed {{pb}} superuser upsert {{args}} ;;
      user)      CATALOG_SEED_DIR=pb/seed {{pb}} user upsert {{args}} ;;
      migrate)   CATALOG_SEED_DIR=pb/seed {{pb}} migrate {{args}} ;;
      *) echo "uso: just pb superuser|user|migrate ..."; exit 1 ;;
    esac

# just garments prepare: máscaras, sombreado y vista previa de las prendas del seed
garments action:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{action}}" in
      prepare) node pb/tools/garments.mjs --preview ;;
      *) echo "uso: just garments prepare"; exit 1 ;;
    esac

# just themes generate [--dry-run] [--theme <slug>] [--page <page>] [--force]: arte con la API de OpenAI
themes action *args:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{action}}" in
      generate) node pb/tools/themes.mjs {{args}} ;;
      *) echo "uso: just themes generate [--dry-run] [--theme <slug>] [--page <page>] [--force]"; exit 1 ;;
    esac

# just docker build [tag] · just docker run [tag] · just docker stop
docker action tag="dev":
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{action}}" in
      build) docker --context {{docker_context}} build -f docker/Dockerfile --build-arg PB_VERSION={{pb_version}} -t catalog:{{tag}} . ;;
      run)   docker --context {{docker_context}} run -d --rm --name catalog-{{tag}} -p 18090:8090 catalog:{{tag}} ;;
      stop)  docker --context {{docker_context}} rm -f catalog-{{tag}} ;;
      *) echo "uso: just docker build|run|stop [tag]"; exit 1 ;;
    esac

# provisión de la VPS (infra/justfile): just infra provision · just infra platform · just infra check
infra *args:
    just --justfile infra/justfile --working-directory infra {{args}}

#   next          la versión que saldría (Conventional Commits desde el último tag)
#   tag           crea y empuja el tag vX.Y.Z de main: GitHub Actions publica la imagen
#   login         una vez: el servidor puede bajar la imagen privada de GHCR
#   deploy vX.Y.Z el servidor corre esa imagen
#   verify <sha>  espera a que https://{{domain}} sirva ese commit y esté sano
# just release next | tag | login | deploy vX.Y.Z | verify <sha>
release verb *args:
    #!/usr/bin/env bash
    set -euo pipefail
    set -- {{args}}
    ssh_prod() {
      [ "{{prod_ip}}" != 192.0.2.10 ] || [ -n "${CATALOG_PROD_SSH:-}" ] \
        || { echo "pon la IP de la VPS en infra/ansible/inventories/production/hosts.yml" >&2; exit 1; }
      ssh "{{prod_ssh}}" "$@"
    }
    case "{{verb}}" in
      next) node scripts/release/version.mjs ;;
      tag)
        [ -z "$(git status --porcelain)" ] || { echo "hay cambios sin commit" >&2; exit 1; }
        [ "$(git branch --show-current)" = main ] || { echo "los releases salen de main" >&2; exit 1; }
        git fetch --quiet origin main --tags
        [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] \
          || { echo "main local y origin/main difieren: empuja (o baja) primero" >&2; exit 1; }
        version=$(node scripts/release/version.mjs)
        tag="v$version"
        echo "$tag en $(git rev-parse --short HEAD): $(git log -1 --format=%s)"
        git tag -a "$tag" -m "Release $tag"
        git push origin "refs/tags/$tag"
        echo "GitHub Actions publica {{image}}:$tag. Luego: just release deploy $tag" ;;
      login)
        # un token clásico SÓLO con read:packages; viaja por stdin, nunca en la línea de comando
        read -rsp "token de GitHub (read:packages): " token; echo
        printf '%s' "$token" | ssh_prod docker login ghcr.io -u angelmaldonado --password-stdin ;;
      deploy)
        tag=${1:?uso: just release deploy vX.Y.Z}
        [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "no es un tag de release: $tag" >&2; exit 1; }
        echo "{{prod_ssh}} → {{image}}:$tag"
        ssh_prod "set -eu; cd /opt/catalog
          sed -i '/^CATALOG_TAG=/d' .env && echo 'CATALOG_TAG=$tag' >> .env
          docker compose pull catalog
          docker compose up -d --remove-orphans
          docker compose ps"
        echo "Luego: just release verify $(git rev-list -n 1 "$tag")" ;;
      verify)
        sha=${1:?uso: just release verify <sha>}
        command -v jq >/dev/null || { echo "falta jq" >&2; exit 1; }
        echo "esperando a que https://{{domain}} sirva ${sha:0:12}…"
        for _ in $(seq 1 60); do
          meta=$(curl -fsS --max-time 10 "https://{{domain}}/api/meta" 2>/dev/null || true)
          if [ -n "$meta" ] && [ "$(jq -r .buildHash <<<"$meta")" = "$sha" ]; then
            echo "$meta" | jq .
            [ "$(jq -r .environment <<<"$meta")" = production ] || { echo "sirve el commit, pero environment no es production" >&2; exit 1; }
            curl -fsS --max-time 10 "https://{{domain}}/api/health" | jq -e '.status == "ok"' >/dev/null \
              || { echo "sirve el commit correcto, pero /api/health no dice ok" >&2; exit 1; }
            echo "OK: {{domain}} sirve ${sha:0:12} y está sano"; exit 0
          fi
          sleep 5
        done
        echo "no llegó en 5 min. Último /api/meta: ${meta:-(sin respuesta)}" >&2; exit 1 ;;
      *) echo "uso: just release next|tag|login|deploy vX.Y.Z|verify <sha>" >&2; exit 1 ;;
    esac

# just prod logs: logs del stack en la sesión tmux ayetec-catalog-prod · just prod stop la cierra
prod action:
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{action}}" in
      logs)
        tmux has-session -t {{prod_session}} 2>/dev/null || tmux new-session -d -s {{prod_session}} -n logs
        tmux send-keys -t {{prod_session}}:logs "ssh -t {{prod_ssh}} 'cd /opt/catalog && docker compose logs -f --tail=200'" Enter
        if [ -t 1 ] && [ -z "${TMUX:-}" ]; then tmux attach -t {{prod_session}}; else echo "tmux attach -t {{prod_session}}"; fi ;;
      stop) tmux kill-session -t {{prod_session}} 2>/dev/null || true ;;
      *) echo "uso: just prod logs|stop" >&2; exit 1 ;;
    esac
