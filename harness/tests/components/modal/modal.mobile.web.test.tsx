import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only half of adapt-sheets/modal.md M-005 (A-004): the "short pull
 * released gently settles back" assertion. `app.drag` moves the finger 10 pt
 * per display frame, so the release velocity scales with the drag's frame
 * count — dy=60 flings past the 500 pt/s dismiss bound and dismisses on both
 * targets (the headless file's dismiss half), while dy≤25 stays under it and
 * settles back. Measured by the alert-dialog unit's M-005: dy=28 dismisses,
 * dy=20 settles, headless and web alike — so this file's pull uses dy=20 to
 * keep the settle branch reachable everywhere, pinned to `platform:"web"`
 * per the file-naming convention (the headless file owns the dismiss half).
 */

type SwipeRecord = {
  presentation: string;
  panKeys: number;
  offset: number;
  atTop: boolean | null;
};

function openModal(): Promise<App> {
  return open("../../../modal.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    clock: {},
    host: {
      params: {
        case: "basic",
        scope: "touch-compact",
        dismissable: "1",
        swipeable: "1",
      },
    },
  });
}

/** The shared file's default-shape open, pinned to web so `platform`,
 * `width` and the size-axis measurement stay legal. */
function openModalPointer(
  params: Record<string, string | number | boolean> = {},
): Promise<App> {
  return open("../../../modal.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    clock: {},
    host: { params: { case: "basic", scope: "pointer", ...params } },
  });
}

type LayoutRecord = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function lastLayout(app: App, name: string): LayoutRecord {
  const records = callsOf(app, "layout")
    .map((args) => args[0] as LayoutRecord)
    .filter((record) => record.name === name);
  const last = records.at(-1);

  if (!last) throw new Error(`no layout record for ${name}`);

  return last;
}

/** The dialog's box in screen coordinates: container origin + dialog origin. */
function absDialog(app: App): { width: number } {
  const dialog = lastLayout(app, "dialog");

  return { width: dialog.width };
}

function swipeRecords(app: App): SwipeRecord[] {
  return callsOf(app, "swipe").map((args) => args[0] as SwipeRecord);
}

function lastSwipe(app: App): SwipeRecord {
  const records = swipeRecords(app);
  const last = records.at(-1);

  if (!last) throw new Error("no swipe probe record");

  return last;
}

describe("modal mobile (web)", () => {
  // adapt-sheets/modal.md M-005 (A-004): a pull below the half-height bound
  // released gently settles back — the card stays, the offset returns to
  // rest. The engagement and the distance-bound dismiss run on both targets
  // in modal.mobile.test.tsx.
  test("M-005 swipeable sheet on web: short pull settles back to rest", async () => {
    const app = await openModal();

    await app.clock?.runFor(400);

    await app.drag("id:mo-card", { y: 20 });
    await app.clock?.runFor(400);

    const swipes = swipeRecords(app);
    // The gesture engaged and displaced the card mid-drag…
    expect(swipes.some((record) => record.panKeys > 0)).toBe(true);
    expect(swipes.some((record) => record.offset > 0)).toBe(true);
    // …then the gentle release settled: offset back to 0, card still open,
    // no close requested.
    expect(lastSwipe(app).offset).toBe(0);
    expect(app.shows("id:mo-card")).toBe(true);
    expect(
      callsOf(app, "openChange").filter((args) => args[0] === false),
    ).toEqual([]);
  }, 90_000);

  // adapt-sheets/modal.md M-009 (baseline), the `size` axis: the max-w caps
  // are observable as distinct widths only past 512 pt of window — on a
  // phone-width screen every cap clamps to the same box, so the ordering
  // half lives here (measured on the pinned host: xs 320, sm 384, md 448,
  // lg 512, cover 944, full 1024 — the sm/md/lg run pins the ordering;
  // cover/full are the w-full extremes).
  test("M-009 baseline (web): the size axis keeps the sm/md/lg ordering", async () => {
    const widths: Record<string, number> = {};
    for (const size of ["sm", "md", "lg"] as const) {
      const sized = await openModalPointer({ size });
      await sized.clock?.runFor(400);
      widths[size] = absDialog(sized).width;
    }
    expect(widths.sm).toBeLessThan(widths.md);
    expect(widths.md).toBeLessThan(widths.lg);
    expect(widths.md).toBeGreaterThan(400);
    expect(widths.md).toBeLessThan(500);
  }, 90_000);
});
