# Path classification shared by the inventory and the plan. Keeping it in one
# file means a changed path and an inventoried test cannot disagree about
# which component they belong to.
{ lib }:
let
  inherit (builtins) baseNameOf length;

  # `null` means the path is not a recognized component path; the plan turns
  # a changed unrecognized source path into a full run.
  componentOf =
    path:
    let
      parts = lib.splitString "/" path;
      count = length parts;
    in
    if lib.hasPrefix "src/components/" path && count >= 4 then
      builtins.elemAt parts 2
    else if lib.hasPrefix "harness/tests/components/" path && count >= 5 then
      builtins.elemAt parts 3
    else if lib.hasPrefix "harness/tests/primitives/" path then
      "primitives"
    else if lib.hasPrefix "harness/tests/helpers/" path then
      "helpers"
    else if lib.hasPrefix "harness/tests/testers/" path then
      "testers"
    else if lib.hasPrefix "scenarios/" path && count == 2 && lib.hasSuffix ".scenarios.tsx" path then
      lib.removeSuffix ".scenarios.tsx" (baseNameOf path)
    else if lib.hasPrefix "harness/" path && count == 2 && lib.hasSuffix ".fixtures.tsx" path then
      lib.removeSuffix ".fixtures.tsx" (baseNameOf path)
    else
      null;

  sharedPrefixes = [
    "src/primitives/"
    "src/tokens/"
    "src/theme.ts"
    "src/index.ts"
    "theme/"
    "harness/App.tsx"
    "harness/nsh.json"
    "harness/tests/helpers/"
    "harness/tests/testers/"
    "harness/fonts/"
    "tsconfig.json"
    "package.json"
    "pnpm-lock.yaml"
    "pnpm-workspace.yaml"
    ".nvmrc"
    "flake.nix"
    "flake.lock"
    "nix/"
    ".github/"
  ];
in
{
  inherit componentOf sharedPrefixes;
}
