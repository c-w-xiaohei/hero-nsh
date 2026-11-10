/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/slider/utils.ts
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/utils/src/number.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/main/packages/%40react-aria/slider/src/useSlider.ts
 *
 * Adapted to NSH: Kobalte's `@kobalte/utils` cannot be imported (it depends on
 * `solid-js`), so the number helpers live here. Slider is the only unit that
 * needs them, and the port sheet keeps new shared primitives out of this
 * batch, so they stay in the component directory.
 */

/** How the slider is laid out and which axis its thumbs travel. */
export type Orientation = "horizontal" | "vertical";

/** React Aria's `clamp` (`react-stately/private/utils/number`). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Kobalte's `snapValueToStep` (`packages/utils/src/number.ts`), itself React
 * Aria's: round `value` to the nearest `min + n * step`, then pull it back
 * inside `[min, max]` and trim the floating-point noise a fractional step
 * leaves behind.
 */
export function snapValueToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const remainder = (value - (Number.isNaN(min) ? 0 : min)) % step;

  let snappedValue =
    Math.abs(remainder) * 2 >= step
      ? value + Math.sign(remainder) * (step - Math.abs(remainder))
      : value - remainder;

  if (!Number.isNaN(min)) {
    if (snappedValue < min) {
      snappedValue = min;
    } else if (!Number.isNaN(max) && snappedValue > max) {
      snappedValue = min + Math.floor((max - min) / step) * step;
    }
  } else if (!Number.isNaN(max) && snappedValue > max) {
    snappedValue = Math.floor(max / step) * step;
  }

  // Correct floating point behaviour by rounding to the step's precision.
  const string = step.toString();
  const index = string.indexOf(".");
  const precision = index >= 0 ? string.length - index : 0;

  if (precision > 0) {
    const pow = 10 ** precision;

    snappedValue = Math.round(snappedValue * pow) / pow;
  }

  return snappedValue;
}

/**
 * Kobalte's `getNextSortedValues`: the thumb at `atIndex` takes `nextValue`,
 * and the list is sorted again so a thumb that crossed its neighbour becomes
 * the neighbour (React Aria's `setThumbValue` does the same).
 */
export function getNextSortedValues(
  prevValues: number[],
  nextValue: number,
  atIndex: number,
): number[] {
  const nextValues = [...prevValues];

  nextValues[atIndex] = nextValue;

  return nextValues.sort((a, b) => a - b);
}

/**
 * Kobalte's `getClosestValueIndex`: which thumb a press on the track should
 * move. `nextValue` at or left of a thumb picks it, right of it picks the
 * thumb whose distance is last, exactly as React Aria's `setThumbValue`
 * resolves a track press.
 */
export function getClosestValueIndex(values: number[], nextValue: number): number {
  if (values.length === 1) {
    return 0;
  }

  const distances = values.map((value) => Math.abs(value - nextValue));
  const closestDistance = Math.min(...distances);
  const closestIndex = distances.indexOf(closestDistance);

  return nextValue < values[closestIndex]!
    ? closestIndex
    : distances.lastIndexOf(closestDistance);
}

/**
 * The RTL languages and scripts of BCP 47, as React Aria / Kobalte read them
 * for the locale direction (`@react-aria/i18n`'s `utils.ts`, mirrored in
 * Kobalte's `packages/core/src/i18n/utils.ts:12-47`). NSH has no
 * layout-direction read on the JS side, so the locale string is the only
 * source (port sheet section 8).
 */
const RTL_LANGUAGES = new Set([
  "ae",
  "ar",
  "arc",
  "bcc",
  "bqi",
  "ckb",
  "dv",
  "fa",
  "glk",
  "he",
  "ku",
  "mzn",
  "nqo",
  "pnb",
  "ps",
  "sd",
  "ug",
  "ur",
  "yi",
]);

/** Lowercased script codes: `Arab`, `Hebr`, `Nkoo` ... */
const RTL_SCRIPTS = new Set([
  "adlm",
  "arab",
  "armi",
  "avst",
  "hebr",
  "mand",
  "mend",
  "nkoo",
  "rohg",
  "samr",
  "syrc",
  "thaa",
]);

/** Whether a BCP 47 locale writes right to left (`ar-AE`, `he`, `ku-Arab`). */
export function isRtlLocale(locale: string): boolean {
  // The maximised script is the accurate read: one language can be written in
  // several scripts (`ku` is Latn in Turkey and Arab in Iraq), so the locale
  // subtags alone are only the fallback.
  const IntlLocale = (
    Intl as unknown as {
      Locale?: new (tag: string) => { maximize(): { script?: string } };
    }
  ).Locale;

  if (IntlLocale) {
    try {
      const script = new IntlLocale(locale).maximize().script ?? "";

      return RTL_SCRIPTS.has(script.toLowerCase());
    } catch {
      // An unparsable tag falls through to the subtag table.
    }
  }

  const parts = locale.toLowerCase().split(/[-_]/);
  const language = parts[0] ?? "";

  if (RTL_LANGUAGES.has(language)) {
    return true;
  }

  // The script subtag is the four-letter part (`zh-Hans`, `ku-Arab`).
  const script = parts.find((part) => part.length === 4);

  return script !== undefined && RTL_SCRIPTS.has(script);
}
