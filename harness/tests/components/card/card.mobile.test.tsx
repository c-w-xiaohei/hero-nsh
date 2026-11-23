import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the card adapt unit, one test per row of
 * adapt-sheets/card.md §4 (M-001…M-005). The fixture is
 * `harness/card.fixtures.tsx`: case "mobile" mounts the measured card
 * (Header / Content / Footer with `onLayout` box probes on every part and on
 * two fixed-height children inside Content) under `EnvironmentScope` driven
 * by `host.params.input` / `host.params.density`; `host.params.press === "1"`
 * attaches the caller `onPress` probe to the root. "mobile-variants" mounts
 * the four `variant` values under the same scope.
 *
 * The environment axes are always explicit: `input:"pointer"` is the
 * desktop-parity baseline every assertion compares against and
 * `input:"touch"` the injected mobile half, because the host-derived
 * default differs per target (touch on ios/android, pointer on desktop
 * and web). No `platform`/`width` open options — native targets fill the
 * device screen and reject them. The observation
 * channel is what `nsh/test` sees: `onLayout` bounds records for the
 * density/input axis checks, `spanStyle` for the typography the density axis
 * must not move, `app.storage()` probe calls for the `onPress` pass-through,
 * and `viewStyle` for the variant backgrounds.
 *
 * `spanStyle` exposes no line height, so the "行高不变" half of M-001/M-003
 * degrades to the observable typography (fontSize / fontWeight / color).
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
  press?: boolean;
};

function openCard(caseName: string, env: EnvParams = {}): Promise<App> {
  return open("../../../card.fixtures.tsx", {
    host: {
      params: {
        case: caseName,
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
        ...(env.press ? { press: "1" } : {}),
      },
    },
  });
}

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

/** The last box a probe name reported (onLayout can fire more than once). */
function boxOf(app: App, name: string): Box {
  const matches = boxes(app).filter((box) => box.name === name);
  const box = matches[matches.length - 1];

  if (box === undefined) {
    throw new Error(`no layout box reported for "${name}"`);
  }

  return box;
}

