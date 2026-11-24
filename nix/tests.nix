# The single test inventory. CI and the plan function read this; nothing else
# decides which suffix belongs to which lane.
#
# `lanes` is the set of CI lanes a file runs on. An empty set means the file
# is local-only (the `.mobile.headless`, `.mobile.web` and sibling splits).
{ lib, paths }:
let
  inherit (builtins)
    attrValues
    baseNameOf
    filter
    ;
  inherit (paths) componentOf sharedPrefixes;

  root = ../harness/tests;
  repoRoot = ../.;

  files = filter (path: lib.hasInfix ".test." (baseNameOf path)) (
    lib.filesystem.listFilesRecursive root
  );

  relative = path: lib.removePrefix (toString repoRoot + "/") (toString path);

  lanes = [
    "headless"
    "web"
    "windows"
    "ios"
    "android"
  ];

  laneRules = [
    {
      match =
        name:
        lib.hasInfix ".mobile.headless." name
        || lib.hasInfix ".mobile.web." name
        || lib.hasInfix ".mobile.browser." name
        || lib.hasInfix ".mobile.windows." name;
      lanes = [ ];
    }
    {
      match = name: lib.hasInfix ".ios.test." name;
      lanes = [ "ios" ];
    }
    {
      match = name: lib.hasInfix ".android.test." name;
      lanes = [ "android" ];
    }
    {
      match = name: lib.hasInfix ".mobile." name;
      lanes = [
        "ios"
        "android"
      ];
    }
    {
      match = name: lib.hasInfix ".headless." name;
      lanes = [ "headless" ];
    }
    {
      match = name: lib.hasInfix ".web." name || lib.hasInfix ".browser." name;
      lanes = [ "web" ];
    }
    {
      match = name: lib.hasInfix ".windows." name;
      lanes = [ "windows" ];
    }
    {
      match = _: true;
      lanes = [ "windows" ];
    }
  ];

  laneOf =
    name:
    (lib.findFirst (rule: rule.match name) (throw "no lane rule matched ${name}") laneRules).lanes;

  inventory = lib.listToAttrs (
    map (
      path:
      let
        rel = relative path;
        entryLanes = laneOf (baseNameOf rel);
      in
      {
        name = rel;
        value = {
          path = rel;
          lanes = entryLanes;
          component = componentOf rel;
          local = entryLanes == [ ];
        };
      }
    ) files
  );

  entries = attrValues inventory;

  assertions = [
    (lib.all (entry: entry.component != null) entries)
    (lib.all (entry: entry.local == (entry.lanes == [ ])) entries)
    (lib.all (
      entry:
      !(lib.hasInfix ".mobile." entry.path)
      || entry.local
      || (builtins.elem "ios" entry.lanes && builtins.elem "android" entry.lanes)
    ) entries)
  ];

in
assert lib.all (assertion: assertion) assertions;
{
  inherit
    inventory
    lanes
    sharedPrefixes
    ;

  counts = lib.genAttrs lanes (
    lane: builtins.length (filter (entry: builtins.elem lane entry.lanes) entries)
  );

  localCount = builtins.length (filter (entry: entry.local) entries);
}
