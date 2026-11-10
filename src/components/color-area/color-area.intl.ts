/*
 * Kobalte's `packages/core/src/color-area/color-area.intl.ts` (two strings) plus
 * the reading-direction test the component needs instead of Kobalte's
 * `useLocale()`.
 *
 * NSH exposes the user's locale as a BCP 47 tag (`locale` from "nsh") and has no
 * locale provider, so the direction comes from the language: the same table
 * Kobalte ported from React Aria's `@react-aria/i18n` (`i18n/utils.ts`), with the
 * `Intl.Locale` script check first so a language written in two scripts resolves
 * correctly. Port sheet §8: the direction is inferred from the locale, exactly
 * as HeroUI's `useLocale().direction` is, never from a caller's `dir` prop.
 */

/** The English strings Kobalte ships; NSH has no translation provider. */
export const COLOR_AREA_INTL_TRANSLATIONS = {
  /** The group's accessible name when the caller passes no `aria-label`. */
  colorPicker: "Color Picker",
  /** Kobalte's name for the two-axis control, kept for the state model's parity. */
  twoDimensionalSlider: "2D slider",
};

export type ColorAreaIntlTranslations = typeof COLOR_AREA_INTL_TRANSLATIONS;

/** Scripts written right to left (React Aria's list, by ISO 15924 code). */
const RTL_SCRIPTS = new Set([
  "Avst",
  "Arab",
  "Armi",
  "Syrc",
  "Samr",
  "Mand",
  "Thaa",
  "Mend",
  "Nkoo",
  "Adlm",
  "Rohg",
  "Hebr",
]);

/** Languages written right to left, for hosts whose `Intl` has no `Locale`. */
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

/**
 * Whether `locale` is read right to left. `Intl.Locale`'s maximized script is
 * the accurate answer when the host has it (it catches, for example, Kurdish in
 * Arabic script); the language table is the fallback.
 */
export function isRtlLocale(locale: string): boolean {
  const LocaleConstructor = (Intl as { Locale?: new (tag: string) => { maximize(): { script?: string } } })
    .Locale;

  if (typeof LocaleConstructor === "function") {
    try {
      const script = new LocaleConstructor(locale).maximize().script ?? "";

      if (script.length > 0) {
        return RTL_SCRIPTS.has(script);
      }
    } catch {
      // An ill-formed tag falls through to the language table.
    }
  }

  return RTL_LANGUAGES.has(locale.split("-")[0].toLowerCase());
}
