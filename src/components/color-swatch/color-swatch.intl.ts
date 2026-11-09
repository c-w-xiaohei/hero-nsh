/**
 * Copied from `@kobalte/core@0.13.14`
 * `packages/core/src/color-swatch/color-swatch.intl.ts`. Only the transparent
 * name survives: NSH has no `aria-roledescription` channel, so the
 * `roleDescription` string has no consumer (port sheet §8).
 */

export const COLOR_SWATCH_INTL_TRANSLATIONS = {
  transparent: "transparent",
};

export type ColorSwatchIntlTranslations = typeof COLOR_SWATCH_INTL_TRANSLATIONS;
