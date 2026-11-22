import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Throwaway smoke check for the adapt implementation — asserts the fixture
 * mounts in both environments, the seam stays inert under the default
 * pointer environment and engages under the injected touch one.
 */

type Params = Record<string, string>;

function openFixture(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../toggle-button.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
};

type CtxChannels = {
  pressed: number;
  scale: number;
  isPressed: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  enabled: boolean;
};

type CtxState = CtxChannels;

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

describe("toggle-button mobile smoke", () => {
  test("fixture mounts in both environments and probes read", async () => {
    const pointer = await openFixture("basic", { probe: "1" });
    try {
      await pointer.waitUntil(() => callsOf(pointer, "ctx-env").length > 0);
      const env = lastOf<CtxEnv>(pointer, "ctx-env");
      expect(env.enabled).toBe(false);
      expect(env.hitSlop).toBeNull();
      expect(pointer.texts()).toContain("Off");
    } finally {

    }

    const touch = await openFixture("basic", { probe: "1", scope: "touch" });
    try {
      await touch.waitUntil(() => callsOf(touch, "ctx-env").length > 0);
      const env = lastOf<CtxEnv>(touch, "ctx-env");
      expect(env.enabled).toBe(true);
      expect(touch.texts()).toContain("Off");
    } finally {

    }
  });

  test("pointer: press leaves the seam inert; touch: seam engages on hold", async () => {
    const pointer = await openFixture("basic", { probe: "1" });
    try {
      await pointer.waitUntil(() => callsOf(pointer, "ctx-env").length > 0);
      await pointer.press("id:tb");
      await pointer.waitUntil(() => callsOf(pointer, "onChange").length === 1);
      const events = callsOf(pointer, "events").map((c) => String(c[0]));
      expect(events).toEqual(["down", "up", "change", "press"]);

      await pointer.press("id:ctx-sample");
      await pointer.waitUntil(() => callsOf(pointer, "ctx-channels").length > 0);
      const channels = lastOf<CtxChannels>(pointer, "ctx-channels");
      expect(channels.isPressed).toBe(false);
      expect(channels.scale).toBe(1);
      expect(channels.hitSlop).toBeNull();
      expect(channels.origin).toBeNull();
      expect(channels.enabled).toBe(false);
      // The seam flag never rose: every ctx-pressed edge is false.
      expect(
        callsOf(pointer, "ctx-pressed").every((c) => c[0] === false),
      ).toBe(true);
    } finally {

    }

    const touch = await openFixture("basic", { probe: "1", scope: "touch" });
    try {
      await touch.waitUntil(() => callsOf(touch, "ctx-env").length > 0);
      await touch.press("id:tb");
      await touch.waitUntil(() => callsOf(touch, "onChange").length === 1);
      const events = callsOf(touch, "events").map((c) => String(c[0]));
      expect(events).toEqual(["down", "up", "change", "press"]);

      // A hold: the polling sampler catches the seam flag mid-press.
      await touch.longPress("id:tb");
      await touch.waitUntil(() =>
        callsOf(touch, "ctx-state").some((c) => (c[0] as CtxState).isPressed),
      );
      const held = callsOf(touch, "ctx-state")
        .map((c) => c[0] as CtxState)
        .filter((s) => s.isPressed);
      expect(held.length).toBeGreaterThan(0);
      expect(held.some((s) => s.scale < 1)).toBe(true);

      await touch.press("id:ctx-sample");
      await touch.waitUntil(() => callsOf(touch, "ctx-channels").length > 0);
      const settled = lastOf<CtxChannels>(touch, "ctx-channels");
      expect(settled.enabled).toBe(true);
      expect(settled.isPressed).toBe(false);
      expect(settled.scale).toBe(1);
    } finally {

    }
  }, 120_000);

  test("touch: icon-only sm (40pt) reports hitSlop 2, touch sizes land", async () => {
    const app = await openFixture("icon-only", { probe: "1", scope: "touch" });
    try {
      await app.waitUntil(() => callsOf(app, "ctx-env").length > 0);
      const env = lastOf<CtxEnv>(app, "ctx-env");
      expect(env.hitSlop).not.toBeNull();
      expect(env.hitSlop?.top).toBe(2);
      expect(env.hitSlop?.left).toBe(2);
      const layouts = callsOf(app, "layout").map(
        (c) => c[0] as { name: string; height: number; width: number },
      );
      const sm = layouts.find((l) => l.name === "tb-sm");
      const md = layouts.find((l) => l.name === "tb-md");
      const lg = layouts.find((l) => l.name === "tb-lg");
      expect(sm?.height).toBe(40);
      expect(sm?.width).toBe(40);
      expect(md?.height).toBe(48);
      expect(md?.width).toBe(48);
      expect(lg?.height).toBe(56);
      expect(lg?.width).toBe(56);
    } finally {

    }
  });

  test("pointer parity: default-environment sizes keep desktop tiers", async () => {
    const app = await openFixture("sizes");
    try {
      await app.waitUntil(() => callsOf(app, "layout").length >= 3);
      const layouts = callsOf(app, "layout").map(
        (c) => c[0] as { name: string; height: number },
      );
      const sm = layouts.find((l) => l.name === "tb-sm");
      const md = layouts.find((l) => l.name === "tb-md");
      const lg = layouts.find((l) => l.name === "tb-lg");
      // h-9 / h-10 / h-11 at 4pt units, md: shrink doesn't apply at 1024.
      expect(sm?.height).toBe(32);
      expect(md?.height).toBe(36);
      expect(lg?.height).toBe(40);
    } finally {

    }
  });
});
