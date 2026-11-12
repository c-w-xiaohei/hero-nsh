import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { inflateSync } from "zlib";
import { lastLayout, rightOf, triggerFocusCount } from "../../testers/date-picker";

/*
 * DatePicker cases that need a real engine's focus and box (port sheet 4b, rows
 * T-006 and T-007). NSH 0.4.0's Win32 host gives keyboard focus only to an
 * Input — `ref.focus()` on a view is a no-op and Tab walks text fields only
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`), so the
 * trigger cannot take the focus back on a Windows window. Approved difference
 * "Windows keyboard focus and activation (NSH 0.4.0/0.5.0 host gap)", port sheet
 * §8 item 10 and the common rules (`_common.md:52`). Nothing here is hidden on a
 * target where it could work.
 *
 * `toHaveFocus` cannot be queried by `nsh/test`, so the fixture's trigger
 * records its `onFocus` into Storage (port sheet 4b.3): the count is 0 unless
 * the close returned the focus. The popover's dialog role is not available in
 * NSH (port sheet §8 item 1), so its content stands in for it: the calendar's
 * Previous nav button is the visible half of "the popover is on screen".
 *
 * X-001 is a reduced-motion regression whose only channel is a picture: a
 * transition is a real-time paint, and `nsh/test` reads neither computed style
 * nor animation state (port sheet 4b row T-004 is 转截图 for that reason). The
 * file carries the PNG reader color-swatch and breadcrumbs use: Chrome's
 * screenshot is 8-bit RGB or RGBA, not interlaced, zlib-deflated, and `zlib`'s
 * `inflateSync` plus PNG's five filters turn it into pixels.
 */

const TRIGGER = "role:button[Open calendar]";
const PREVIOUS = "role:button[/^Previous$/]";

type CaseParams = Record<string, string | number | boolean>;

function openCase(
  name: string,
  params: CaseParams = {},
  options: { reducedMotion?: boolean } = {},
): Promise<App> {
  return open("../../../date-picker.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/date-picker/date-picker.browser.test.tsx:85
// Partial port of T-006 (port sheet 4b): `getByRole("dialog", {name: /Date/})`,
// the popover's `data-slot`, the `[role="dialog"]` count and the "no banner /
// no calendar header element" queries are all DOM structure that NSH does not
// have (no dialog role, no `data-slot`, no landmark roles). The two facts the
// case exists for stay: Escape closes the popover, and the trigger gets the
// focus back — the behaviour of the root's keydown + focus-restore code.
test("T-006 should close on Escape and return the focus to its trigger", async () => {
  const app = await openCase("default");

  expect(triggerFocusCount(app)).toBe(0);

  await app.press(TRIGGER);
  expect(app.shows(PREVIOUS)).toBe(true);

  await app.keyboard.press("escape");

  await app.waitFor(PREVIOUS, { state: "gone" });
  // The focus comes back in an effect after the close, one frame later.
  await app.waitUntil(() => triggerFocusCount(app) > 0);

  expect(app.shows(PREVIOUS)).toBe(false);
  expect(triggerFocusCount(app)).toBeGreaterThan(0);
});

// heroui/packages/react/tests/components/date-picker/date-picker.browser.test.tsx:101
// Partial port of T-007 (port sheet 4b): the `getByRole("dialog", {name:
// "Choose a date"})` query is dropped (no dialog role; that an `aria-label` on
// the popover overrides the Label text is a hand check). The geometry relation
// is kept: with the caller's `flex items-start gap-4` on the popover, the
// trailing preset button sits strictly right of the calendar (§4c G-002).
test("T-007 should lay a custom horizontal popover out with the preset beside the calendar", async () => {
  const app = await openCase("layout");

  await app.press(TRIGGER);
  await app.waitFor("role:button[Use today]");
  // The overlay positions itself a frame after it mounts.
  await app.wait(50);

  const calendar = lastLayout(app, "calendar");
  const preset = lastLayout(app, "preset");

  expect(preset.x - rightOf(calendar)).toBeGreaterThan(0);
});

/** A screenshot as packed RGB. */
type Shot = { width: number; height: number; rgb: Uint8Array };

function u32(bytes: Uint8Array, at: number): number {
  return ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
}

function decodePng(png: Uint8Array): Shot {
  let at = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let idat = new Uint8Array(0);
  while (at + 8 <= png.length) {
    const length = u32(png, at);
    const type = String.fromCharCode(png[at + 4]!, png[at + 5]!, png[at + 6]!, png[at + 7]!);
    const data = png.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = u32(data, 0);
      height = u32(data, 4);
      if (data[8] !== 8 || data[12] !== 0) {
        throw new Error(`the screenshot is not 8-bit and un-interlaced: ${data[8]}`);
      }
      colorType = data[9]!;
    } else if (type === "IDAT") {
      const joined = new Uint8Array(idat.length + data.length);
      joined.set(idat);
      joined.set(data, idat.length);
      idat = joined;
    }
    at += 12 + length;
  }
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 0;
  if (channels === 0) throw new Error(`unsupported PNG colour type ${colorType}`);

  const raw = inflateSync(idat);
  const stride = width * channels;
  const rgb = new Uint8Array(width * height * 3);
  const previous = new Uint8Array(stride);
  const line = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]!;
    const source = y * (stride + 1) + 1;
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? line[i - channels]! : 0;
      const up = previous[i]!;
      const upLeft = i >= channels ? previous[i - channels]! : 0;
      const byte = raw[source + i]!;
      let value: number;
      if (filter === 0) value = byte;
      else if (filter === 1) value = byte + left;
      else if (filter === 2) value = byte + up;
      else if (filter === 3) value = byte + ((left + up) >> 1);
      else {
        const estimate = left + up - upLeft;
        const toLeft = Math.abs(estimate - left);
        const toUp = Math.abs(estimate - up);
        const toUpLeft = Math.abs(estimate - upLeft);
        value = byte + (toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft);
      }
      line[i] = value & 255;
    }
    for (let x = 0; x < width; x += 1) {
      const from = x * channels;
      const to = (y * width + x) * 3;
      rgb[to] = line[from]!;
      rgb[to + 1] = line[from + 1]!;
      rgb[to + 2] = line[from + 2]!;
    }
    previous.set(line);
  }

  return { width, height, rgb };
}

