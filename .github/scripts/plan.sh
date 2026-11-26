#!/usr/bin/env bash
# Evaluate the flake's plan function. `changed_file` is a newline-separated
# list of paths; `full` is true or false. The output is JSON on stdout;
# warnings stay on stderr.
set -euo pipefail

changed_file=${1:?usage: plan.sh CHANGED_FILE [FULL]}
full=${2:-false}

case "$full" in
  true | false) ;;
  *)
    echo "full must be true or false, got: $full" >&2
    exit 2
    ;;
esac

# `--impure` is only for reading the changed list and the full flag; the
# flake itself still comes from the pinned lock file.
PLAN_CHANGED_FILE="$changed_file" PLAN_FULL="$full" \
  nix eval --json --impure .#plan --apply '
    f: f {
      changed = builtins.readFile (builtins.getEnv "PLAN_CHANGED_FILE");
      full = builtins.fromJSON (builtins.getEnv "PLAN_FULL");
    }
  '
