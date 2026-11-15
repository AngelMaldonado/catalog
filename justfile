set shell := ["bash", "-euo", "pipefail", "-c"]

pb_version := "0.40.6"
pb_port := "8097"
web_port := "5177"
session := "ayetec-catalog"
docker_context := env("CATALOG_DOCKER_CONTEXT", "reko-3")
pb := ".bin/pocketbase --dir=pb_data --migrationsDir=pb/pb_migrations --hooksDir=pb/pb_hooks"

default:
    @just --list

# PocketBase en .bin/ + dependencias de web/
setup:
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
