import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the e-parts Skeleton / SkeletonGroup
 * mechanism unit, one test per row of adapt-sheets/e-parts.md §4
 * (M-019…M-026, M-033, M-034). There are no headless-only rows for this
 * unit (no press paths, no platform derivation), so this file and the web
 * twin carry the same assertions — the sheet's dual-target replay.
 *
 * The fixture is `harness/skeleton.fixtures.tsx`, opened by `host.params`:
 * `case` (single/flip/group), `scope`, `loading`, `variant`, `atype`,
 * `anim`, `only`, `itemloading`, `itemvariant`, `flip`. The observable
 * surface: `shows`/`count` on `id:skel*` and `id:skeleton-shimmer` (the
 * shimmer overlay is the resolved `animationType`/`animation`/`isLoading`
 * gate's visible half), `texts()` for the children side of the gate, and
 * the `group` probe for the context's verbatim members.
 */

type Params = Record<string, string>;

function openSkeleton(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../skeleton.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

type GroupProbe = {
  isLoading: boolean | null;
  animationType: string | null;
  variant: string | null;
  animation: unknown;
};

describe("skeleton mobile (headless)", () => {
  // adapt-sheets/e-parts.md M-019 (A-010): `isLoading` defaults to true —
  // the children do not render and the shimmer overlay mounts — while
  // `isLoading={false}` renders the children in a bare view with no
  // placeholder and no shimmer.
  test("M-019 default isLoading hides children behind the placeholder; isLoading=false renders them", async () => {
    const loading = await openSkeleton("single");
    expect(loading.shows("id:skel")).toBe(true);
    expect(loading.texts()).not.toContain("Loaded content");
    await loading.waitUntil(() => loading.shows("id:skeleton-shimmer"));

    const loaded = await openSkeleton("single", { loading: "0" });
    expect(loaded.texts()).toContain("Loaded content");
    expect(loaded.count("id:skeleton-shimmer")).toBe(0);
  }, 120_000);

  // adapt-sheets/e-parts.md M-020 (A-010): the `isLoading` gate switches
  // placeholder ↔ children — the fixture remounts the same skeleton with
  // `isLoading={false}` on a signal because NSH props evaluate at mount;
  // the swap itself is the component's own gate.
  test("M-020 the isLoading gate swaps placeholder and children", async () => {
    const before = await openSkeleton("flip", { flip: "0" });
    expect(before.texts()).not.toContain("Loaded content");
    await before.waitUntil(() => before.shows("id:skeleton-shimmer"));

    const after = await openSkeleton("flip", { flip: "1" });
    expect(after.texts()).toContain("Loaded content");
    expect(after.count("id:skeleton-shimmer")).toBe(0);
  }, 120_000);

  // adapt-sheets/e-parts.md M-021 (A-010): `variant` resolves as the
  // `animationType` alias — `pulse`/`none` mount no shimmer while
  // `shimmer` does — an explicit `animationType` wins over `variant`, and
  // an `animation` config object keeps the shimmer mounted (parsed through
  // the group's context, which reports it verbatim).
  test("M-021 variant aliases animationType, animationType wins, and animation config still mounts shimmer", async () => {
    const pulse = await openSkeleton("single", { variant: "pulse" });
    expect(pulse.count("id:skeleton-shimmer")).toBe(0);

    const none = await openSkeleton("single", { variant: "none" });
    expect(none.count("id:skeleton-shimmer")).toBe(0);

    // animationType beats variant.
    const wins = await openSkeleton("single", {
      variant: "none",
      atype: "shimmer",
    });
    await wins.waitUntil(() => wins.shows("id:skeleton-shimmer"));

    // The config object mounts the shimmer it configures…
    const fast = await openSkeleton("single", { anim: "shimmer-fast" });
    await fast.waitUntil(() => fast.shows("id:skeleton-shimmer"));

    // …and the group's context reports the verbatim value it hands down.
    const group = await openSkeleton("group", { anim: "shimmer-fast" });
    await group.waitUntil(() => callsOf(group, "group").length > 0);
    expect(lastOf<GroupProbe>(group, "group").animation).toEqual({
      shimmer: { duration: 500 },
    });

    // A root-level "disabled" drops the shimmer entirely.
    const off = await openSkeleton("single", { anim: "off" });
    expect(off.count("id:skeleton-shimmer")).toBe(0);
    const shimmerOff = await openSkeleton("single", { anim: "shimmer-off" });
    expect(shimmerOff.count("id:skeleton-shimmer")).toBe(0);
  }, 120_000);

  // adapt-sheets/e-parts.md M-022 (A-010): the `isLoading` gate has no
  // environment branch — the injected-touch run is line-identical to the
  // pointer baseline.
  test("M-022 the isLoading gate is identical under injected touch", async () => {
    const loading = await openSkeleton("single", { scope: "touch" });
    expect(loading.texts()).not.toContain("Loaded content");
    await loading.waitUntil(() => loading.shows("id:skeleton-shimmer"));

    const loaded = await openSkeleton("single", {
      scope: "touch",
      loading: "0",
    });
    expect(loaded.texts()).toContain("Loaded content");
    expect(loaded.count("id:skeleton-shimmer")).toBe(0);
  }, 120_000);

  // adapt-sheets/e-parts.md M-023 (A-011): the group's `isLoading` default
  // propagates — a loading group shows one shimmer per item; a
  // `isLoading={false}` group renders every item's children.
  test("M-023 the group's isLoading propagates to every item", async () => {
    const loading = await openSkeleton("group");
    expect(loading.count("id:skeleton-shimmer")).toBeGreaterThanOrEqual(3);
    expect(loading.texts()).not.toContain("First content");
    await loading.waitUntil(() => callsOf(loading, "group").length > 0);
    expect(lastOf<GroupProbe>(loading, "group").isLoading).toBeNull();

    const loaded = await openSkeleton("group", { loading: "0" });
    expect(loaded.count("id:skeleton-shimmer")).toBe(0);
    expect(loaded.texts()).toContain("First content");
    expect(loaded.texts()).toContain("Second content");
    expect(loaded.texts()).toContain("Third content");
    expect(lastOf<GroupProbe>(loaded, "group").isLoading).toBe(false);
  }, 120_000);

  // adapt-sheets/e-parts.md M-024 (A-011): `isSkeletonOnly &&
  // !isLoading` renders nothing at all — container and children gone — and
  // the plain `isLoading={false}` group still mounts its container.
  test("M-024 isSkeletonOnly gates the whole group to null when not loading", async () => {
    const gated = await openSkeleton("group", { loading: "0", only: "1" });
    expect(gated.count("id:skel-group")).toBe(0);
    expect(gated.count("id:skel-item-1")).toBe(0);
    expect(gated.texts()).not.toContain("First content");

    const plain = await openSkeleton("group", { loading: "0" });
    expect(plain.shows("id:skel-group")).toBe(true);
    expect(plain.texts()).toContain("First content");
  }, 120_000);

  // adapt-sheets/e-parts.md M-025 (A-011): an item's explicit `isLoading`
  // wins over the group's — one item keeps its shimmer while the others
  // render their children.
  test("M-025 an item's explicit isLoading overrides the group's", async () => {
    const app = await openSkeleton("group", {
      loading: "0",
      itemloading: "1",
    });

    expect(app.shows("id:skel-group")).toBe(true);
    // Exactly one shimmer: the overriding item.
    expect(app.count("id:skeleton-shimmer")).toBe(1);
    expect(app.texts()).toContain("First content");
    expect(app.texts()).not.toContain("Second content");
    expect(app.texts()).toContain("Third content");
  }, 120_000);

  // adapt-sheets/e-parts.md M-026 (A-012, A-015): `SkeletonGroup` /
  // `SkeletonGroup.Item` / `SkeletonGroupContext` and the `Skeleton`
  // compound all import through `@heroui/react` — the fixture mounts only
  // because the barrel exports them, and `nsh check` keeps the `Skeleton`
  // signature unchanged.
  test("M-026 Skeleton and SkeletonGroup mount from the public entry", async () => {
    const app = await openSkeleton("single");
    expect(app.shows("id:skel")).toBe(true);

    const group = await openSkeleton("group");
    expect(group.shows("id:skel-group")).toBe(true);
    expect(group.shows("id:skel-item-2")).toBe(true);
    await group.waitUntil(() => callsOf(group, "group").length > 0);
  }, 120_000);

  // adapt-sheets/e-parts.md M-033/M-034 (A-016, A-017): the fixture opens in
  // both environments and its probes record.
  test("M-033 and M-034 the fixture opens in both environments and its probes record", async () => {
    for (const scope of ["", "touch"] as const) {
      const app = await openSkeleton("single", scope ? { scope } : {});
      expect(app.shows("id:skel")).toBe(true);
    }

    const group = await openSkeleton("group");
    await group.waitUntil(() => callsOf(group, "group").length > 0);
    const probe = lastOf<GroupProbe>(group, "group");
    expect(probe.isLoading).toBeNull();
    expect(probe.variant).toBeNull();
  }, 120_000);
});
