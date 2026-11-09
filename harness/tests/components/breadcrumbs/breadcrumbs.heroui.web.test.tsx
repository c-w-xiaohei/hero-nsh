import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { inflateSync } from "zlib";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only: both cases read paint out of a screenshot. Headless runs draw
 * nothing, and `nsh/test` has no computed-style query (spanStyle reports text
 * color, not a view layer's opacity; onLayout reports a box). The two
 * regressions are paint-only, so a picture is the only channel: X-001 is the
 * current crumb's opacity, X-002 is the default chevron's direction.
 *
 * The file carries a small PNG reader, the one typography.heroui.web.test.tsx
 * and color-swatch.heroui.web.test.tsx use: Chrome's screenshot is 8-bit RGB or
 * RGBA, not interlaced, zlib-deflated, and `zlib`'s `inflateSync` plus PNG's
 * five filters turn it into pixels.
 */

type Shot = { width: number; height: number; rgb: Uint8Array };
type Band = { y: number; height: number };

function u32(bytes: Uint8Array, at: number): number {
  return ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
}

/** A PNG as packed RGB. */
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
  return { width, height, rgb };
}

/* The fixture records each row's box in points through onLayout; the
 * screenshot is in device pixels, so the two are bridged by this scale. */
function bandsOf(app: App, viewportWidth: number, shot: Shot): Record<string, Band> {
  const scale = shot.width / viewportWidth;
  const bands: Record<string, Band> = {};
  for (const args of callsOf(app, "layout")) {
    const call = args[0] as { name: string; y: number; height: number };
    bands[call.name] = {
      y: Math.round(call.y * scale),
      height: Math.max(1, Math.round(call.height * scale)),
    };
  }
  return bands;
}

type Pixel = { r: number; g: number; b: number };

function bandPixels(shot: Shot, band: Band): Array<Pixel & { x: number; y: number }> {
  const pixels: Array<Pixel & { x: number; y: number }> = [];
  const top = Math.max(0, band.y);
  const bottom = Math.min(shot.height, band.y + band.height);
  for (let y = top; y < bottom; y += 1) {
    for (let x = 0; x < shot.width; x += 1) {
      const at = (y * shot.width + x) * 3;
      pixels.push({ x, y, r: shot.rgb[at]!, g: shot.rgb[at + 1]!, b: shot.rgb[at + 2]! });
    }
  }
  return pixels;
}

/** The darkest channel in the band: the paint of a full-coverage stem at opacity 1. */
function darkest(shot: Shot, band: Band): number {
  let value = 255;
  for (const pixel of bandPixels(shot, band)) {
    value = Math.min(value, pixel.r, pixel.g, pixel.b);
  }
  return value;
}

/**
 * The direction of a chevron's upper stroke: how much its x moves per row of y
 * over the top 60% of the glyph. `>` walks down-right (about +0.7 at this
 * size), the rotated `<` down-left (about -0.7); the glyph's own box and the
 * surrounding layout cancel out, so two rows in one picture are comparable.
 */
function upperStrokeSlope(shot: Shot, band: Band): number {
  const ink = bandPixels(shot, band).filter((pixel) => Math.min(pixel.r, pixel.g, pixel.b) < 200);
  if (ink.length === 0) throw new Error("no ink in the band");

  let minY = Infinity;
  let maxY = -Infinity;
  for (const pixel of ink) {
    if (pixel.y < minY) minY = pixel.y;
    if (pixel.y > maxY) maxY = pixel.y;
  }

  const cut = minY + (maxY - minY) * 0.6;
  const upper = ink.filter((pixel) => pixel.y <= cut);
  const meanX = upper.reduce((sum, pixel) => sum + pixel.x, 0) / upper.length;
  const meanY = upper.reduce((sum, pixel) => sum + pixel.y, 0) / upper.length;

  let covariance = 0;
  let variance = 0;
  for (const pixel of upper) {
    covariance += (pixel.y - meanY) * (pixel.x - meanX);
    variance += (pixel.y - meanY) ** 2;
  }

  return covariance / variance;
}

