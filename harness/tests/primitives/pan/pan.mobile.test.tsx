import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the sheet-handoff mechanism unit's `createPan`
 * seam, one test per row of adapt-sheets/sheet-handoff.md §4 (M-001…M-004,
 * M-011). The fixture is `harness/sheet.fixtures.tsx` (the unit's only
 * harness-level fixture slot), opened by `host.params.case`/`scope`.
 *
 * `app.drag` lands a finger on the target's middle, rests, moves 10 points
 * a frame and lifts; the probe calls it leaves in `app.storage()` are the
 * assertion surface, plus the `active=`/`keys=`/`scroll=`/`api=` texts the
 * fixture renders.
 */

type PanCall = { phase: string; dx: number; dy: number; active: boolean };

// No `platform`/`width`/`height` open options: native iOS/Android hosts run
// this file with their real screen and platform and reject those options.
// Environment comparisons go through the fixture's EnvironmentScope
// injection (params.scope "touch"/"pointer"), never the host platform.
function openPan(
  caseName: string,
  params: { scope?: "touch" | "pointer" } = {},
): Promise<App> {
  return open("../../../sheet.fixtures.tsx", {
    host: {
      params: {
        case: caseName,
        ...(params.scope ? { scope: params.scope } : {}),
      },
    },
  });
}

function panCalls(app: App): PanCall[] {
  return callsOf(app, "pan").map((args) => args[0] as PanCall);
}

async function dragAndSettle(app: App, by: { x: number; y: number }) {
  await app.drag("id:pan-target", by);
}

describe("createPan", () => {
  // adapt-sheets/sheet-handoff.md M-001 (A-001): an enabled pan claims the
  // drag and reports dragStart → drag… → dragEnd in order; `active()` is
  // true while the gesture runs and resets after the release.
  test("M-001 enabled pan reports dragStart, drag steps and dragEnd in order", async () => {
    const app = await openPan("pan-on");

    await dragAndSettle(app, { x: 0, y: 60 });
    await app.waitUntil(() => panCalls(app).length >= 3);

    const calls = panCalls(app);
    expect(calls[0].phase).toBe("dragStart");
    expect(calls.at(-1)!.phase).toBe("dragEnd");
    expect(calls.slice(1, -1).every((call) => call.phase === "drag")).toBe(true);
    expect(calls[0].active).toBe(true);
    expect(calls.slice(1, -1).every((call) => call.active)).toBe(true);

    // `active()` resets once the gesture is over.
    expect(app.shows("text:active=false")).toBe(true);
  });

  // adapt-sheets/sheet-handoff.md M-002 (A-001, 负断言): `enabled() = false`
  // resolves `panHandlers()` to an empty object — the listeners are never
  // registered, so the same drag produces zero callbacks. The env-driven
  // half ("pan-env") proves the same gating through `createInput()`:
  // pointer registers nothing, injected touch registers the path.
  test("M-002 disabled pan registers no gesture path; env-driven gating matches", async () => {
    const off = await openPan("pan-off");
    await dragAndSettle(off, { x: 0, y: 60 });

    expect(panCalls(off)).toHaveLength(0);
    expect(off.shows("text:keys=0")).toBe(true);
    expect(off.shows("text:active=false")).toBe(true);
    // keyboardDismissMode is a divergence field: dropped while disabled.
    expect(off.shows("text:scroll={}")).toBe(true);

    const pointer = await openPan("pan-env", { scope: "pointer" });
    await dragAndSettle(pointer, { x: 0, y: 60 });
    expect(panCalls(pointer)).toHaveLength(0);
    expect(pointer.shows("text:keys=0")).toBe(true);

    const touch = await openPan("pan-env", { scope: "touch" });
    await dragAndSettle(touch, { x: 0, y: 60 });
    await touch.waitUntil(() => panCalls(touch).length >= 3);
    expect(panCalls(touch).length).toBeGreaterThanOrEqual(3);
    // The resolved handlers are really on the view (not just callbacks):
    // some `keys=N` text with N > 0, and scrollProps kept its divergence
    // field under the enabled environment.
    expect(touch.texts().some((text) => /^keys=[1-9]\d*$/.test(text))).toBe(true);
    expect(
      touch.texts().some((text) => text.includes("keyboardDismissMode")),
    ).toBe(true);
  });

  // adapt-sheets/sheet-handoff.md M-003 (A-001): `enabled` is an accessor —
  // the spec's "flipping re-registers" is reframed by the measured host
  // rule (sheet §5): `{...panHandlers()}` fixes its prop keys at mount, so
  // a spread that mounted `{}` never gains listeners — `keys=` flips to 12
  // in the fixture's reactive text while the view itself still owns no
  // gesture path. What the accessor does gate live is the mounted pan's
  // predicates; the late-enable half is the honest negative here.
  test("M-003 enabled accessor: mounted-empty spread stays silent after a late flip", async () => {
    const app = await openPan("pan-gated");

    await dragAndSettle(app, { x: 0, y: 60 });
    expect(panCalls(app)).toHaveLength(0);
    expect(app.shows("text:keys=0")).toBe(true);

    // The signal flips and the reactive text re-resolves `panHandlers()`
    // to 12 keys — but those keys were never spread onto the mounted view,
    // so the next drag is still silent.
    await app.press("id:toggle");
    await app.waitUntil(() => app.shows("text:keys=0") === false);

    await dragAndSettle(app, { x: 0, y: 60 });
    expect(panCalls(app)).toHaveLength(0);

    // The other direction is live: a pan mounted enabled stops answering
    // its own predicates the moment `enabled()` reads false.
    const armed = await openPan("pan-disarm");
    await dragAndSettle(armed, { x: 0, y: 60 });
    await armed.waitUntil(() => panCalls(armed).length >= 3);

    await armed.press("id:toggle");
    const seen = panCalls(armed).length;
    await dragAndSettle(armed, { x: 0, y: 60 });
    expect(panCalls(armed).length).toBe(seen);
  });

  // adapt-sheets/sheet-handoff.md M-004 (A-001): `shouldClaim` is the move
  // predicate — upward travel never claims (zero callbacks), downward
  // travel does.
  test("M-004 shouldClaim gates the claim by drag direction", async () => {
    const app = await openPan("pan-claim");

    await dragAndSettle(app, { x: 0, y: -60 });
    expect(panCalls(app)).toHaveLength(0);

    await dragAndSettle(app, { x: 0, y: 60 });
    await app.waitUntil(() => panCalls(app).length >= 3);
    expect(panCalls(app).length).toBeGreaterThanOrEqual(3);
    expect(panCalls(app)[0].phase).toBe("dragStart");
  });

  // adapt-sheets/sheet-handoff.md M-011 (A-002, A-003): the fixture imports
  // `createPan` (and the `Pan`/`PanProps` types) from the public `hero-nsh`
  // entry; the mounted `api=` text proves the primitives barrel chain is
  // reachable, and the type imports are the compile-time half.
  test("M-011 createPan and its types are importable from the public entry", async () => {
    const app = await openPan("pan-on");

    expect(app.shows("text:api=function")).toBe(true);
    expect(app.shows("text:active=false")).toBe(true);
  });
});
