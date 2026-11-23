#!/usr/bin/env bash
set -euo pipefail

list_only=false
if [[ ${1:-} == --list ]]; then
  list_only=true
  shift
fi
target=${1:?usage: test.sh [--list] TARGET [SHARD SHARD_COUNT]}
shard=${2:-0}
shard_count=${3:-1}

args=(test)
case "$target" in
  headless) workers=4 ;;
  web) workers=2; args+=(--target web) ;;
  windows|ios|android) workers=1; args+=(--target "$target") ;;
  *) echo "Unknown test target: $target" >&2; exit 2 ;;
esac

files=$(find harness/tests -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) | LC_ALL=C sort)
selected=()
index=0
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  name=${file##*/}
  case "$name" in
    *.ios.test.*) targets=' ios ' ;;
    *.android.test.*) targets=' android ' ;;
    *.mobile.*)
      # These mobile files use desktop/headless tooling for local development.
      case "$name" in
        *.headless.test.*|*.web.test.*|*.browser.test.*|*.windows.test.*) continue ;;
      esac
      targets=' ios android '
      ;;
    *.headless.test.*) targets=' headless ' ;;
    *.web.test.*|*.browser.test.*) targets=' web ' ;;
    *.windows.test.*) targets=' windows ' ;;
    *) targets=' windows ' ;; # Default desktop suite, run once.
  esac
  [[ $targets == *" $target "* ]] || continue
  if (( index % shard_count == shard )); then
    selected+=("$file")
  fi
  index=$((index + 1))
done <<< "$files"

if (( ${#selected[@]} == 0 )); then
  if ! $list_only; then
    echo "No tests for $target (shard $shard/$shard_count)."
  fi
elif $list_only; then
  printf '%s\n' "${selected[@]}"
else
  printf '%s\0' "${selected[@]}" | xargs -0 -n1 -P "$workers" nsh "${args[@]}"
fi
