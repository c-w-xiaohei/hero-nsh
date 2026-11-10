import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Toolbar, per port sheet 4b (T-001 … T-005,
 * T-007). Every case keeps its upstream file:line above it and its title starts
 * with the port-sheet id. The assertions follow SOP 3.2: BEM modifiers,
 * `data-slot` and `aria-orientation` are not readable through nsh/test (D18,
 * port sheet §8), so each of those cases is read as the geometry the modifier
 * produces — one row for horizontal, one column for vertical, the 4-point
 * `p-1` inset for attached — through `onLayout` probes. The partial ports say
 * which upstream assertions stay unread.
 *
 * T-006 and T-008 move the keyboard focus with Tab, which a real Windows window
 * does not do ("Real hosts" in the loop brief; registered difference), so they
 * live in toolbar.heroui.web.test.tsx.
 *
 * Every case waits for the first frame after `open` before it reads: on
 * `--target web` `open` can resolve before the app's first commit. The waits
 * only delay the reads — every assertion still runs and can still fail — and
 * they use `{ timeout: 15_000 }`, above nsh's own 10 s app-start budget.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function layoutCalls(app: App): LayoutCall[] {
  return callsOf(app, "layout").map((args) => args[0] as LayoutCall);
}

/** Waits until the app's layout pass has reached `names`: an `open` can resolve before the first commit. */
async function firstFrame(app: App, ...names: string[]): Promise<void> {
  await app.waitUntil(
    () => names.every((name) => layoutCalls(app).some((call) => call.name === name)),
    { timeout: 15_000 },
  );
}

function frame(app: App, name: string): LayoutCall {
  const found = layoutCalls(app).find((call) => call.name === name);

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

// heroui/packages/react/tests/components/toolbar/toolbar.test.tsx:16
// Partial port (port sheet T-001): upstream asserts role + name, `data-slot`
// and the `toolbar` BEM block. Only the named toolbar role has an NSH channel
// (the other two are D18), so it carries the whole case.
test("T-001 exposes a labelled toolbar role with data-slot and BEM block", async () => {
  const app = await openScenario("toolbar/press");
  await app.waitFor("role:toolbar[Text formatting]", { timeout: 15_000 });

  expect(app.shows("role:toolbar[Text formatting]")).toBe(true);
});

// heroui/packages/react/tests/components/toolbar/toolbar.test.tsx:30
// Rewritten port (port sheet T-002): `toolbar--horizontal` is an empty block;
// its visible consequence is the default `grid-flow-col` row. A row keeps both
// buttons on one y and puts the second to the right of the first; a row-flow
// regression stacks them.
test("T-002 exposes default horizontal orientation BEM modifier", async () => {
  const app = await openScenario("toolbar/horizontal");
  await firstFrame(app, "horizontal-0", "horizontal-1");
  const first = frame(app, "horizontal-0");
  const second = frame(app, "horizontal-1");

  expect(Math.abs(second.y - first.y)).toBeLessThan(0.6);
  expect(second.x).toBeGreaterThan(first.x);
});

// heroui/packages/react/tests/components/toolbar/toolbar.test.tsx:42
// Rewritten port (port sheet T-003): the other half of the same consequence.
// `grid-flow-row` + `items-start` stacks the buttons on one x; a missing
// vertical variant leaves them side by side.
test("T-003 exposes vertical orientation BEM modifier", async () => {
  const app = await openScenario("toolbar/vertical");
  await firstFrame(app, "vertical-0", "vertical-1");
  const first = frame(app, "vertical-0");
  const second = frame(app, "vertical-1");

  expect(second.y).toBeGreaterThan(first.y);
  expect(Math.abs(second.x - first.x)).toBeLessThan(0.6);
});

// heroui/packages/react/tests/components/toolbar/toolbar.test.tsx:54
// Rewritten port (port sheet T-004): `toolbar--attached` carries `p-1` besides
// the background, radius and shadow, which are paint and belong to the
// screenshot comparison. The padding is measured here: the child sits 4 points
// inside the root on every side, so the root is 8 points taller.
//
// `onLayout` reports the frame in the parent (types.d.ts:808), so the two
// origins live in different spaces: the root sits in `Stage`'s `p-6` and
// reports 24, the button sits in the toolbar's own `p-1` and reports 4. The
// inset is therefore the child's origin itself; only the extents, which do not
// depend on the origin, compare across the two frames.
test("T-004 exposes attached BEM modifier", async () => {
  const app = await openScenario("toolbar/attached");
  await firstFrame(app, "attached-root", "attached-0");
  const root = frame(app, "attached-root");
  const child = frame(app, "attached-0");

  expect(child.x).toBe(4);
  expect(child.y).toBe(4);
  expect(root.height - child.height).toBe(8);
  expect(root.width - child.width).toBe(8);
});

// heroui/packages/react/tests/components/toolbar/toolbar.test.tsx:66
test("T-005 supports pressing grouped buttons inside the toolbar", async () => {
  const app = await openScenario("toolbar/press");
  await app.waitFor("role:button[Undo]", { timeout: 15_000 });

  await app.press("role:button[Undo]");

  expect(callsOf(app, "onPress")).toHaveLength(1);
});

// heroui/packages/react/tests/components/toolbar/toolbar.test.tsx:96
// Rewritten port (port sheet T-007): the public contract is a `Set`, which
// serialises as `{}`, so the scenario spreads it into a sorted array for the
// probe. The pressed state itself needs no extra assertion: it is the payload.
test("T-007 supports composition with a nested ToggleButtonGroup", async () => {
  const app = await openScenario("toolbar/nested-group");
  await app.waitFor("role:button[Bold]", { timeout: 15_000 });

  await app.press("role:button[Bold]");

  expect(callsOf(app, "onSelectionChange")).toEqual([[["bold"]]]);
});
