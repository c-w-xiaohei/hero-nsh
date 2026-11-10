/**
 * The list text of a multiple selection.
 *
 * HeroUI formats a ComboBox's selected items with React Aria's
 * `useListFormatter()`, which is `Intl.ListFormat(locale, {})`: `type:
 * "conjunction"`, `style: "long"` — `"One and Three"` for two items, not
 * `"One, Three"` (`react-aria-components/src/ComboBox.tsx:424-431`). NSH's JS
 * runtime has `Intl.Collator` but no `Intl.ListFormat` (measured: `new
 * Intl.ListFormat` is "not a function"), so the formatter is used where it
 * exists and the English conjunction form is built by hand otherwise
 * (port sheet §8).
 */

interface ListFormatLike {
  format: (values: readonly string[]) => string;
}

const ListFormat = (
  Intl as unknown as {
    ListFormat?: new (
      locale: string | undefined,
      options: { type: "conjunction"; style: "long" },
    ) => ListFormatLike;
  }
).ListFormat;

/** The conjunction list text: `"One and Three"`, HeroUI's two-item form. */
export function formatComboBoxListText(texts: readonly string[]): string {
  if (texts.length === 0) {
    return "";
  }

  if (typeof ListFormat === "function") {
    return new ListFormat(undefined, {
      type: "conjunction",
      style: "long",
    }).format(texts);
  }

  if (texts.length === 1) {
    return texts[0] ?? "";
  }

  if (texts.length === 2) {
    return `${texts[0]} and ${texts[1]}`;
  }

  return `${texts.slice(0, -1).join(", ")}, and ${texts[texts.length - 1]}`;
}
