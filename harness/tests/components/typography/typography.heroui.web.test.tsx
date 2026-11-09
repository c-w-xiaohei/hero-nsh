import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { inflateSync } from "zlib";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only: X-002 reads the painted chip out of a screenshot, and X-003 /
 * X-004 need real text layout. Headless runs draw nothing (`app.screenshot`
 * says so), and its text engine does not wrap a paragraph into the lines a
 * body-sm paragraph has on Chrome, so the geometry cases run on the web
 * target alone, where Chrome lays the text out as the reference app does.
 *
 * `nsh/test` has no layout query: `spanStyle` reports a span's text style and
 * `bounds` are not exposed. A screenshot is the only channel that sees the
 * padding, so the file carries a small PNG reader (Chrome's screenshot is
 * 8-bit RGB, not interlaced, zlib-deflated; `zlib`'s `inflateSync` undoes the
 * deflate and the filters below are PNG's five).
 *
 * The scenario renders the chip in U+2588 FULL BLOCK, whose ink fills the
 * monospace cell, so "box edge minus ink edge" is the padding itself.
 */

type Shot = { width: number; height: number; rgb: Uint8Array };

function u32(bytes: Uint8Array, at: number): number {
  return ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
}

/** The top `fraction` of a PNG as packed RGB, straight from the bytes. */
function decodePng(png: Uint8Array, fraction: number): Shot {
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
  const kept = Math.min(Math.ceil(height * fraction), height);
  const rgb = new Uint8Array(width * kept * 3);
  const previous = new Uint8Array(stride);
  const line = new Uint8Array(stride);
  for (let y = 0; y < kept; y += 1) {
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
        const toLeft = estimate > left ? estimate - left : left - estimate;
        const toUp = estimate > up ? estimate - up : up - estimate;
        const toUpLeft = estimate > upLeft ? estimate - upLeft : upLeft - estimate;
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
  return { width, height: kept, rgb };
}

test("X-002 pads the inline code chip by 6 points and keeps its box at 20 points", async () => {
  // src/components/typography/typography-root.tsx:249-253,283-287
  // src/components/typography/typography.styles.ts:71
  // heroui/packages/styles/components/typography.css:117-119
  const app = await openScenario("typography/code-padding", { platform: "web" });
  const shot = decodePng(await app.screenshot(), 0.15);
  /* The screenshot is the 1024 × 768 viewport at the browser's own scale
   * (`deviceScaleFactor: 0`): one CSS point per pixel at 1×, two at 2×. Every
   * measurement below is divided by this, so the case reads points either way. */
  const scale = shot.width / 1024;
  const edge = Math.ceil(12 * scale);
  const limit = Math.ceil(340 * scale);
  const pixel = (x: number, y: number) => {
    const at = (y * shot.width + x) * 3;
    return [shot.rgb[at]!, shot.rgb[at + 1]!, shot.rgb[at + 2]!] as const;
  };
  const [pageR, pageG, pageB] = pixel(4, 4);

  let left = Number.POSITIVE_INFINITY;
  let right = -1;
  let top = Number.POSITIVE_INFINITY;
  let bottom = -1;
  let inkLeft = Number.POSITIVE_INFINITY;
  let inkRight = -1;
  let inkTop = Number.POSITIVE_INFINITY;
  let inkBottom = -1;
  for (let y = edge; y < shot.height; y += 1) {
    for (let x = edge; x < limit; x += 1) {
      const [r, g, b] = pixel(x, y);
      const painted = r !== pageR || g !== pageG || b !== pageB;
      if (!painted) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      /* The glyph ink is far darker than both the page and the chip fill. */
      if (r < 160 && g < 160 && b < 160) {
        if (x < inkLeft) inkLeft = x;
        if (x > inkRight) inkRight = x;
        if (y < inkTop) inkTop = y;
        if (y > inkBottom) inkBottom = y;
      }
    }
  }

  const boxWidth = (right - left + 1) / scale;
  const boxHeight = (bottom - top + 1) / scale;
  const padLeft = (inkLeft - left) / scale;
  const padRight = (right - inkRight) / scale;
  const padTop = (inkTop - top) / scale;
  const padBottom = (bottom - inkBottom) / scale;

  /* The chip is four monospace cells: a little over 30 points wide before the
   * padding, and no wider than 60 with it. */
  expect(boxWidth).toBeGreaterThanOrEqual(30);
  expect(boxWidth).toBeLessThanOrEqual(60);

  /* Upstream: `px-1.5` = 6 points each side, plus the glyph's side bearing
   * (a full block leaves under one point). The buggy span background hugged
   * the ink, 1 point or less. */
  expect(padLeft).toBeGreaterThanOrEqual(4);
  expect(padLeft).toBeLessThanOrEqual(9);
  expect(padRight).toBeGreaterThanOrEqual(4);
  expect(padRight).toBeLessThanOrEqual(9);

  /* Upstream's inline `<code>` is `text-sm`, a 14 / 20 line box, and its
   * `py-0.5` lives inside that box rather than on top of it: the painted chip
   * is the 20-point line, 20–21 in a screenshot. A View attachment that adds
   * the 2-point padding around the line box measured 24 here, and a span that
   * ignored padding hugged the glyphs (18). The full block ink keeps air above
   * and below it. */
  expect(boxHeight).toBeGreaterThanOrEqual(20);
  expect(boxHeight).toBeLessThanOrEqual(21);
  expect(padTop).toBeGreaterThanOrEqual(1);
  expect(padBottom).toBeGreaterThanOrEqual(1);
});

/*
 * X-003 / X-004 read the laid-out line boxes out of `onTextLayout` in
 * harness/typography.fixtures.tsx. Three body-sm paragraphs carry the same
 * copy at the same width: the plain paragraph is the control, the one with
 * `Typography.Code` is the regression case, and the one with a nested body
 * `Typography` span proves the probe can see a line grow to body's 28.
 */

type LineLayout = { text: string; height: number };

function lineHeights(app: App, name: "plain-sm" | "code-sm" | "base-span"): number[] {
  const calls = callsOf(app, "lines")
    .map((args) => args[0] as { name: string; lines: LineLayout[] })
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no line layout recorded for ${name}`);

  return found.lines.map((line) => line.height);
}

function openFixture(): Promise<App> {
  return open("../../../typography.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
  });
}

// src/components/typography/typography-root.tsx:249-253,283-287
// heroui/packages/styles/components/typography.css:117-119 (text-sm = 14 / 20)
// heroui/packages/styles/components/typography.css:105-107 (body-sm = 14 / 24)
/*
 * The chip is a View attachment laid out at its own content size. Removing
 * `py-0.5` from that View leaves it 20 points tall, inside the paragraph's
 * 24-point strut, so it must not grow the line. Before the fix the attachment
 * carried `text-sm`'s line box plus `py-0.5` (24) on top of the code root's
 * body layout, and the line that held the code measured 28 while the rest
 * stayed 24.
 */
test("X-003 keeps a body-sm line at 24 points beside an inline code", async () => {
  const app = await openFixture();

  const plain = lineHeights(app, "plain-sm");
  const withCode = lineHeights(app, "code-sm");

  expect(plain.length).toBeGreaterThanOrEqual(3);
  for (const height of plain) expect(height).toBe(24);

  expect(withCode.length).toBeGreaterThanOrEqual(3);
  for (const height of withCode) expect(height).toBe(24);
});

// src/components/typography/typography-root.tsx:206-219
// src/components/typography/typography.styles.ts:52-56 (defaultVariants.type)
/*
 * Upstream's `<code>` carries only the code declarations: it has no body
 * class, so it inherits the paragraph's 14 / 24. The port computed the code
 * root with `typographyVariants`, whose `defaultVariants.type = "body"` added
 * `text-base leading-7`; the first matched span then resolved to 16, and the
 * line that held the code grew to 28. The `base-span` case keeps the probe
 * honest: a nested body span does report 28.
 */
test("X-004 lets an inline code inherit the paragraph's font and leading", async () => {
  const app = await openFixture();

  expect(app.spanStyle("text:typographyVariants").fontSize).toBe(14);

  const withCode = lineHeights(app, "code-sm");
  for (const height of withCode) expect(height).toBe(24);

  const grown = lineHeights(app, "base-span");
  expect(Math.max(...grown)).toBe(28);
});
