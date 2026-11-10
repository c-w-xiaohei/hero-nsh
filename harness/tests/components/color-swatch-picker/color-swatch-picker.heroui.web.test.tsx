import { expect, open, test } from "nsh/test";
import { inflateSync } from "zlib";

/*
 * Web-only: X-001 reads the painted indicator out of a screenshot. Headless
 * runs draw nothing (`app.screenshot` says so) and `nsh/test` has no
 * computed-style query: `spanStyle` reports text only and `onLayout` reports
 * boxes, while `opacity` and transforms are explicitly aside from what a
 * selector sees. So a picture is the only channel that sees a scaled-away
 * child. The PNG reader is the one color-swatch.heroui.web.test.tsx and
 * typography.heroui.web.test.tsx use: Chrome's screenshot is 8-bit RGB or
 * RGBA, not interlaced, zlib-deflated, and `zlib`'s `inflateSync` plus PNG's
 * five filters turn it into pixels.
 */

type Shot = { width: number; height: number; rgb: Uint8Array };

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

const RED = [239, 68, 68] as const; // #ef4444, the first fixture preset
const GREEN = [34, 197, 94] as const; // #22c55e, the second, selected by defaultValue
const BLUE = [59, 130, 246] as const; // #3b82f6, the third
const LIME = [163, 230, 53] as const; // #a3e635, the caller indicator block

/**
 * The presets, the item border and its selected box-shadow all stay more than
 * this far from the lime caller block in at least one channel: lime vs the
 * second preset differs by 129 in red, so the block can never be counted as a
 * swatch fill, nor a fill as the block.
 */
const TOLERANCE = 40;

type RGB = readonly [number, number, number];

function near(pixel: RGB, target: RGB, tolerance = TOLERANCE): boolean {
  return (
    Math.abs(pixel[0] - target[0]) <= tolerance &&
    Math.abs(pixel[1] - target[1]) <= tolerance &&
    Math.abs(pixel[2] - target[2]) <= tolerance
  );
}

/**
 * Upstream keeps every Indicator direct child at scale 0 and raises only the
 * selected item's to scale 1 (packages/styles/components/color-swatch-picker.css:82-103),
 * so one preset carries the caller block and two carry none. The fixture lays
 * the three swatches on one row, left to right, with the middle preset
 * selected. A port that puts the scale only on the default checkmark paints
 * the block on all three, which this counts.
 */
test("X-001 paints a custom indicator only on the selected swatch", async () => {
  // heroui/packages/styles/components/color-swatch-picker.css:82-103
  // heroui/packages/react/src/components/color-swatch-picker/color-swatch-picker.tsx:161-180
  const app = await open("../../../color-swatch-picker.fixtures.tsx", {
    platform: "web",
    width: 360,
    height: 120,
    colorScheme: "light",
    host: { params: { case: "custom-indicator" } },
  });

  // The selected swatch shrinks over 150ms; let both transitions finish.
  await app.wait(250);

  const shot = decodePng(await app.screenshot());
  const pixel = (x: number, y: number): RGB => {
    const at = (y * shot.width + x) * 3;
    return [shot.rgb[at]!, shot.rgb[at + 1]!, shot.rgb[at + 2]!];
  };
  const fillKind = (color: RGB): string | null => {
    if (near(color, RED)) return "red";
    if (near(color, GREEN)) return "green";
    if (near(color, BLUE)) return "blue";
    return null;
  };

  /* Columns that hold at least one preset colour become the three swatches. */
  const runs: Array<{ left: number; right: number }> = [];
  for (let x = 0; x < shot.width; x += 1) {
    let painted = false;
    for (let y = 0; y < shot.height && !painted; y += 1) {
      painted = fillKind(pixel(x, y)) !== null;
    }
    if (!painted) continue;
    const run = runs[runs.length - 1];
    if (run !== undefined && run.right === x - 1) run.right = x;
    else runs.push({ left: x, right: x });
  }

  expect(runs.length).toBe(3);

  /* Which preset a swatch is: the first preset-coloured pixel down its middle.
   * The order proves the selection landed on the middle preset, so the star
   * assertion below cannot pass by matching the wrong swatch. */
  const kinds = runs.map((run) => {
    const center = Math.floor((run.left + run.right) / 2);
    for (let y = 0; y < shot.height; y += 1) {
      const kind = fillKind(pixel(center, y));
      if (kind !== null) return kind;
    }
    return null;
  });

  expect(kinds).toEqual(["red", "green", "blue"]);

  /* Pixels of the caller block inside each swatch. */
  const stars = runs.map((run) => {
    let count = 0;
    for (let x = run.left; x <= run.right; x += 1) {
      for (let y = 0; y < shot.height; y += 1) {
        if (near(pixel(x, y), LIME)) count += 1;
      }
    }
    return count;
  });

  /* The selected middle swatch shows it: without this, a screenshot that lost
   * the indicator altogether would satisfy the two zero counts. */
  expect(stars[1]!).toBeGreaterThan(20);
  expect(stars[0]!).toBe(0);
  expect(stars[2]!).toBe(0);
});
