import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target mobile assertions for the e-parts Skeleton / SkeletonGroup
 * mechanism unit: the same M-019…M-026/M-033/M-034 assertion set as the
 * headless file — this unit has no headless-only rows, so the web run is
 * the sheet's dual-target replay. `platform:"web"` plays the pointer host;
 * `EnvironmentScope input="touch"` supplies the injected touch environment.
 */

type Params = Record<string, string>;

function openSkeleton(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../skeleton.fixtures.tsx", {
    platform: "web",
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

describe("skeleton mobile (web)", () => {
  // adapt-sheets/e-parts.md M-019 (A-010): `isLoading` defaults to true —
  // children hidden, shimmer mounted; `isLoading={false}` renders children.
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
  // placeholder ↔ children (the fixture remounts on a signal — NSH props
  // evaluate at mount; the swap is the component's own gate).
  test("M-020 the isLoading gate swaps placeholder and children", async () => {
    const before = await openSkeleton("flip", { flip: "0" });
    expect(before.texts()).not.toContain("Loaded content");
    await before.waitUntil(() => before.shows("id:skeleton-shimmer"));

    const after = await openSkeleton("flip", { flip: "1" });
    expect(after.texts()).toContain("Loaded content");
    expect(after.count("id:skeleton-shimmer")).toBe(0);
  }, 120_000);

  // adapt-sheets/e-parts.md M-021 (A-010): `variant` aliases
  // `animationType` (loses to the explicit one), and an `animation` config
  // still mounts the shimmer it configures.
  test("M-021 variant aliases animationType, animationType wins, and animation config still mounts shimmer", async () => {
    const pulse = await openSkeleton("single", { variant: "pulse" });
    expect(pulse.count("id:skeleton-shimmer")).toBe(0);

    const none = await openSkeleton("single", { variant: "none" });
    expect(none.count("id:skeleton-shimmer")).toBe(0);

    const wins = await openSkeleton("single", {
      variant: "none",
      atype: "shimmer",
    });
    await wins.waitUntil(() => wins.shows("id:skeleton-shimmer"));

    const fast = await openSkeleton("single", { anim: "shimmer-fast" });
    await fast.waitUntil(() => fast.shows("id:skeleton-shimmer"));

    const group = await openSkeleton("group", { anim: "shimmer-fast" });
    await group.waitUntil(() => callsOf(group, "group").length > 0);
    expect(lastOf<GroupProbe>(group, "group").animation).toEqual({
      shimmer: { duration: 500 },
    });

    const off = await openSkeleton("single", { anim: "off" });
    expect(off.count("id:skeleton-shimmer")).toBe(0);
    const shimmerOff = await openSkeleton("single", { anim: "shimmer-off" });
    expect(shimmerOff.count("id:skeleton-shimmer")).toBe(0);
  }, 120_000);

  // adapt-sheets/e-parts.md M-022 (A-010): no environment branch in the
  // `isLoading` gate — the injected-touch run matches the baseline.
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
  // propagates to every item.
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

  // adapt-sheets/e-parts.md M-024 (A-011): `isSkeletonOnly && !isLoading`
  // gates the whole group to null; the plain group still mounts.
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
  // wins over the group's.
  test("M-025 an item's explicit isLoading overrides the group's", async () => {
    const app = await openSkeleton("group", {
      loading: "0",
      itemloading: "1",
    });

    expect(app.shows("id:skel-group")).toBe(true);
    expect(app.count("id:skeleton-shimmer")).toBe(1);
    expect(app.texts()).toContain("First content");
    expect(app.texts()).not.toContain("Second content");
    expect(app.texts()).toContain("Third content");
  }, 120_000);

  // adapt-sheets/e-parts.md M-026 (A-012, A-015): `Skeleton` and
  // `SkeletonGroup` mount from `@heroui/react`.
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
