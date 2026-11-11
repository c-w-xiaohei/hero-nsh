import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import {
  animateSheetValue,
  nearestSheetSnap,
  sheetDismissTarget,
  sheetReleaseEase,
} from "../../../../src/components/sheet/sheet.utils";

/*
 * HeroUI 3.2.7's `sheet.utils.test.ts` (port sheet T-035 … T-045). The four pure
 * functions are ported line for line (port sheet §5), so their numeric policy is
 * asserted the same way: no app, no DOM.
 *
 * The release animation is the exception: T-043/T-044 schedule frames with
 * `requestAnimationFrame`, which only moves with an app's clock, so those two
 * cases drive `harness/sheet.fixtures.tsx`. T-045's immediate-completion paths
 * run synchronously and stay here.
 */

type Swipe = "bottom" | "right" | "top" | "left";

const defaults = {
  current: 760,
  elapsed: 500,
  extent: 800,
  isDismissable: true,
  rest: 800,
  size: 300,
  swipeDirection: "bottom" as Swipe,
  travel: 40,
  viewport: 800,
};

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:11
for (const { current, velocity, expected } of [
  { current: 200, velocity: 0, expected: 150 },
  { current: 240, velocity: 0, expected: 300 },
  { current: 200, velocity: -0.5, expected: 300 },
  { current: 240, velocity: 0.5, expected: 150 },
  { current: 0, velocity: 1, expected: 0 },
  { current: 300, velocity: -1, expected: 300 },
  { current: 149.8, velocity: -1, expected: 300 },
  { current: 150.2, velocity: 1, expected: 0 },
]) {
  test(`T-035 supports directional snapping from ${current} at velocity ${velocity}`, () => {
    expect(nearestSheetSnap([0, 150, 300], current, velocity)).toBe(expected);
  });
}

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:26
test("T-036 supports an empty target list and a single target", () => {
  expect(nearestSheetSnap([], 100, 0)).toBeNull();
  expect(nearestSheetSnap([200], 100, 0)).toBe(200);
});

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:45
test("T-037 supports snapping back below the distance and velocity thresholds", () => {
  expect(sheetDismissTarget(defaults)).toBe(800);
});

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:48
for (const swipeDirection of ["bottom", "right", "top", "left"] as const) {
  test(`T-038 supports the physical dismissal direction for ${swipeDirection}`, () => {
    const forward = swipeDirection === "bottom" || swipeDirection === "right";
    const rest = forward ? 800 : 0;

    expect(
      sheetDismissTarget({
        ...defaults,
        current: forward ? 700 : 100,
        rest,
        swipeDirection,
        travel: forward ? 100 : -100,
      }),
    ).toBe(forward ? 0 : 800);
    expect(
      sheetDismissTarget({
        ...defaults,
        current: rest,
        rest,
        swipeDirection,
        travel: forward ? -100 : 100,
      }),
    ).toBe(rest);
  });
}

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:74
test("T-039 supports fast flicks, zero duration, and exact threshold distances", () => {
  expect(sheetDismissTarget({ ...defaults, elapsed: 50 })).toBe(0);
  expect(sheetDismissTarget({ ...defaults, elapsed: 0 })).toBe(800);
  expect(sheetDismissTarget({ ...defaults, travel: 75 })).toBe(0);
  expect(sheetDismissTarget({ ...defaults, travel: 74 })).toBe(800);
});

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:80
test("T-040 supports non-dismissable sheets even after a fast or long drag", () => {
  expect(
    sheetDismissTarget({ ...defaults, elapsed: 1, isDismissable: false, travel: 600 }),
  ).toBe(800);
});

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:85
test("T-041 supports viewport-sized thresholds and missing measurements", () => {
  expect(sheetDismissTarget({ ...defaults, size: 1000, viewport: 200, travel: 50 })).toBe(0);
  expect(sheetDismissTarget({ ...defaults, size: 0, travel: 100 })).toBe(800);
  expect(sheetDismissTarget({ ...defaults, size: 0, elapsed: 20 })).toBe(0);
  expect(
    sheetDismissTarget({
      ...defaults,
      current: 100,
      extent: -1,
      rest: 0,
      swipeDirection: "top",
      travel: -100,
    }),
  ).toBe(0);
});

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:103
test("T-042 supports bounded, monotonic easing with exact endpoints", () => {
  expect(sheetReleaseEase(-1)).toBe(0);
  expect(sheetReleaseEase(0)).toBe(0);
  expect(sheetReleaseEase(1)).toBe(1);
  expect(sheetReleaseEase(2)).toBe(1);

  let previous = 0;

  for (let step = 1; step <= 100; step++) {
    const value = sheetReleaseEase(step / 100);

    expect(value).toBeGreaterThanOrEqual(previous);
    expect(value).toBeLessThanOrEqual(1);
    previous = value;
  }

  expect(sheetReleaseEase(0.5)).toBeGreaterThan(0.5);
});

function openAnimator(name: string): Promise<App> {
  return open("../../../sheet.fixtures.tsx", {
    clock: {},
    host: { params: { case: name } },
    platform: "windows",
  });
}

function numbers(app: App, name: string): number[] {
  return callsOf(app, name).map((args) => args[0] as number);
}

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:136
// Partial port (port sheet T-043): the frame-by-frame rAF stub has no
// counterpart; the app's clock drives the loop instead. The assertion face is
// the same: the first frame is `from`, the last is `to`, and completion happens
// once, at the end.
test("T-043 calls updates toward either target and completes only at the endpoint", async () => {
  for (const [name, from, to] of [
    ["forward", 0, 400],
    ["back", 400, 0],
  ] as const) {
    const app = await openAnimator(name);

    await app.press("id:start");
    await app.clock!.runFor(700);

    const updates = numbers(app, "update");

    expect(updates[0]).toBe(from);
    expect(updates.at(-1)).toBe(to);
    expect(callsOf(app, "complete").length).toBe(1);
  }
});

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:158
// Partial port (port sheet T-044): the `cancelAnimationFrame` spy is dropped
// (§8); with the cancel in the same turn as the start there is no update and no
// completion from a stale frame.
test("T-044 supports cancellation without updates or completion from stale frames", async () => {
  const app = await openAnimator("cancel");

  await app.press("id:start");
  await app.clock!.runFor(700);

  expect(callsOf(app, "update").length).toBe(0);
  expect(callsOf(app, "complete").length).toBe(0);
});

// heroui/packages/react/tests/components/sheet/sheet.utils.test.ts:171
// Partial port (port sheet T-045): “requestAnimationFrame was not called” has no
// spy channel (§8). Kept: reduced motion and a sub-half-point move update once
// with the target and complete once, synchronously.
for (const { from, to, reduced } of [
  { from: 0, to: 100, reduced: true },
  { from: 10, to: 10.2, reduced: false },
]) {
  test(`T-045 supports immediate completion for ${from} to ${to} with reduced motion ${reduced}`, () => {
    const updates: number[] = [];
    let completed = 0;
    const cancel = animateSheetValue(
      from,
      to,
      (value) => updates.push(value),
      () => completed++,
      reduced,
    );

    expect(updates).toEqual([to]);
    expect(completed).toBe(1);
    expect(typeof cancel).toBe("function");

    cancel();
  });
}
