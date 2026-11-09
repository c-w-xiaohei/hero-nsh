import type { NumberFormatOptions } from "@internationalized/number";

import { NumberFormatter } from "@internationalized/number";
import { computed, locale } from "nsh";
import type { Accessor } from "nsh";

/**
 * Localized number formatting for the current locale, as a primitive.
 *
 * Ported from Kobalte 0.13.14
 * `packages/core/src/i18n/create-number-formatter.ts`, which is itself based
 * on React Aria's `useNumberFormatter` (Apache-2.0, React Spectrum). The
 * I18nProvider part has no NSH counterpart: `locale()` is the device's BCP 47
 * tag and is already reactive, so the formatter is rebuilt whenever the locale
 * or the options change. With no provider, HeroUI formats with the default
 * locale too, which `nsh/test` reports as `"en-US"`.
 *
 * Options come in as an accessor and the formatter goes out as one, so the
 * primitive never touches an element and belongs to whoever calls it: two
 * instances get two formatters (research 4.4).
 */
export function createNumberFormatter(
  options: () => NumberFormatOptions,
): Accessor<NumberFormatter> {
  return computed(() => new NumberFormatter(locale(), options()));
}
