import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the breadcrumbs adapt unit, one test per row of
 * adapt-sheets/breadcrumbs.md §4 (M-001…M-006). The fixture is
 * `harness/breadcrumbs.fixtures.tsx`: case "links" mounts the probed row
 * (two links + a current item) under `EnvironmentScope` driven by
 * `host.params.input` / `host.params.density`; "disabled" is the same row
 * with `isDisabled`.
 *
 * Absent params leave the host-derived environment — pointer + default
 * density on headless and web — which is the desktop-parity baseline every
 * assertion compares against. `platform:"windows"` is the pointer host both
 * targets share (the sheet.mobile.test.tsx convention). The observation
 * channel is what `nsh/test` sees: `spanStyle` for the resolved underline,
 * `enabled` for the disabled contract, `app.storage()` probe calls for the
 * onAction/onPress order, and `onLayout` bounds records for the
 * density/input axis checks.
 */

type Box = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EnvParams = {
  input?: "pointer" | "touch";
  density?: "default" | "compact";
};

function openMobile(caseName: string, env: EnvParams = {}): Promise<App> {
  return open("../../../breadcrumbs.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    host: {
      params: {
        case: caseName,
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App): Promise<void> {
  await app.waitUntil(() =>
    ["root", "item-home", "item-products", "item-current", "separator"].every(
      (name) => boxes(app).some((box) => box.name === name),
    ),
  );
}

/**
 * name → sorted unique bounds. onLayout can fire more than once per view;
 * comparing the set of distinct boxes keeps repeat firings honest without
 * depending on how many frames the layout took.
 */
function boxSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const box of boxes(app)) {
    const key = JSON.stringify({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    });
    (groups[box.name] ??= new Set()).add(key);
  }
  const out: Record<string, string[]> = {};
  for (const [name, set] of Object.entries(groups)) {
    out[name] = [...set].sort();
  }
  return out;
}

/** The base row gap: space between consecutive item boxes, in points. */
function rowGaps(app: App): number[] {
  const items = boxes(app)
    .filter((box) => box.name.startsWith("item-"))
    .sort((a, b) => a.x - b.x);
  const gaps: number[] = [];
  for (let index = 1; index < items.length; index += 1) {
    const previous = items[index - 1]!;
    const current = items[index]!;
    gaps.push(Math.round(current.x - (previous.x + previous.width)));
  }
  return gaps;
}

/** The separator slot's box, reported by the fixture's filling child. */
function separatorBox(app: App): { width: number; height: number } {
  const separator = boxes(app).find((box) => box.name === "separator")!;
  return {
    width: Math.round(separator.width),
    height: Math.round(separator.height),
  };
}

describe("breadcrumbs mobile", () => {
  // adapt-sheets/breadcrumbs.md M-001 (A-001): pointer baseline — the link
  // slot keeps `hover:underline`, so hovering a non-current item underlines
  // its label; the touch cell removes that dependency (M-002).
  test("M-001 default pointer environment: hovering a non-current link underlines it", async () => {
    const app = await openMobile("links");

    const home = "id:item-home >> text:Home";
    expect(app.spanStyle(home).underline).toBe(false);

    await app.hover("role:link[Home]");

    expect(app.spanStyle(home).underline).toBe(true);
  });

  // adapt-sheets/breadcrumbs.md M-002 (A-001, A-003): injected touch — the
  // press fires the unchanged chain (`onAction` with the item's key, then
  // the caller's `onPress`) and leaves no hover underline behind: web's
  // sticky hover has no `hover:underline` class to stick to, and headless
  // has no hover at all. The current item stays disabled.
  test("M-002 injected touch: press fires onAction, no hover underline remains, current stays disabled", async () => {
    const app = await openMobile("links", { input: "touch" });

    await app.press("role:link[Home]");

    expect(callsOf(app, "onAction")).toEqual([["home"]]);
    expect(callsOf(app, "onPress")).toHaveLength(1);
    expect(app.spanStyle("id:item-home >> text:Home").underline).toBe(false);
    expect(app.enabled("role:link[Laptop]")).toBe(false);
  });

  // adapt-sheets/breadcrumbs.md M-003 (A-003, baseline): the press order is
  // root `onAction(key)` then the caller's `onPress`, once per press — a
  // second press replays neither and the order never swaps.
  test("M-003 default environment: onAction precedes onPress once per press", async () => {
    const app = await openMobile("links");

    await app.press("role:link[Home]");
    await app.press("role:link[Products]");

    const chain = calls(app)
      .filter((call) => call.name === "onAction" || call.name === "onPress")
      .map((call) => call.name);

    expect(chain).toEqual(["onAction", "onPress", "onAction", "onPress"]);
    expect(callsOf(app, "onAction")).toEqual([["home"], ["products"]]);
  });

  // adapt-sheets/breadcrumbs.md M-004 (baseline): the last item is the
  // current page — link-coloured and unusable — and `isDisabled` disables
  // every link. The existing .heroui/.kobalte files keep pinning the same
  // desktop contract; this asserts it on the fixture's own row.
  test("M-004 baseline: last item is current and isDisabled disables every link", async () => {
    const app = await openMobile("links");

    expect(app.spanStyle("id:item-current >> text:Laptop").color).not.toBe(
      app.spanStyle("id:item-home >> text:Home").color,
    );
    expect(app.enabled("role:link[Laptop]")).toBe(false);

    const disabled = await openMobile("disabled");

    for (const label of ["Home", "Products", "Laptop"]) {
      expect(disabled.enabled(`role:link[${label}]`)).toBe(false);
    }
  });

  // adapt-sheets/breadcrumbs.md M-005 (A-002): `density` owns the gap and
  // separator literals — `compact` tightens the row gap and the separator
  // box one step (gap-1.5→gap-1, size-3→size-2.5), and an explicit
  // `density="default"` scope resolves to the same boxes as no scope.
  test("M-005 density compact shrinks the row gap and the separator box; explicit default matches", async () => {
    const compact = await openMobile("links", { density: "compact" });
    const plain = await openMobile("links");
    const explicit = await openMobile("links", { density: "default" });

    await settleLayout(compact);
    await settleLayout(plain);
    await settleLayout(explicit);

    // 现值: gap-1.5 = 6pt between item boxes, size-3 = 12×12 separator.
    expect(rowGaps(plain)).toEqual([6, 6]);
    expect(separatorBox(plain)).toEqual({ width: 12, height: 12 });

    // compact: gap-1 = 4pt, size-2.5 = 10×10 — strictly tighter.
    expect(rowGaps(compact)).toEqual([4, 4]);
    expect(separatorBox(compact)).toEqual({ width: 10, height: 10 });

    // An explicit default scope lays out exactly like the uninjected one.
    expect(boxSet(explicit)).toEqual(boxSet(plain));
  });

  // adapt-sheets/breadcrumbs.md M-006 (A-001, A-002): `input="touch"` with
  // density untouched must not move a single box — the input axis carries
  // interaction usability only (the hit area's hitSlop is the Link's, asserted
  // by the link unit), so root/item/link/separator bounds equal the pointer
  // environment's. The `link-*` probes are the label Texts inside each Link;
  // the item box already contains link + separator.
  test("M-006 injected touch changes no laid-out box", async () => {
    const touch = await openMobile("links", { input: "touch" });
    const pointer = await openMobile("links");

    await settleLayout(touch);
    await settleLayout(pointer);

    expect(boxSet(touch)).toEqual(boxSet(pointer));
  });
});
