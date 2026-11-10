/**
 * A React Aria `Key`: a string or a number. HeroUI's `AccordionItem` and the
 * root's `expandedKeys` accept both, while nsh/base's `Accordion` /
 * `AccordionItem` take `string` values only, so every key crosses that border
 * encoded (port sheet §2, last row).
 */
export type AccordionKey = string | number;

/**
 * Encodes a key as the string the base accordion holds. The prefix keeps `1`
 * and `"1"` apart: without it both would become `"1"` and one item could open
 * another.
 */
export function encodeAccordionKey(key: AccordionKey): string {
  return typeof key === "number" ? `n:${key}` : `s:${key}`;
}

/** Decodes a value the base accordion reports back. The inverse of {@link encodeAccordionKey}. */
export function decodeAccordionKey(value: string): AccordionKey {
  const prefix = value.slice(0, 2);
  const body = value.slice(2);

  return prefix === "n:" ? Number(body) : body;
}
