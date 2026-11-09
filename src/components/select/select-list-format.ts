/**
 * The list text of a multiple selection.
 *
 * HeroUI formats the selected items with React Aria's `useListFormatter`
 * (`Intl.ListFormat` with `type: "unit"`): `"One, Three"` in English. NSH's JS
 * runtime has `Intl.Collator` but no `Intl.ListFormat` (measured: `new
 * Intl.ListFormat` is "not a function"), so the formatter is used where it
 * exists and the English unit form is built by hand otherwise (port sheet §8).
 */

interface ListFormatLike {
  format: (values: readonly string[]) => string;

  formatToParts: (
    values: readonly string[],
  ) => readonly { type: "element" | "literal"; value: string }[];
}

const ListFormat = (
  Intl as unknown as {
    ListFormat?: new (
      locale: string | undefined,
      options: { type: "unit" },
    ) => ListFormatLike;
  }
).ListFormat;

/** One segment of the list text: a selected item, or the separator. */
export interface SelectListPart {
  type: "element" | "literal";
  value: string;
}

/** The unit-style list text: `"One, Three"`, the two-item form HeroUI shows. */
export function formatListText(texts: readonly string[]): string {
  if (texts.length === 0) {
    return "";
  }

  if (typeof ListFormat === "function") {
    return new ListFormat(undefined, { type: "unit" }).format(texts);
  }

  return texts.join(", ");
}

/**
 * The elements and the literals between them, so `Select.Value` can replace
 * each element with the option's own content (HeroUI's `formatToParts`).
 */
export function formatListParts(texts: readonly string[]): SelectListPart[] {
  if (texts.length === 0) {
    return [];
  }

  if (typeof ListFormat === "function") {
    return new ListFormat(undefined, { type: "unit" }).formatToParts(texts).map(
      (part) => ({ type: part.type, value: part.value }),
    );
  }

  const parts: SelectListPart[] = [];

  texts.forEach((text, index) => {
    if (index > 0) {
      parts.push({ type: "literal", value: ", " });
    }

    parts.push({ type: "element", value: text });
  });

  return parts;
}
