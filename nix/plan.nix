# A pure function: changed paths in, per-lane shard matrices out. The plan is
# evaluated with `nix eval`, never built as a derivation, so CI pays no store
# round-trip for routing.
{
  lib,
  inventory,
  sharedPrefixes,
  lanes,
  componentOf,
  shardCounts ? {
    headless = 1;
    web = 3;
    windows = 3;
    ios = 1;
    android = 3;
  },
}:
{
  changed,
  full ? false,
}:
let
  inherit (builtins) filter;

  normalize = path: lib.removePrefix "./" (lib.removeSuffix "\r" path);

  changedPaths = filter (path: path != "") (map normalize (lib.splitString "\n" changed));

  isShared = path: lib.any (prefix: lib.hasPrefix prefix path) sharedPrefixes;

  sharedHit = lib.findFirst isShared null changedPaths;

  relevantPrefixes = [
    "src/"
    "harness/"
    "theme/"
    "scenarios/"
  ];

  isRelevantUnknown =
    path:
    lib.any (prefix: lib.hasPrefix prefix path) relevantPrefixes
    && !(isShared path)
    && componentOf path == null;

  hasUnknown = lib.any isRelevantUnknown changedPaths;

  changedComponents = lib.unique (
    filter (component: component != null) (map componentOf changedPaths)
  );

  # An empty diff means the caller could not read the change set. Running the
  # full suite is the safe failure mode; silently passing everything is not.
  fullRun = full || changedPaths == [ ] || sharedHit != null || hasUnknown;

  selected = lib.filterAttrs (
    _: entry: fullRun || builtins.elem entry.component changedComponents
  ) inventory;

  entriesFor = lane: filter (entry: builtins.elem lane entry.lanes) (lib.attrValues selected);

  # Split a lane's files into roughly equal contiguous chunks, in path order
  # so the matrix is stable. Empty chunks are dropped.
  chunk =
    count: items:
    let
      sorted = lib.sort (a: b: a.path < b.path) items;
      total = builtins.length sorted;
      size = builtins.div (total + count - 1) count;
    in
    filter (shard: shard.files != [ ]) (
      lib.genList (index: {
        inherit index;
        files = map (item: item.path) (lib.sublist (index * size) size sorted);
      }) count
    );

  lanePlan = lib.genAttrs lanes (lane: {
    shards = chunk (shardCounts.${lane} or 1) (entriesFor lane);
  });

  anyLane = lib.genAttrs lanes (lane: lanePlan.${lane}.shards != [ ]);

  reason =
    if full then
      "full (requested)"
    else if changedPaths == [ ] then
      "full (empty diff)"
    else if sharedHit != null then
      "full (shared: ${sharedHit})"
    else if hasUnknown then
      "full (unmapped source path)"
    else if changedComponents == [ ] then
      "no test-relevant changes"
    else
      "component:${lib.concatStringsSep "," changedComponents}";
in
{
  version = 1;
  full = fullRun;
  inherit reason;
  lanes = lanePlan;
  any = anyLane;
}
