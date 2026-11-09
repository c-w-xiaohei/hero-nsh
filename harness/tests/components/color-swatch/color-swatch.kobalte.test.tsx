import { expect, test } from "nsh/test";
import { parseColor } from "@heroui/react";

/*
 * Kobalte 0.13.14 regression cases for the color value model, per port sheet 4b
 * (T-005 ... T-013). `packages/core/src/colors/utils.ts` is the code that moves
 * with ColorSwatch (it parses the `color` prop and formats it for the swatch),
 * so its test file comes along. The cases are pure functions: no app is opened,
 * and `it.each`'s data sets run as loops inside one case, as upstream's single
 * `it.each` call counts once in the census.
 *
 * Translations from vitest: `toStrictEqual` is `toEqual` (the same member-wise
 * comparison here, arrays of channel names), `toThrowError(message)` is
 * `toThrow(message)`.
 */

const rgbValues = [
  { raw: "rgb(50 100 200)", alpha: false, string: "rgb(50, 100, 200)" },
  {
    raw: "rgb(50 100 200 / 0.2)",
    alpha: true,
    string: "rgb(50, 100, 200 / 0.2)",
  },
  {
    raw: "rgb(50 100 200 / 20%)",
    alpha: true,
    string: "rgb(50, 100, 200 / 0.2)",
  },
  {
    raw: "rgba(50, 100, 200, 0.2)",
    alpha: true,
    string: "rgb(50, 100, 200 / 0.2)",
  },
  { raw: "rgb(50, 100, 200)", alpha: false, string: "rgb(50, 100, 200)" },
  { raw: "rgb(50,100,200)", alpha: false, string: "rgb(50, 100, 200)" },
];

// kobalte/packages/core/src/colors/utils.test.ts:30
test("T-005 correct parse string to color", async () => {
  for (const item of rgbValues) {
    const result = parseColor(item.raw);

    expect(result.getColorSpace()).toBe("rgb");
    expect(result.getColorChannels()).toEqual(["red", "green", "blue"]);
  }
});

// kobalte/packages/core/src/colors/utils.test.ts:38
test("T-006 correct result toString", async () => {
  for (const item of rgbValues) {
    const result = parseColor(item.raw);

    expect(result.toString()).toBe(item.string);
  }
});

// kobalte/packages/core/src/colors/utils.test.ts:43
test("T-007 correct result toString from rgb to hex", async () => {
  const result = parseColor("rgb(0 0 0)");

  expect(result.toString("hex")).toBe("#000000");
});

// kobalte/packages/core/src/colors/utils.test.ts:48
test("T-008 correct result toString from rgb to hexa", async () => {
  const result = parseColor("rgb(0 0 0 / 0.5)");

  expect(result.toString("hexa")).toBe("#00000080");
});

// kobalte/packages/core/src/colors/utils.test.ts:53
test("T-009 correct result toString from rgb to hsl", async () => {
  const result = parseColor("rgb(50 100 200)");

  expect(result.toFormat("hsl").toString("hsl")).toBe("hsl(220 60% 49.02%)");
});

// kobalte/packages/core/src/colors/utils.test.ts:60
test("T-010 correct result toString from rgb to hsla", async () => {
  const result = parseColor("rgb(50 100 200 / 0.5)");

  expect(result.toFormat("hsla").toString("hsla")).toBe("hsla(220 60% 49.02% / 0.5)");
});

// kobalte/packages/core/src/colors/utils.test.ts:67
test("T-011 correctly parses and converts to various formats", async () => {
  for (const item of rgbValues) {
    const result = parseColor(item.raw);

    // Verify initial color space and channels
    expect(result.getColorSpace()).toBe("rgb");
    expect(result.getColorChannels()).toEqual(["red", "green", "blue"]);

    // Verify string representation
    expect(result.toString()).toBe(item.string);

    // Verify conversion to hex
    if (!item.alpha) {
      expect(result.toString("hex")).toBe("#3264C8");
    }

    // Verify conversion to hexa
    if (item.alpha) {
      expect(result.toString("hexa")).toBe("#3264C833");
    }

    // Verify conversion to HSL
    const hslResult = result.toFormat("hsl");

    // Verify conversion to HSLA
    if (item.alpha) {
      expect(hslResult.toString("hsl")).toBe("hsl(220 60% 49.02% / 0.2)");

      const hslaResult = result.toFormat("hsla");
      expect(hslaResult.toString("hsla")).toBe("hsla(220 60% 49.02% / 0.2)");
    } else {
      expect(hslResult.toString("hsl")).toBe("hsl(220 60% 49.02%)");
    }

    // Verify conversion to HSB
    const hsbResult = result.toFormat("hsb");
    expect(hsbResult.toString("hsb")).toBe("hsb(220 75% 78.43%)");

    // Verify conversion to HSBA
    if (item.alpha) {
      const hsbaResult = result.toFormat("hsba");
      expect(hsbaResult.toString("hsba")).toBe("hsba(220 75% 78.43% 0.2)");
    }
  }
});

// kobalte/packages/core/src/colors/utils.test.ts:118
test("T-012 throws an error for invalid color strings", async () => {
  const invalidColors = ["invalid", "#zzzzzz"];

  for (const color of invalidColors) {
    expect(() => parseColor(color)).toThrow(`Invalid color value: ${color}`);
  }
});

// kobalte/packages/core/src/colors/utils.test.ts:127
test("T-013 handles edge cases for alpha values", async () => {
  const result = parseColor("rgb(50 100 200 / 0)");

  expect(result.toFormat("hsba").toString("hsba")).toBe("hsba(220 75% 78.43% 0)");
});
