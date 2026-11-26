import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the close-button adapt unit, one test per row of
 * adapt-sheets/close-button.md §4: M-001…M-004 here (every target, native
 * ios/android included), M-005 in `close-button.mobile.web.test.tsx` (the
 * sticky-hover half is a web behavior) and M-006 in
 * `close-button.mobile.headless.test.tsx` (`app.hover` needs a mouse).
 *
 * The fixture is `harness/close-button.fixtures.tsx`, opened by
 * `host.params.case` (`events` / `disabled` / `attributed`) plus
 * `testInput` ("pointer"/"touch" through an outer `EnvironmentScope`),
 * `slop` and `pending`. The pointer side is always injected explicitly —
 * the host-derived default differs per target (touch on native phones,
 * pointer on desktop/web), and the pointer half is the desktop-parity
 * baseline of every row.
 *
 * `hitSlop` itself has no `nsh/test` readout (sheet §6 host gap): the rows
 * assert the formula's only measurable input — the 24×24 `onLayout` bounds —
 * and the gating conditions, never the expanded hit area.
 */

type Params = Record<string, string>;

// The press-sequence probe names, in contract order (adapt sheet §4 M-001).
const PRESS_EVENTS = [
  "pressDown",
  "pressStart",
  "pressChange",
  "pressUp",
  "pressEnd",
  "press",
  "click",
] as const;

// pressStart→pressDown→pressChange(true)→pressUp→pressEnd→pressChange(false)
// →press→click, verbatim. Note: the sheet's §1/§4 text records
// `onPressDown→onPressStart`, but the shipped contract — unchanged by this
// unit, identical under pointer and touch — fires `onPressStart` first
// (close-button-root.tsx handlePressDown); the assertion pins the real order.
const PRESS_SEQUENCE = [
  "pressStart",
  "pressDown",
  "pressChange",
  "pressUp",
  "pressEnd",
  "pressChange",
  "press",
  "click",
];

function openCloseButton(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../close-button.fixtures.tsx", {
    host: { params: { case: caseName, ...params } },
  });
}

/** The press-sequence probe names in firing order; layout/hover excluded. */
function pressOrder(app: App): string[] {
  return calls(app)
    .filter((c) => (PRESS_EVENTS as readonly string[]).includes(c.name))
    .map((c) => c.name);
}

function pressCalls(app: App) {
  return calls(app).filter((c) =>
    (PRESS_EVENTS as readonly string[]).includes(c.name),
  );
}

type LayoutProbe = { bounds: { size: { width: number; height: number } } };

function lastLayout(app: App): LayoutProbe | undefined {
  const all = callsOf(app, "layout");
  return all[all.length - 1]?.[0] as LayoutProbe | undefined;
}

describe("close-button mobile", () => {
  // adapt-sheets/close-button.md M-001 (A-002): injected touch keeps the
  // verbatim press order; `onLayout` reports the 24×24 root — the only
  // measurable input of the hitSlop formula (the expansion itself is a
  // registered host gap, sheet §6).
  test("M-001 touch press keeps the verbatim event order and 24x24 bounds", async () => {
    const app = await openCloseButton("events", { testInput: "touch" });

    await app.press("id:cb-probe");

    expect(pressOrder(app)).toEqual(PRESS_SEQUENCE);
    expect(callsOf(app, "pressChange")).toEqual([[true], [false]]);
    expect(lastLayout(app)?.bounds.size).toEqual({ width: 24, height: 24 });
  }, 120_000);

  // adapt-sheets/close-button.md M-002 (A-002): an explicit `hitSlop` prop wins
  // over the feedback channel. A view prop has no `nsh/test` readout (§6), so
  // the assertion stops where observation does: the binding does not throw and
  // the event sequence is unchanged.
  test("M-002 explicit hitSlop under touch keeps the press sequence", async () => {
    const app = await openCloseButton("events", { testInput: "touch", slop: "6" });

    await app.press("id:cb-probe");

    expect(pressOrder(app)).toEqual(PRESS_SEQUENCE);
    expect(callsOf(app, "pressChange")).toEqual([[true], [false]]);
  }, 120_000);

  // adapt-sheets/close-button.md M-003 (A-002): `isDisabled` closes the
  // feedback gate — `hitSlop()` is undefined and the view keeps only its
  // disabled semantics, so no press probe fires; the render prop shows the
  // disabled state.
  test("M-003 disabled under touch fires no press probes", async () => {
    const app = await openCloseButton("disabled", { testInput: "touch" });

    expect(app.enabled("id:cb-probe")).toBe(false);
    await expect(app.press("id:cb-probe")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(pressCalls(app)).toEqual([]);
    expect(app.texts()).toContain("Disabled close");
  }, 120_000);

  // adapt-sheets/close-button.md M-004 (A-002): negative assertion — under the
  // default (pointer) environment the sequence and bounds are identical and no
  // touch-only artifact appears (no new event, no new observation surface).
  test("M-004 injected pointer environment is unchanged", async () => {
    const app = await openCloseButton("events", { testInput: "pointer" });

    await app.press("id:cb-probe");

    expect(pressOrder(app)).toEqual(PRESS_SEQUENCE);
    expect(callsOf(app, "pressChange")).toEqual([[true], [false]]);
    expect(lastLayout(app)?.bounds.size).toEqual({ width: 24, height: 24 });
  }, 120_000);

  // adapt-sheets/close-button.md M-006 (baseline) lives in
  // `close-button.mobile.headless.test.tsx` — the paired-hover and
  // pending-blocks-hover halves need `app.hover`, which a phone has no
  // mouse for.
});
