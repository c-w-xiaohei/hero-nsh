/**
 * Joins class strings in order, dropping empty ones.
 *
 * Upstream's `useResolvedClassName` puts the variant classes first and the
 * caller's `className` after them; NSH's "later classes win" rule then gives
 * the caller the final say.
 *
 * Local copy of `src/components/search-field/class-names.ts`; the port sheet §5
 * keeps new shared code out of `src/primitives/` until the controller promotes
 * it, so this unit carries its own copy.
 */
export function joinClassNames(...parts: (string | false | null | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}
