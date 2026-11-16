#!/usr/bin/env bash
# Revisa que un asunto de commit siga Conventional Commits: de eso sale la
# versión (scripts/release). feat → minor, fix → patch, «!» → cambio que rompe.
#
#   scripts/conventional.sh "feat(ui): algo"        un asunto
#   scripts/conventional.sh --range base..head       cada commit del rango (CI)
#
# Sólo revisa el formato del asunto; los merges y reverts de git pasan.
set -euo pipefail

tipos='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
patron="^($tipos)(\([^)]+\))?!?: .+"

valido() {
  local asunto=$1
  [[ "$asunto" =~ ^(Merge|Revert\ \") ]] && return 0
  [[ "$asunto" =~ ^(fixup|squash|amend)! ]] && return 0
  [[ "$asunto" =~ $patron ]]
}

ayuda() {
  cat >&2 <<AYUDA
  formato: <tipo>(ámbito opcional)!?: descripción
  tipos:   ${tipos//|/, }
  ej.:     feat(visor): fondo difuso · fix: portada con logo · feat!: quitar ruta
AYUDA
}

if [ "${1:-}" = --range ]; then
  malos=0
  while IFS=$'\t' read -r sha asunto; do
    if ! valido "$asunto"; then
      echo "✗ ${sha:0:8} $asunto" >&2
      malos=$((malos + 1))
    fi
  done < <(git log --format='%H%x09%s' "${2:?falta el rango base..head}")
  if [ "$malos" -gt 0 ]; then
    echo "$malos commit(s) no siguen Conventional Commits:" >&2
    ayuda
    exit 1
  fi
  echo "Conventional Commits: ok"
  exit 0
fi

asunto=${1:?uso: conventional.sh "<asunto>" | --range base..head}
if ! valido "$asunto"; then
  echo "✗ El asunto no sigue Conventional Commits: $asunto" >&2
  ayuda
  exit 1
fi
