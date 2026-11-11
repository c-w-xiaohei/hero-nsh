import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { Sheet, SheetRoot } from "../../../../src/components/sheet";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Sheet, per port sheet 4b (T-001 … T-031,
 * T-046, T-047). Every case keeps its upstream file:line above it and its title
 * starts with the port-sheet id.
 *
 * The assertions follow SOP 3.2: `nsh test` has no DOM attribute, computed
 * style or focus channel, so `data-slot` / BEM / aria lookups are dropped where
 * the port sheet says so. What a user observes stays: the panel appears and
 * disappears, the callbacks arrive with their values, and part geometry is read
 * through the scenarios' `onLayout` probes.
 *
 * Drags close a sheet through `sheetDismissTarget`'s velocity branch: `app.drag`
 * moves 10 points a frame, so a 100+ point drag is a fast flick. Dismissal is
 * observed through `onAnimationEnd` (the Dialog's fade) and the fact that the
 * stage buttons behind the overlay become pressable again.
 *
 * T-019, T-032, T-033 and T-034 live in `sheet.headless.test.tsx`; the pure
 * number tests (T-035 … T-045) in `sheet.utils.test.tsx`; G-001 … G-003 in
 * `sheet.layout.web.test.tsx`.
 */

const WIDTH = 1024;
const HEIGHT = 768;
const CONTENT = "text:Sheet content";
const TRIGGER = "role:button[Open sheet]";

type Layout = { name: string; x: number; y: number; width: number; height: number };

/** The last layout the part `name` reported (test ids and drags move it). */
function layout(app: App, name: string): Layout {
  const entries = callsOf(app, "layout").filter((args) => (args[0] as Layout | undefined)?.name === name);
  const last = entries.at(-1)?.[0] as Layout | undefined;

  if (!last) throw new Error(`no layout was reported for ${name}`);

  return last;
}

/** The first argument of every call the probe `name` recorded. */
function calls(app: App, name: string): unknown[] {
  return callsOf(app, name).map((args) => args[0]);
}

async function openSheet(app: App) {
  await app.press(TRIGGER);
  await app.clock!.runFor(20);
}

async function closeSheet(app: App) {
  await app.press("role:button[Dismiss sheet]");
  await app.clock!.runFor(20);
}

/**
 * The panel's resting edge. `onLayout` reports bounds in the parent, and the
 * Dialog's parent is the edge-positioned Content box, so the Dialog's frame is
 * `{0, 0}` for every placement; the Content is the box that sits on the edge.
 */
function expectEdge(app: App, placement: "bottom" | "top" | "left" | "right") {
  const content = layout(app, "content");

  if (placement === "bottom") expect(Math.abs(content.y + content.height - HEIGHT)).toBeLessThan(2);
  if (placement === "top") expect(Math.abs(content.y)).toBeLessThan(2);
  if (placement === "left") expect(Math.abs(content.x)).toBeLessThan(2);
  if (placement === "right") expect(Math.abs(content.x + content.width - WIDTH)).toBeLessThan(2);
}

function dragVector(placement: "bottom" | "top" | "left" | "right", distance = 260) {
  if (placement === "bottom") return { x: 0, y: distance };
  if (placement === "top") return { x: 0, y: -distance };
  if (placement === "left") return { x: -distance, y: 0 };

  return { x: distance, y: 0 };
}

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:13
// Partial port (port sheet T-001): the `sheetVariants().content()` BEM-class
// assertion is a D18 deletion. Kept: the compound root is the named root and
// the twelve parts are defined.
test("T-001 exposes compound exports, named exports, and variants", () => {
  expect(Sheet.Root).toBe(SheetRoot);
  for (const part of [
    "Trigger",
    "Backdrop",
    "Content",
    "Dialog",
    "Header",
    "Heading",
    "Body",
    "Footer",
    "Handle",
    "Close",
    "CloseTrigger",
    "NestedRoot",
  ] as const) {
    expect(Sheet[part]).toBeDefined();
  }
});

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:33
// Rewritten (port sheet T-002): the trigger opens the panel, the heading text
// stands in for the dialog's accessible name, Done closes through `Sheet.Close`,
// and the three callbacks land in Storage. `onPress` is the Done button's.
test("T-002 supports trigger opening and explicit close with consumer callbacks", async () => {
  const app = await openScenario("sheet/basic", { clock: {} });

  expect(app.shows(CONTENT)).toBe(false);
  await openSheet(app);
  expect(app.shows("text:Details")).toBe(true);

  await app.press("role:button[Done]");
  await app.waitFor(CONTENT, { state: "gone" });

  expect(callsOf(app, "closePress").length).toBe(1);
  expect(calls(app, "openChange")).toEqual([true, false]);
  expect(callsOf(app, "close").length).toBe(1);
});

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:56
// Rewritten (port sheet T-003): the controlled root starts open, a close
// request is reported but the panel stays, and the owner's in-panel “Set
// closed” control is the `rerender(isOpen={false})` that finally hides it. The
// control sits inside the panel because the open sheet's modal layer blocks
// every stage control, exactly as it does upstream.
test("T-003 supports controlled state without a trigger", async () => {
  const app = await openScenario("sheet/controlled", { clock: {} });

  expect(app.shows("text:Controlled content")).toBe(true);

  await app.press("role:button[Close]");
  expect(calls(app, "openChange")).toEqual([false]);
  expect(app.shows("text:Controlled content")).toBe(true);

  await app.press("role:button[Set closed]");
  await app.waitFor("text:Controlled content", { state: "gone" });
});

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:80
// Partial port (port sheet T-004): the ten `data-slot` lookups are D18
// deletions. Kept: both callback refs receive a view, the Content/Dialog test
// ids resolve, and the function children report `position="bottom"` (this side
// hands accessors over, hence the `.split` scenario).
test("T-004 forwards refs, DOM attributes, content render props, and slot hooks", async () => {
  const app = await openScenario("sheet/render-props.split", { clock: {} });

  await app.clock!.runFor(20);

  expect(app.shows("id:panel")).toBe(true);
  expect(app.shows("id:dialog")).toBe(true);
  expect(calls(app, "contentRef").every((hit) => hit === true)).toBe(true);
  expect(calls(app, "dialogRef").every((hit) => hit === true)).toBe(true);
  expect(app.shows("text:bottom")).toBe(true);
});

const SENTINELS: Array<{ name: string; label: string }> = [
  { name: "sheet/snap-sentinel-number", label: "1 (number)" },
  { name: "sheet/snap-sentinel-string", label: "1 (string)" },
  { name: "sheet/snap-sentinel-full", label: "100%" },
];

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:120
// Rewritten (port sheet T-005): the dropped `data-snap-points` attribute
// becomes the resting size — every spelling of the full-height sentinel leaves
// `[180, sentinel]` resting at 180.
for (const sentinel of SENTINELS) {
  test(`T-005 supports the trailing ${sentinel.label} full-height sentinel`, async () => {
    const app = await openScenario(sentinel.name, { clock: {} });

    await app.clock!.runFor(20);

    expect(Math.round(layout(app, "content").height)).toBe(180);
  });
}

const FULL_HEIGHT: Array<{ name: string; label: string }> = [
  { name: "sheet/full-none", label: "no snap points" },
  { name: "sheet/full-empty", label: "an empty list" },
  { name: "sheet/full-one", label: "[1]" },
  { name: "sheet/full-100", label: '["100%"]' },
];

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:127
// Rewritten (port sheet T-006): without a usable snap point the panel takes the
// full height and its Body scrolls.
for (const variant of FULL_HEIGHT) {
  test(`T-006 supports fully expanded sheets with ${variant.label}`, async () => {
    const app = await openScenario(variant.name, { clock: {} });

    await app.clock!.runFor(20);

    // No usable snap point: the panel takes as much height as it can and the
    // Body becomes the scroller (G-001 shows a content-sized panel when the
    // content is short; with 50 rows the `max-h-[calc(100%-2rem)]` cap applies).
    expect(layout(app, "content").height).toBeGreaterThan(HEIGHT * 0.9);
    await app.scroll("id:body", 200);
    expect(app.shows("role:button[Done]")).toBe(true);
  });
}

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:137
// Ported (port sheet T-007): Escape never closes a non-dismissable sheet; the
// CloseTrigger still does.
test("T-007 supports explicit closing when dismissal is disabled", async () => {
  const app = await openScenario("sheet/dismiss-locked", { clock: {} });

  await app.keyboard.press("escape");
  expect(app.shows(CONTENT)).toBe(true);

  await app.press("role:button[Dismiss sheet]");
  await app.waitFor(CONTENT, { state: "gone" });
});

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:147
// Ported (port sheet T-008): upstream mounts a bare sheet whose CloseTrigger
// sets no `aria-label`, so CloseButton's default name "Close" is the button the
// test presses; that button's own `onPress` runs once and the sheet closes.
test("T-008 calls a close-trigger consumer handler", async () => {
  const app = await openScenario("sheet/close-trigger", { clock: {} });

  await app.press("role:button[Close]");
  await app.waitFor(CONTENT, { state: "gone" });

  expect(callsOf(app, "closeTriggerPress").length).toBe(1);
});

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:165
// Partial port (port sheet T-009): the three DOM pointer callbacks are
// responder callbacks here; the five pointer callbacks and the `data-dragging`
// lookups have no NSH channel (§8). Kept: custom handle text, a one-point
// travel (upstream's `pointerMove` carries no movement; `app.drag` is the only
// step that reaches the responder channel and a zero delta never ends on the
// web host) that neither drags nor closes, and grant/move/release once per
// gesture.
test("T-009 calls consumer handle events and allows preventing a drag", async () => {
  const app = await openScenario("sheet/custom-handle", { clock: {} });

  await app.clock!.runFor(20);

  expect(app.shows("text:Custom grip")).toBe(true);

  await app.drag("id:handle", { x: 0, y: 1 });
  expect(callsOf(app, "grant").length).toBe(1);
  expect(callsOf(app, "move").length).toBe(1);
  expect(callsOf(app, "release").length).toBe(1);
  expect(app.shows(CONTENT)).toBe(true);

  await app.drag("id:handle", { x: 0, y: 10 });
  await app.clock!.runFor(20);

  expect(callsOf(app, "grant").length).toBe(2);
  expect(callsOf(app, "move").length).toBe(2);
  expect(callsOf(app, "release").length).toBe(2);
  expect(app.shows(CONTENT)).toBe(true);
});

// heroui/packages/react/tests/components/sheet/sheet.test.tsx:206
// Partial port (port sheet T-010): the “no parent throws” half has no render
// error channel in `nsh test` (§8). Kept: a NestedRoot inside a parent opens a
// second panel.
test("T-010 supports nested roots and rejects a nested root without a parent", async () => {
  const app = await openScenario("sheet/nested", { clock: {} });

  await app.clock!.runFor(20);
  expect(app.shows("text:Details")).toBe(true);

  await app.press("role:button[Nested]");
  await app.clock!.runFor(20);

  expect(app.shows("text:Nested details")).toBe(true);
  expect(app.shows("text:Nested content")).toBe(true);
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:166
// Partial port (port sheet T-011): focus containment, Tab, the document scroll
// lock and the focus restore have no query channel (host responsibility, §8).
// Kept: Escape closes and `onAnimationEnd` reports the enter then the exit.
test("T-011 supports focus containment, scroll lock, Escape dismissal, and lifecycle callbacks", async () => {
  const app = await openScenario("sheet/basic", { clock: {} });

  await openSheet(app);
  expect(calls(app, "animationEnd")).toEqual([true]);

  await app.keyboard.press("escape");
  await app.waitFor(CONTENT, { state: "gone" });

  expect(calls(app, "animationEnd")).toEqual([true, false]);
});

const PLACEMENTS = ["bottom", "top", "left", "right"] as const;

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:183
// Rewritten (port sheet T-012): the `data-position` attribute becomes the
// resting edge of the Content box (the edge-positioned parent of the Dialog,
// whose own `onLayout` frame is always `{0, 0}`); the handle drag closes, the
// reopened panel closes again through the CloseTrigger.
for (const placement of PLACEMENTS) {
  test(`T-012 supports ${placement} placement, explicit closing, and handle dismissal`, async () => {
    const app = await openScenario(`sheet/placement-${placement}`, { clock: {} });

    await openSheet(app);
    expectEdge(app, placement);

    await app.drag("id:handle", dragVector(placement));
    await app.waitFor(CONTENT, { state: "gone" });

    await openSheet(app);
    expect(app.shows(CONTENT)).toBe(true);

    await closeSheet(app);
    await app.waitFor(CONTENT, { state: "gone" });
  });
}

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:221
// Rewritten (port sheet T-013): CPU throttling has no counterpart, so the three
// open → drag close → reopen cycles run on the manual clock; the reopened panel
// still rests on its edge (the Content box, as in T-012) and the callback
// sequence stays open/close.
for (const placement of ["top", "left"] as const) {
  test(`T-013 supports settled ${placement} reopening after handle dismissal under CPU throttling`, async () => {
    const app = await openScenario(`sheet/placement-${placement}`, { clock: {} });

    for (let cycle = 1; cycle <= 3; cycle++) {
      await openSheet(app);
      expectEdge(app, placement);

      await app.drag("id:handle", dragVector(placement));
      await app.waitFor(CONTENT, { state: "gone" });

      await openSheet(app);
      expectEdge(app, placement);

      await closeSheet(app);
      await app.waitFor(CONTENT, { state: "gone" });

      expect(calls(app, "openChange")).toEqual(
        Array.from({ length: cycle * 4 }, (_, index) => index % 2 === 0),
      );
    }
  });
}

const SWIPES: Array<{ scenario: string; label: string; dx: number; dy: number }> = [
  { scenario: "sheet/swipe-right", label: "right", dx: 120, dy: 0 },
  { scenario: "sheet/swipe-left", label: "left", dx: -120, dy: 0 },
  { scenario: "sheet/swipe-top", label: "top", dx: 0, dy: -120 },
  { scenario: "sheet/swipe-horizontal", label: "horizontal (rightward)", dx: 120, dy: 0 },
  { scenario: "sheet/swipe-horizontal", label: "horizontal (leftward)", dx: -120, dy: 0 },
  { scenario: "sheet/swipe-vertical", label: "vertical (downward)", dx: 0, dy: 120 },
  { scenario: "sheet/swipe-vertical", label: "vertical (upward)", dx: 0, dy: -120 },
];

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:256
// Rewritten (port sheet T-014): the `swipeDirection` override decides the drag
// axis; the seven combinations all close and report `[true], [false]`. The
// scroll-lock assertion is dropped (§8).
for (const swipe of SWIPES) {
  test(`T-014 supports overridden ${swipe.label} handle dismissal`, async () => {
    const app = await openScenario(swipe.scenario, { clock: {} });

    await openSheet(app);
    await app.drag("id:handle", { x: swipe.dx, y: swipe.dy });
    await app.waitFor(CONTENT, { state: "gone" });

    expect(calls(app, "openChange")).toEqual([true, false]);
  });
}

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:285
// Rewritten (port sheet T-015): `[220, 1]` rests at 220, the Body is clipped
// and does not scroll before expansion (`app.scroll` rejects), and the upward
// handle drag reveals the full panel where the Body scrolls.
test("T-015 supports pixel snap points, legacy full-height sentinel, and body scrolling after expansion", async () => {
  const app = await openScenario("sheet/pixel-snap", { clock: {} });

  await app.clock!.runFor(20);
  expect(Math.round(layout(app, "content").height)).toBe(220);

  await expect(app.scroll("id:body", 80)).rejects.toThrow();

  await app.drag("id:handle", { x: 0, y: -(HEIGHT - 240) });
  await app.clock!.runFor(20);

  expect(Math.round(layout(app, "content").height)).toBe(HEIGHT);
  await app.scroll("id:body", 80);
  expect(app.shows("role:button[Done]")).toBe(true);
});

const VIEWPORTS: Array<[number, number]> = [
  [414, 896],
  [1280, 737],
];

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:306
// Rewritten (port sheet T-016): `getComputedStyle(maxHeight)` becomes the
// measured 0.95 × viewport height after expansion — the fixture states the cap
// as an inline `maxHeight: "95%"` (NSH's style channel takes a number or a
// percentage, and `max-h-[95vh]` is an unknown class) and carries 50 rows so the
// Body overflows the cap the way HeroUI's 40 paragraphs do — the wheel becomes
// `app.scroll`, and the panel stays visible.
for (const snaps of [false, true]) {
  for (const [width, height] of VIEWPORTS) {
    test(`T-016 supports wheel scrolling at ${width} × ${height} after full expansion (${snaps ? "with" : "without"} snap points)`, async () => {
      const app = await openScenario(snaps ? "sheet/expansion-snap" : "sheet/expansion", {
        clock: {},
        height,
        width,
      });

      await openSheet(app);
      if (snaps) {
        await app.drag("id:handle", { x: 0, y: -(height - 240) });
        await app.clock!.runFor(20);
      }

      expect(Math.abs(layout(app, "content").height - height * 0.95)).toBeLessThan(8);

      await app.scroll("id:body", 250);
      expect(app.shows("role:button[Done]")).toBe(true);
    });
  }
}

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:365
// Rewritten (port sheet T-017): four placements × two viewports with
// `isDetached`; the panel keeps a gap on all four edges of the viewport and the
// Body scrolls after the handle drag expands it.
for (const placement of PLACEMENTS) {
  for (const [width, height] of [
    [414, 640],
    [1280, 700],
  ] as const) {
    test(`T-017 supports full expansion and body scrolling at ${width} × ${height} (${placement})`, async () => {
      const app = await openScenario(`sheet/detached-expansion-${placement}`, {
        clock: {},
        height,
        width,
      });

      await app.clock!.runFor(20);
      const expand =
        placement === "bottom"
          ? { x: 0, y: -(height - 240) }
          : placement === "top"
            ? { x: 0, y: height - 240 }
            : placement === "left"
              ? { x: width - 240, y: 0 }
              : { x: -(width - 240), y: 0 };

      await app.drag("id:handle", expand);
      await app.clock!.runFor(20);

      const content = layout(app, "content");

      expect(content.x).toBeGreaterThan(0);
      expect(content.y).toBeGreaterThan(0);
      expect(content.x + content.width).toBeLessThan(width);
      expect(content.y + content.height).toBeLessThan(height);
      await app.scroll("id:body", 200);
      expect(app.shows("role:button[Done]")).toBe(true);
    });
  }
}

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:418
// Rewritten (port sheet T-018): `["40%", "100%"]` rests at 40% of the viewport.
test("T-018 supports percentage snap points", async () => {
  const app = await openScenario("sheet/percentage-snap", { clock: {} });

  await app.clock!.runFor(20);

  expect(Math.abs(layout(app, "content").height - HEIGHT * 0.4)).toBeLessThan(3);
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:458
// Partial port (port sheet T-020): the native touch dismissal outside the
// handle is left to the host's `closeOnSwipe` and checked by hand; the
// observable reverse behavior is kept — dragging on the Body scroll area does
// not dismiss the sheet, so the dialog is still in the tree (upstream's
// non-dismissable half, sheet.browser.test.tsx:465-470).
test("T-020 supports native touch dismissal outside the handle", async () => {
  const app = await openScenario("sheet/body-drag", { clock: {} });

  await app.clock!.runFor(20);
  await app.drag("id:body", { x: 0, y: 60 });
  await app.clock!.runFor(20);

  expect(app.shows("id:dialog")).toBe(true);
  expect(app.shows("role:button[Done]")).toBe(true);
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:465
// Ported (port sheet T-021): with `isDismissable={false}` neither Escape nor a
// handle drag closes the sheet; Done does.
test("T-021 supports non-dismissable sheets while allowing explicit close", async () => {
  const app = await openScenario("sheet/dismiss-locked", { clock: {} });

  await app.clock!.runFor(20);
  await app.keyboard.press("escape");
  await app.drag("id:handle", { x: 0, y: 120 });
  await app.clock!.runFor(20);

  expect(app.shows(CONTENT)).toBe(true);

  await app.press("role:button[Done]");
  await app.waitFor(CONTENT, { state: "gone" });
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:476
// Rewritten (port sheet T-022): reduced motion, detached layout (all four edges
// inset) and a handle drag that still dismisses.
test("T-022 supports detached layout and reduced-motion handle release", async () => {
  const app = await openScenario("sheet/detached", { clock: {}, reducedMotion: true });

  await app.clock!.runFor(20);
  const content = layout(app, "content");

  expect(content.x).toBeGreaterThan(0);
  expect(content.y).toBeGreaterThan(0);
  expect(content.x + content.width).toBeLessThan(WIDTH);
  expect(content.y + content.height).toBeLessThan(HEIGHT);

  await app.drag("id:handle", { x: 0, y: 120 });
  await app.waitFor(CONTENT, { state: "gone" });
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:491
// Partial port (port sheet T-023): focus restoration and the stack scale are
// dropped (host / R-002, §8). Kept: the parent survives the nested sheet, and
// the Nested trigger opens it again after the nested CloseTrigger closes it.
test("T-023 supports nested focus restoration and parent survival", async () => {
  const app = await openScenario("sheet/nested", { clock: {} });

  await app.clock!.runFor(20);

  await app.press("role:button[Nested]");
  await app.clock!.runFor(20);
  expect(app.shows("text:Nested details")).toBe(true);

  await app.press("role:button[Close]");
  await app.clock!.runFor(20);

  expect(app.shows("text:Nested details")).toBe(false);
  expect(app.shows("text:Details")).toBe(true);

  await app.press("role:button[Nested]");
  await app.clock!.runFor(20);
  expect(app.shows("text:Nested details")).toBe(true);
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:532
// Partial port (port sheet T-024): inert, node identity, activeElement and the
// scroll lock have no channel (§8). Kept: with `isExiting` on, closing keeps the
// subtree — the typed value survives the reopen — and `onAnimationEnd` reports
// enter, exit, enter.
test("T-024 supports retaining closed content without keeping the modal active", async () => {
  const app = await openScenario("sheet/retained", { clock: {} });

  await app.clock!.runFor(20);
  expect(app.shows("text:Details")).toBe(true);

  await app.clear("id:retained-input");
  await app.type("id:retained-input", "Preserved value");

  await closeSheet(app);
  expect(calls(app, "animationEnd")).toEqual([true, false]);

  await openSheet(app);
  expect(app.value("id:retained-input")).toBe("Preserved value");
  expect(calls(app, "animationEnd")).toEqual([true, false, true]);
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:581
// Partial port (port sheet T-025): `data-stack-index` and the backdrop's
// computed background are dropped (no attribute/computed-style channel, §8).
// Kept: after the retained sheet closes a second sheet opens and closes (the
// stage's own "Show second" / "Hide second" controls stand in for the
// `rerender` calls, so they carry no name the panels also use), and reopening
// the first one still has its value.
test("T-025 supports a new sheet backdrop after a retained sheet closes", async () => {
  const app = await openScenario("sheet/stacked", { clock: {} });

  await app.clock!.runFor(20);
  await app.clear("id:saved-input");
  await app.type("id:saved-input", "Saved value");

  await closeSheet(app);
  expect(calls(app, "firstAnimationEnd")).toEqual([true, false]);

  await app.press("role:button[Show second]");
  await app.clock!.runFor(20);
  expect(app.shows("text:Second sheet")).toBe(true);

  await app.press("role:button[Hide second]");
  await app.clock!.runFor(20);
  expect(app.shows("text:Second sheet")).toBe(false);

  await app.press("role:button[Open first]");
  await app.clock!.runFor(20);

  expect(app.value("id:saved-input")).toBe("Saved value");
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:617
// Partial port (port sheet T-026): `isConnected`, node identity and the scroll
// lock are dropped (§8). Kept for both reduced-motion values: releasing
// `isExiting` unmounts the subtree (the fixture's cleanup probe), a second sheet
// opens, and reopening rebuilds the content.
for (const reduce of [false, true]) {
  test(`T-026 supports releasing retained content and effects (reduced motion: ${reduce})`, async () => {
    const app = await openScenario("sheet/retained", { clock: {}, reducedMotion: reduce });

    await app.clock!.runFor(20);
    expect(calls(app, "animationEnd")).toEqual([true]);

    await closeSheet(app);
    expect(calls(app, "animationEnd")).toEqual([true, false]);
    expect(callsOf(app, "cleanup").length).toBe(0);

    await app.press("role:button[Release content]");
    await app.clock!.runFor(20);
    expect(callsOf(app, "cleanup").length).toBe(1);

    await app.press("role:button[Show second]");
    await app.clock!.runFor(20);
    expect(app.shows("text:Second sheet")).toBe(true);

    await app.press("role:button[Hide second]");
    await app.press("role:button[Open sheet]");
    await app.clock!.runFor(20);

    expect(calls(app, "animationEnd")).toEqual([true, false, true]);
    expect(app.value("id:retained-input")).toBe("Keep me");
    expect(callsOf(app, "cleanup").length).toBe(1);
  });
}

const RETAINED_SNAPS: Array<{
  scenario: string;
  label: string;
  horizontal: boolean;
}> = [
  { scenario: "sheet/retained-snap-bottom", label: "bottom", horizontal: false },
  { scenario: "sheet/retained-snap-top", label: "top", horizontal: false },
  { scenario: "sheet/retained-snap-left", label: "left", horizontal: true },
  { scenario: "sheet/retained-snap-right", label: "right", horizontal: true },
  { scenario: "sheet/retained-snap-bottom-left", label: "bottom with a left swipe", horizontal: true },
  { scenario: "sheet/retained-snap-bottom-right", label: "bottom with a right swipe", horizontal: true },
];

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:672
// Partial port (port sheet T-027): the “closed width is 0” retention layout,
// the scroll lock and node identity are dropped (§8). Kept: the panel rests at
// the 100-point snap, closing it retains the content, and reopening restores
// the same rest position and size.
for (const reduce of [false, true]) {
  for (const snap of RETAINED_SNAPS) {
    test(`T-027 supports closing and restoring the partial ${snap.label} snap point (reduced motion: ${reduce})`, async () => {
      const app = await openScenario(snap.scenario, { clock: {}, reducedMotion: reduce });

      await app.clock!.runFor(20);
      const initial = layout(app, "content");

      expect(Math.abs((snap.horizontal ? initial.width : initial.height) - 100)).toBeLessThan(2);

      await closeSheet(app);
      expect(calls(app, "animationEnd")).toEqual([true, false]);

      await openSheet(app);
      const restored = layout(app, "content");

      expect(Math.abs(restored.x - initial.x)).toBeLessThan(2);
      expect(Math.abs(restored.y - initial.y)).toBeLessThan(2);
      expect(Math.abs((snap.horizontal ? restored.width : restored.height) - 100)).toBeLessThan(2);
      expect(calls(app, "animationEnd")).toEqual([true, false, true]);
    });
  }
}

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:727
// Partial port (port sheet T-028): the scroll-progress and scroll-lock
// assertions are dropped (§8). Reopen: the in-panel Blink closes and reopens on
// the next turn, so only the enter completions arrive. Unmount: closing and
// dropping the subtree on the next turn leaves enter then exit.
test("T-028 supports reopen during a retained partial-snap exit", async () => {
  const app = await openScenario("sheet/retained-exit", { clock: {} });

  await app.clock!.runFor(20);
  expect(Math.round(layout(app, "content").height)).toBe(200);

  await app.press("role:button[Blink]");
  await app.clock!.runFor(40);

  expect(app.shows("text:Details")).toBe(true);
  expect(Math.round(layout(app, "content").height)).toBe(200);
  expect(calls(app, "animationEnd")).toEqual([true, true]);
});

test("T-028 supports unmount during a retained partial-snap exit", async () => {
  const app = await openScenario("sheet/retained-exit", { clock: {} });

  await app.clock!.runFor(20);

  await app.press("role:button[Close and unmount]");
  await app.clock!.runFor(40);

  expect(app.shows("text:Details")).toBe(false);
  expect(calls(app, "animationEnd")).toEqual([true, false]);
  await app.press("role:button[Ping]");
  expect(callsOf(app, "ping").length).toBe(1);
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:770
// Rewritten (port sheet T-029): upstream mounts the sheet open and interrupts
// that first enter before it completes, so `onAnimationEnd` has not been called
// when the close arrives. The harness settles a mount's enter before a test can
// act (T-024 relies on that same enter), so the fixture starts closed and
// "Blink open" performs the identical interrupted opening one step later: it
// opens, then closes on the next turn, and only the exit completion arrives.
// The non-retained sheet unmounts; the retained one reopens with its content.
for (const retain of [false, true]) {
  test(`T-029 calls exit completion when opening is interrupted (retained: ${retain})`, async () => {
    const app = await openScenario(retain ? "sheet/retained-closed" : "sheet/retained-reset", { clock: {} });

    await app.press("role:button[Blink open]");
    await app.clock!.runFor(40);

    expect(calls(app, "animationEnd")).toEqual([false]);

    if (retain) {
      await openSheet(app);
      expect(app.shows("text:Retained body")).toBe(true);
      expect(app.value("id:retained-input")).toBe("Keep me");
    } else {
      expect(app.shows("text:Retained body")).toBe(false);
      expect(app.shows("text:Details")).toBe(false);
    }
  });
}

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:793
// Rewritten (port sheet T-030): three rapid interrupted retained openings from
// a closed fixture (as in T-029, the mount's own enter is settled by the
// harness); the enter completion only arrives on the last, settled one.
test("T-030 calls exit completion for consecutive interrupted retained openings", async () => {
  const app = await openScenario("sheet/retained-closed", { clock: {} });

  await app.press("role:button[Blink open]");
  await app.clock!.runFor(40);
  expect(calls(app, "animationEnd")).toEqual([false]);

  await app.press("role:button[Blink open]");
  await app.clock!.runFor(40);
  expect(calls(app, "animationEnd")).toEqual([false, false]);

  await openSheet(app);
  expect(calls(app, "animationEnd")).toEqual([false, false, true]);
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:815
// Partial port (port sheet T-031): the frame-level position comparison is
// dropped (no frame geometry channel). Kept: with reduced motion, retained
// content reopens and the callback sequence is enter, exit, enter.
test("T-031 supports reduced motion when retained content reopens", async () => {
  const app = await openScenario("sheet/retained", { clock: {}, reducedMotion: true });

  await app.clock!.runFor(20);
  expect(calls(app, "animationEnd")).toEqual([true]);

  await closeSheet(app);
  expect(calls(app, "animationEnd")).toEqual([true, false]);

  await openSheet(app);
  expect(calls(app, "animationEnd")).toEqual([true, false, true]);
});

// kobalte/packages/core/src/dialog/dialog.test.tsx:14
// Partial port (port sheet T-046): the title text and the heading level are
// kept; the aria-labelledby id relation has no NSH channel (§8).
test("T-046 should be labelled by its dialog title", async () => {
  const app = await openScenario("sheet/labelled", { clock: {} });

  await app.clock!.runFor(20);

  expect(app.shows("text:title")).toBe(true);
  expect(app.shows("role:header[title]")).toBe(true);
});

// kobalte/packages/core/src/dialog/dialog.test.tsx:29
// Partial port (port sheet T-047): the description text inside the Body is
// kept; Sheet has no Description part, so it is an ordinary child, and the
// aria-describedby relation is dropped (§8).
test("T-047 should be described by its dialog description", async () => {
  const app = await openScenario("sheet/labelled", { clock: {} });

  await app.clock!.runFor(20);

  expect(app.shows("text:description")).toBe(true);
});
