import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the icons adapt unit, one test per row of
 * adapt-sheets/icons.md §4 (M-001…M-006). The fixture is
 * `harness/icons.fixtures.tsx`: case "mobile" mounts all sixteen icons with
 * `onLayout` probes plus the `size`/`class-name` override boxes under
 * `EnvironmentScope`, driven by `host.params.input` / `host.params.density`.
 *
 * Action A keeps every seam point 保留: the icons have no tv() table, no
 * gestures and no presentation host, so every injected-environment assertion
 * is an equality check — same testIDs, same bounds, same override order as
 * the desktop-parity baseline. The axes are always explicit:
 * `input:"pointer"` is that baseline and `input:"touch"` the injected
 * mobile half, because the host-derived default differs per target (touch
 * on ios/android, pointer on desktop and web). No `platform`/`width` open
 * options: native targets fill the device screen and reject them.
 */

type LayoutCall = {
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

function openMobile(env: EnvParams = {}): Promise<App> {
  return open("../../../icons.fixtures.tsx", {
    locale: "en-US",
    clock: {},
    host: {
      params: {
        case: "mobile",
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

/** name → sorted unique bounds, so repeat onLayout firings stay honest. */
function boxSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const args of callsOf(app, "layout")) {
    const box = args[0] as LayoutCall;
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

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App): Promise<void> {
  await app.waitUntil(() =>
    [...ICON_SIZES.map(([name]) => name), "size-props", "class-name"].every(
      (name) => callsOf(app, "layout").some((args) => (args[0] as LayoutCall).name === name),
    ),
  );
}

/** icon name → default square side, the sheet's per-icon size contract. */
const ICON_SIZES: [string, number][] = [
  ["icon-chevron-down", 16],
  ["icon-chevron-up", 16],
  ["icon-chevron-left", 16],
  ["icon-chevron-right", 16],
  ["icon-external-link", 9],
  ["icon-circle-dashed", 16],
  ["icon-close", 16],
  ["icon-info", 16],
  ["icon-warning", 16],
  ["icon-danger", 16],
  ["icon-success", 16],
  ["icon-minus", 16],
  ["icon-plus", 16],
  ["icon-search", 16],
  ["icon-calendar", 16],
  ["icon-check", 10],
];

describe("icons mobile", () => {
  // adapt-sheets/icons.md M-001 (基线): the desktop environment lays out the
  // per-icon default boxes — 16×16 for the fourteen `h-4 w-4` icons, 9×9 for
  // ExternalLinkIcon, 10×10 for IconCheck (`size-2.5`) — and each renders
  // under exactly the testID `icons.test.tsx` S-001 asserts. The fixed
  // default box is the ported SVG width/height contract, not a density
  // literal (A-001).
  test("M-001 default environment: every icon shows under its testID at its default size", async () => {
    const app = await openMobile({ input: "pointer" });
    await settleLayout(app);

    const boxes = boxSet(app);
    for (const [id, size] of ICON_SIZES) {
      expect(app.shows(`id:${id}`)).toBe(true);
      expect(app.count(`id:${id}`)).toBe(1);

      const keys = boxes[id]!;
      expect(keys).toHaveLength(1);
      // Native layout reports fractional-px bounds (Android measured
      // 52.1905/27.8095 for 52/28pt elsewhere): each icon's default square
      // is a contract asserted within a 0.25pt quantization window.
      const box = JSON.parse(keys[0]!) as { width: number; height: number };
      expect(Math.abs(box.width - size)).toBeLessThan(0.25);
      expect(Math.abs(box.height - size)).toBeLessThan(0.25);
    }
  });

  // adapt-sheets/icons.md M-002 (基线): the size-override order is untouched
  // — an explicit `width`/`height` pair wins over the default class
  // (24×12), and a caller `className` written after the default class wins
  // over it (size-3 → 12×12). Both probes share the mobile row so the check
  // runs under the same environment as M-001.
  test("M-002 default environment: width/height and className override the default box", async () => {
    const app = await openMobile({ input: "pointer" });
    await settleLayout(app);

    const boxes = boxSet(app);

    // Same fractional-px bound as M-001: exact override boxes ±0.25pt.
    const sized = JSON.parse(boxes["size-props"]![0]!) as { width: number; height: number };
    expect(Math.abs(sized.width - 24)).toBeLessThan(0.25);
    expect(Math.abs(sized.height - 12)).toBeLessThan(0.25);

    const classed = JSON.parse(boxes["class-name"]![0]!) as { width: number; height: number };
    expect(Math.abs(classed.width - 12)).toBeLessThan(0.25);
    expect(Math.abs(classed.height - 12)).toBeLessThan(0.25);
  });

  // adapt-sheets/icons.md M-003 (A-001…A-003): `EnvironmentScope
  // input="touch"` leaves the whole row identical — the icons read no `input`
  // axis (there is no tv() table to feed it to), so every testID and every
  // bounds set equals the pointer environment's, box for box.
  test("M-003 injected touch: identical testIDs and bounds to the pointer environment", async () => {
    // Snapshot the touch app fully before the next open: a native open
    // relaunches the single host and invalidates every earlier App.
    const touch = await openMobile({ input: "touch" });
    await settleLayout(touch);
    const touchTexts = touch.texts();
    const touchBoxes = boxSet(touch);
    const touchPresence = ICON_SIZES.map(([id]) => ({
      shown: touch.shows(`id:${id}`),
      count: touch.count(`id:${id}`),
    }));

    const pointer = await openMobile({ input: "pointer" });
    await settleLayout(pointer);

    expect(touchTexts).toContain("env:input=touch density=default");

    for (const presence of touchPresence) {
      expect(presence.shown).toBe(true);
      expect(presence.count).toBe(1);
    }
    expect(touchBoxes).toEqual(boxSet(pointer));
  });

  // adapt-sheets/icons.md M-004 (A-001): `EnvironmentScope
  // density="compact"` changes nothing either — the component has no density
  // cells, so the preset resolves but produces no class difference and the
  // bounds equal the default environment's.
  test("M-004 injected compact density: identical bounds to the default environment", async () => {
    const compact = await openMobile({ input: "pointer", density: "compact" });
    await settleLayout(compact);
    const compactTexts = compact.texts();
    const compactBoxes = boxSet(compact);

    const plain = await openMobile({ input: "pointer" });
    await settleLayout(plain);

    expect(compactTexts).toContain("env:input=pointer density=compact");
    expect(compactBoxes).toEqual(boxSet(plain));
  });

  // adapt-sheets/icons.md M-005 (A-004): a decorative Canvas is not a press
  // target on either end — under injected touch `app.press("id:icon-close")`
  // is rejected as not found, and the only records the row leaves behind are
  // layout probes (hit area is the host button's job, not the SVG's).
  test("M-005 injected touch: pressing the icon is rejected, only layout records exist", async () => {
    const app = await openMobile({ input: "touch" });
    await settleLayout(app);

    await expect(app.press("id:icon-close")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });
    // The probe channel holds layout records and nothing else: the rejected
    // press left no trace, and no gesture or press path fired.
    expect(calls(app).length).toBeGreaterThan(0);
    expect(calls(app).every((call) => call.name === "layout")).toBe(true);
  });

  // adapt-sheets/icons.md M-006 (A-007, A-008): the scope wiring itself —
  // `params.input`/`params.density` reach `EnvironmentScope`, and the
  // in-scope `createInput()`/`createDensity()` witnesses report them.
  test("M-006 scope injection reaches createInput and createDensity", async () => {
    const touch = await openMobile({ input: "touch", density: "compact" });
    const touchTexts = touch.texts();

    const pointer = await openMobile({ input: "pointer" });
    const pointerTexts = pointer.texts();

    expect(touchTexts).toContain("env:input=touch density=compact");
    expect(pointerTexts).toContain("env:input=pointer density=default");
  });
});