/** How many pixels differ by more than `tolerance` in a channel. */
function differing(a: Shot, b: Shot, tolerance = 8): number {
  let count = 0;
  for (let i = 0; i < a.rgb.length; i += 3) {
    if (
      Math.abs(a.rgb[i]! - b.rgb[i]!) > tolerance ||
      Math.abs(a.rgb[i + 1]! - b.rgb[i + 1]!) > tolerance ||
      Math.abs(a.rgb[i + 2]! - b.rgb[i + 2]!) > tolerance
    ) {
      count += 1;
    }
  }
  return count;
}

// Regression X-001, evidence (pre-fix code):
// src/components/date-picker/date-picker-trigger.tsx:250-253 and
// src/components/date-picker/date-picker-popover.tsx:159-162, 468-476 — the
// inline `transitionProperty` outranked the class-level
// `motion-reduce:transition-none` that upstream puts after the transition
// (tmp/vendor/heroui/packages/styles/components/date-picker.css:21-24 for the
// trigger, :43-44 for the popover), so a reduced-motion user still got both
// transitions.
//
// Paint is the only channel: `nsh/test` reads no computed style and no
// animation state, and a transition is a real-time paint. The fixture's `motion`
// case asks for a 6000 ms enter on the popover through its public `className`,
// which keeps the fade running well past the screenshot round trip (~0.6–1.3 s
// measured) instead of racing the built-in 150 ms. Measured on `--target web`
// with this file's own assertions: with the transition live (the pre-fix paint,
// since `motion-reduce:transition-none` never won over the inline list) the
// ratio below is 0.075; with reduced motion honoured both captures are the same
// frame, ratio 1.000. The assertion therefore fails on the bug by a wide margin
// and passes once reduced motion clears the transition, whichever way that is
// done.
//
// The finding's other half — the trigger's `box-shadow` transition — has no
// paint channel of its own: that transition is only ever driven by the
// focus ring, and a probe of the Escape focus return (the one flow that focuses
// the trigger, T-006) measured the ring as painting nothing at all on the web
// target (`differing(unfocused, focused) === 0`), so there is nothing to time.
// Both halves are the same inline-owner pattern in one fix.
test(
  "X-001 paints the popover at rest on the first frame under reduced motion",
  async () => {
    const app = await openCase("motion", {}, { reducedMotion: true });

    const closed = decodePng(await app.screenshot());

    await app.press(TRIGGER);

    const first = decodePng(await app.screenshot());

    /* The frame the popover settles on: past the 6000 ms the caller asked for. */
    await app.wait(7000);

    const settled = decodePng(await app.screenshot());

    const painted = differing(closed, settled);
    const onFirstFrame = differing(closed, first);

    /* The open popover really is on screen, so the ratio below has a subject. */
    expect(painted).toBeGreaterThan(1000);
    /* Reduced motion means no transition at all: the first frame already is the
     * frame the popover settles on (a transition would leave it near the closed
     * frame, ratio ≈ 0.06). */
    expect(onFirstFrame / painted).toBeGreaterThan(0.99);
  },
  60_000,
);
