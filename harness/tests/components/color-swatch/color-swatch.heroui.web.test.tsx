import { expect, test } from "nsh/test";
import { inflateSync } from "zlib";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only: X-001 reads the painted edge of a swatch out of a screenshot.
 * Headless runs draw nothing (`app.screenshot` says so), and `nsh/test` has no
 * computed-style query: `spanStyle` only reports text style and `onLayout` only
 * sizes, so a picture is the only channel that sees a box-shadow. The file
 * carries a small PNG reader, the one typography.heroui.web.test.tsx uses:
 * Chrome's screenshot is 8-bit RGB or RGBA, not interlaced, zlib-deflated, and
 * `zlib`'s `inflateSync` plus PNG's five filters turn it into pixels.
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

/* `#0485F7` is (4, 133, 247). The 10% black inset border keeps the blue channel
 * near 222, an antialiased top edge only makes a row lighter than the fill, and
 * neither the white page nor the 35% black ring comes near this colour. */
function isFill(r: number, g: number, b: number): boolean {
  return Math.abs(r - 4) <= 40 && Math.abs(g - 133) <= 40 && Math.abs(b - 247) <= 40;
}

test("X-001 a caller boxShadow replaces the default inset border", async () => {
  // src/components/color-swatch/color-swatch-root.tsx:246-252 (with :272-285)
  // heroui/packages/react/src/components/color-swatch/color-swatch.tsx:27-32
  // heroui/packages/styles/components/color-swatch.css:11
  /*
   * Upstream merges the caller's `style` into the same div's inline style, so a
   * valid caller `boxShadow` replaces the stylesheet's default
   * `inset 0 0 0 1px rgba(0, 0, 0, 0.1)`. The port keeps that default on the
   * border layer unless the caller's shadow is all-inset: an outer-only shadow
   * was drawn on the root while the dark rim stayed inside the color fill.
   *
   * The scenario puts the default swatch (control) left and an outer-shadow
   * swatch right. Top-center inside each box: the control's rim is a 10% black
   * overlay on the fill (blue about 222); the fixed outer-shadow swatch is the
   * untouched fill (blue about 247). The ring pixels just outside the second
   * box prove the caller's `style` arrived at all, so a dropped shadow cannot
   * make the case pass for the wrong reason.
   */
  const app = await openScenario("color-swatch/box-shadow", {
    platform: "web",
    width: 480,
    height: 240,
    colorScheme: "light",
  });
  const shot = decodePng(await app.screenshot());
  const pixel = (x: number, y: number) => {
    const at = (y * shot.width + x) * 3;
    return [shot.rgb[at]!, shot.rgb[at + 1]!, shot.rgb[at + 2]!] as const;
  };

  /* Columns that hold at least one fill-coloured pixel become two runs: the
   * control and the swatch with the caller's shadow, separated by the page. */
  const runs: Array<{ left: number; right: number }> = [];
  for (let x = 0; x < shot.width; x += 1) {
    let painted = false;
    for (let y = 0; y < shot.height && !painted; y += 1) {
      const [r, g, b] = pixel(x, y);
      painted = isFill(r, g, b);
    }
    if (!painted) continue;
    const run = runs[runs.length - 1];
    if (run !== undefined && run.right === x - 1) run.right = x;
    else runs.push({ left: x, right: x });
  }

  expect(runs.length).toBe(2);

  function edge(which: number) {
    const run = runs[which]!;
    let top = Number.POSITIVE_INFINITY;
    for (let x = run.left; x <= run.right; x += 1) {
      for (let y = 0; y < shot.height; y += 1) {
        const [r, g, b] = pixel(x, y);
        if (!isFill(r, g, b)) continue;
        if (y < top) top = y;
        break;
      }
    }
    const center = Math.floor((run.left + run.right) / 2);
    let start = top;
    while (start < shot.height) {
      const [r, g, b] = pixel(center, start);
      if (isFill(r, g, b)) break;
      start += 1;
    }
    let blue = 255;
    for (let y = start; y <= start + 2 && y < shot.height; y += 1) {
      const [, , b] = pixel(center, y);
      if (b < blue) blue = b;
    }
    return { top, center, start, blue };
  }

  const control = edge(0);
  const caller = edge(1);

  /* The probe sees the default border on the control: without this, a broken
   * screenshot would let the second assertion pass on two plain fills. */
  expect(control.blue).toBeLessThanOrEqual(235);

  /* Upstream: the caller's inline box-shadow replaces the default one, so no
   * dark rim is painted inside the second swatch's edge. */
  expect(caller.blue).toBeGreaterThanOrEqual(240);

  /* And the caller's shadow itself is painted, 2 pixels outside the top edge
   * (inside the 6-point ring at either screenshot scale): 35% black over the
   * light page keeps the blue channel near 166. */
  const [, , ringBlue] = pixel(caller.center, caller.top - 2);
  expect(ringBlue).toBeLessThanOrEqual(205);
});