test("X-001 the current crumb stays at opacity 1 while disabled", async () => {
  // src/components/breadcrumbs/breadcrumbs-item.tsx:123-129 (linkClassName)
  // src/components/link/link.styles.ts:45
  // heroui/packages/styles/components/breadcrumbs.css:14-16
  // heroui/packages/styles/components/link.css:52-54
  /*
   * Upstream's `.breadcrumbs .breadcrumbs__link[data-current="true"]` sets
   * `opacity: 100` and outranks `.link[aria-disabled="true"]`'s
   * `opacity: var(--disabled-opacity)` (0.5), so the current crumb is painted
   * at full strength although it stays aria-disabled. In NSH variants apply
   * after plain utilities, so the plain `opacity-100` loses to Link's
   * `disabled:opacity-50`; the current crumb came out greyed.
   *
   * Each band holds one label painted by one thing, and the label is M's so a
   * full-coverage stem exists at this size; the half bands are the same paint
   * behind `opacity-50`, which is exactly what the bug drew. A full-opacity
   * control plus its half twin calibrate the screenshot, and the muted twin
   * pair keeps the fix honest: only the current item may be restored.
   */
  const app = await open("../../../breadcrumbs.fixtures.tsx", {
    platform: "web",
    width: 480,
    height: 400,
    colorScheme: "light",
    host: { params: { case: "paint" } },
  });

  expect(app.enabled("id:current-default")).toBe(false);
  expect(app.enabled("id:current-disabled")).toBe(false);
  expect(app.enabled("id:muted-disabled")).toBe(false);

  const shot = decodePng(await app.screenshot());
  const bands = bandsOf(app, 480, shot);

  const linkFull = darkest(shot, bands["link-full"]!);
  const linkHalf = darkest(shot, bands["link-half"]!);
  const mutedFull = darkest(shot, bands["muted-full"]!);
  const mutedHalf = darkest(shot, bands["muted-half"]!);

  // The screenshot can see a 0.5 layer at all: without this, a screenshot that
  // ignored opacity would let every comparison below pass for free.
  expect(linkHalf).toBeGreaterThan(linkFull + 60);
  expect(mutedHalf).toBeGreaterThan(mutedFull + 40);

  const currentDefault = darkest(shot, bands["current-default"]!);
  const currentDisabled = darkest(shot, bands["current-disabled"]!);

  expect(Math.abs(currentDefault - linkFull)).toBeLessThan(12);
  expect(Math.abs(currentDisabled - linkFull)).toBeLessThan(12);

  // A non-current disabled link keeps the 0.5 opacity: a blanket
  // `disabled:opacity-100` must not pass this case.
  const mutedDisabled = darkest(shot, bands["muted-disabled"]!);

  expect(Math.abs(mutedDisabled - mutedHalf)).toBeLessThan(12);
  expect(mutedDisabled).toBeGreaterThan(mutedFull + 40);
});

test("X-002 the default separator chevron follows the writing direction", async () => {
  // src/components/breadcrumbs/breadcrumbs.styles.ts:44-52 (separator slot)
  // heroui/packages/styles/components/breadcrumbs.css:25-27
  /*
   * Upstream's `.breadcrumbs__separator { rtl: rotate-180 }` mirrors the
   * chevron in a right-to-left layout, and it is applied both to the default
   * icon and to the custom-separator wrapper. The port dropped the rule with
   * the claim that NSH has no writing direction, but `ltr:` / `rtl:` are
   * supported variants and `rotate-180` exists.
   *
   * One chevron between two empty labels is the only ink in each row, so the
   * measure reads the glyph itself: `>` has its top at the left of its box,
   * the rotated `<` at the right. Both rows share one screenshot, so a font
   * or scale change cannot make the comparison pass by accident.
   */
  const app = await open("../../../breadcrumbs.fixtures.tsx", {
    platform: "web",
    width: 320,
    height: 220,
    colorScheme: "light",
    host: { params: { case: "separator-rtl" } },
  });

  const shot = decodePng(await app.screenshot());
  const bands = bandsOf(app, 320, shot);

  const ltr = upperStrokeSlope(shot, bands.ltr!);
  const rtl = upperStrokeSlope(shot, bands.rtl!);

  expect(ltr).toBeGreaterThan(0.3);
  expect(rtl).toBeLessThan(-0.3);
});
