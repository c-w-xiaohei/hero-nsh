import { expect, test } from "nsh/test";
import { inflateSync } from "zlib";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only: X-002 reads the painted chip out of a screenshot. Headless runs
 * draw nothing (`app.screenshot` says so), and the picture has to be measured
 * in points, so the case runs on the web target alone.
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

test("X-002 pads the inline code chip by 6 points and 2 points", async () => {
  // src/components/typography/typography-root.tsx:233-237,262-268
  // src/components/typography/typography.styles.ts:71
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

  /* `py-0.5` = 2 points above and below the `text-sm` line (14 / 20): the box
   * is 24 tall, where the span background that ignored padding hugged the
   * glyphs (the bug measured 18). The ink keeps air above and below it too. */
  expect(boxHeight).toBeGreaterThanOrEqual(23);
  expect(boxHeight).toBeLessThanOrEqual(25);
  expect(padTop).toBeGreaterThanOrEqual(1);
  expect(padBottom).toBeGreaterThanOrEqual(1);
});
