#!/usr/bin/env bash
# Run the files a plan shard carries. The lane decides the target and the
# worker count; the plan decides which files exist, so this script never
# discovers tests or shards them again.
set -euo pipefail

lane=${1:?usage: run-files.sh LANE FILE...}
shift

case "$lane" in
  headless)
    workers=4
    target=()
    ;;
  web)
    workers=2
    target=(--target web)
    ;;
  windows | ios | android)
    # These targets share a windowing host or device and run one file at a
    # time.
    workers=1
    target=(--target "$lane")
    ;;
  *)
    echo "Unknown test target: $lane" >&2
    exit 2
    ;;
esac

if (( $# == 0 )); then
  echo "No tests for $lane."
  exit 0
fi

printf '%s\0' "$@" | xargs -0 -n1 -P "$workers" nsh test "${target[@]}"
