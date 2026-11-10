/*
 * Kobalte reads the writing direction from its `I18nProvider`
 * (`useLocale().direction`); HeroUI reads the same value from React Aria's
 * `useLocale()`, which comes from the `I18nProvider` language. NSH exposes the
 * host's locale as `locale()` (a BCP 47 tag) and nothing else: `direction`
 * only reaches styling (`ltr:` / `rtl:` and the logical `start` / `end`
 * properties), never TypeScript. This file answers the same question the two
 * upstream providers answer, from the tag.
 *
 * The language list is React Aria's `rtlLanguages`
 * (`@react-aria/i18n/src/utils.ts`); the script check covers the RTL scripts a
 * language tag can name directly, as `Intl.Locale.prototype.textInfo` would.
 */

/** Languages whose default script is right-to-left (React Aria's `rtlLanguages`). */
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

/** Script subtags that are written right-to-left. */
const RTL_SCRIPTS = new Set(["adlm", "arab", "hebr", "mand", "nkoo", "rohg", "syrc", "thaa"]);

/**
 * Whether a BCP 47 locale tag is written right-to-left. A script subtag wins
 * over the language (an `ar-Latn` tag is left-to-right); without one, the
 * language decides. An empty or malformed tag is left-to-right, the default a
 * host without a locale uses.
 */
export function isRtlLocale(locale: string | undefined): boolean {
  if (!locale) {
    return false;
  }

  const subtags = locale.replace(/_/g, "-").split("-");
  const language = subtags[0]?.toLowerCase() ?? "";

  for (const subtag of subtags.slice(1)) {
    // A script subtag is exactly four letters; a region is two letters or three digits.
    if (/^[a-z]{4}$/i.test(subtag)) {
      return RTL_SCRIPTS.has(subtag.toLowerCase());
    }
  }

  return RTL_LANGUAGES.has(language);
}