const MOBILE_BOXES = [
  "root",
  "header",
  "content",
  "content-a",
  "content-b",
  "footer",
  "footer-a",
];

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App): Promise<void> {
  await app.waitUntil(() =>
    MOBILE_BOXES.every((name) => boxes(app).some((box) => box.name === name)),
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

function bottom(box: Box): number {
  return box.y + box.height;
}

/**
 * The root's padding, one edge per call, in points. `onLayout` bounds are
 * parent-relative: a child's `x`/`y` is already its distance from the root's
 * top-left corner, so the top/left pads read straight off the first child's
 * origin and the bottom/right pads measure the last child's far edge against
 * the root's own size.
 */
function padding(app: App): { top: number; left: number; right: number; bottom: number } {
  const root = boxOf(app, "root");
  const header = boxOf(app, "header");
  const footer = boxOf(app, "footer");

  return {
    top: Math.round(header.y),
    left: Math.round(header.x),
    right: Math.round(root.width - (footer.x + footer.width)),
    bottom: Math.round(root.height - (footer.y + footer.height)),
  };
}

/** The gap between the root's flex-column blocks (Header→Content, Content→Footer). */
function blockGaps(app: App): number[] {
  const header = boxOf(app, "header");
  const content = boxOf(app, "content");
  const footer = boxOf(app, "footer");

  return [
    Math.round(content.y - bottom(header)),
    Math.round(footer.y - bottom(content)),
  ];
}

/** The gap between the two fixed-height children inside Card.Content. */
function contentGap(app: App): number {
  const a = boxOf(app, "content-a");
  const b = boxOf(app, "content-b");

  return Math.round(b.y - bottom(a));
}

/* Resolved on the harness theme (theme/hero-nsh.theme.json), same constants
 * card.heroui.test.tsx pins for the title/description slots. */
const FOREGROUND = "#18181bff";
const MUTED = "#71717aff";

describe("card mobile", () => {
  // adapt-sheets/card.md M-001 (A-001, A-002, A-003): default environment
  // (desktop pin) — the layout probes record the pre-migration values
  // verbatim: root padding 16pt on every edge, the gap between adjacent
  // blocks 12pt, the Content slot's inner gap 4pt; the title/description
  // text styles are the ones the existing heroui test pins (density must
  // not move typography).
  test("M-001 default environment: padding 16, block gap 12, content gap 4, typography unchanged", async () => {
    const app = await openCard("mobile", { input: "pointer" });
    await settleLayout(app);

    expect(padding(app)).toEqual({ top: 16, left: 16, right: 16, bottom: 16 });
    expect(blockGaps(app)).toEqual([12, 12]);
    expect(contentGap(app)).toBe(4);

    const title = app.spanStyle("text:Mobile title");
    expect(title.fontSize).toBe(14);
    expect(title.fontWeight).toBe(500);
    expect(title.color).toBe(FOREGROUND);

    const description = app.spanStyle("text:Mobile description");
    expect(description.fontSize).toBe(14);
    expect(description.color).toBe(MUTED);
  }, 120_000);

  // adapt-sheets/card.md M-002 (A-001, A-002): `density="compact"` tightens
  // each spacing literal one step — padding 12pt, block gap 8pt, content gap
  // 2pt — while the painted half (title/description color and size) stays
  // exactly what the default environment resolved.
  test("M-002 compact density: padding 12, block gap 8, content gap 2, paint unchanged", async () => {
    const compact = await openCard("mobile", {
      input: "pointer",
      density: "compact",
    });
    const plain = await openCard("mobile", { input: "pointer" });
    await settleLayout(compact);
    await settleLayout(plain);

    expect(padding(compact)).toEqual({ top: 12, left: 12, right: 12, bottom: 12 });
    expect(blockGaps(compact)).toEqual([8, 8]);
    expect(contentGap(compact)).toBe(2);

    for (const label of ["Mobile title", "Mobile description"]) {
      const before = spanStyleOf(plain, label);
      const after = spanStyleOf(compact, label);

      expect(after.color).toBe(before.color);
      expect(after.fontSize).toBe(before.fontSize);
      expect(after.fontWeight).toBe(before.fontWeight);
    }
  }, 120_000);

  // adapt-sheets/card.md M-003 (A-003): the density axis owns spacing only —
  // under `compact` the title and description keep the default environment's
  // resolved text style member for member (spanStyle exposes no line height;
  // fontSize/fontWeight/color are the observable typography).
  test("M-003 compact density: title and description text style equals default", async () => {
    const compact = await openCard("mobile", {
      input: "pointer",
      density: "compact",
    });
    const plain = await openCard("mobile", { input: "pointer" });

    for (const label of ["Mobile title", "Mobile description"]) {
      expect(spanStyleOf(compact, label)).toEqual(spanStyleOf(plain, label));
    }
  }, 120_000);

  // adapt-sheets/card.md M-004 (基线, A-005): the press pass-through contract
  // is environment-independent — a caller `onPress` on the root fires exactly
  // once per press with no duplicate, a card without one renders normally,
  // and the four variants keep their backgrounds (the bg slot did not move;
  // `transparent` still resolves no backgroundColor).
  test("M-004 baseline: onPress fires once per press, no-press card renders, variants keep backgrounds", async () => {
    const app = await openCard("mobile", { input: "pointer", press: true });

    await app.press("id:card-mobile");
    expect(callsOf(app, "onPress")).toHaveLength(1);

    await app.press("id:card-mobile");
    expect(callsOf(app, "onPress")).toHaveLength(2);

    const quiet = await openCard("mobile", { input: "pointer" });
    expect(quiet.shows("id:card-mobile")).toBe(true);
    expect(quiet.texts()).toContain("Mobile title");
    expect(quiet.texts()).toContain("Mobile description");

    const variants = await openCard("mobile-variants", { input: "pointer" });
    for (const name of ["default", "secondary", "tertiary", "transparent"]) {
      expect(variants.shows(`id:card-v-${name}`)).toBe(true);
    }

    const painted = variants.viewStyle("id:card-v-default");
    expect(typeof painted?.backgroundColor).toBe("string");
    expect(painted?.backgroundColor).not.toBe("");

    const clear = variants.viewStyle("id:card-v-transparent");
    expect(clear?.backgroundColor ?? null).toBe(null);
  }, 120_000);

  // adapt-sheets/card.md M-005 (A-004, A-005): `input="touch"` with density
  // untouched must not move a single box — the table has no `input` axis, so
  // every probed bound equals the pointer environment's — and the `onPress`
  // pass-through still fires once per press (feedback composition is the
  // caller's PressableFeedback, never the card's). The root's
  // `focusable={false}` form has no `nsh/test` read-back; the layout and
  // callback halves are what this row can observe.
  test("M-005 injected touch: identical layout boxes and unchanged onPress pass-through", async () => {
    const touch = await openCard("mobile", { input: "touch", press: true });
    const pointer = await openCard("mobile", {
      input: "pointer",
      press: true,
    });

    await settleLayout(touch);
    await settleLayout(pointer);

    expect(boxSet(touch)).toEqual(boxSet(pointer));

    await touch.press("id:card-mobile");
    expect(callsOf(touch, "onPress")).toHaveLength(1);

    await pointer.press("id:card-mobile");
    expect(callsOf(pointer, "onPress")).toHaveLength(1);
  }, 120_000);
});

/** `spanStyle` of the text `label`, for cross-app comparison. */
function spanStyleOf(app: App, label: string) {
  return app.spanStyle(`text:${label}`);
}
