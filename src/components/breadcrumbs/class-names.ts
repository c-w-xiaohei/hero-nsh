/**
 * Joins class strings in order, dropping empty ones.
 *
 * Upstream's `composeSlotClassName` puts the slot classes first and the
 * caller's `className` after them; NSH's "later wins" rule then gives the
 * caller the final say without a merge library deciding which of two custom
 * theme tokens conflicts.
 *
 * Local copy of `src/components/link/class-names.ts`; port sheet §5 proposes
 * lifting it into `src/primitives/class-names.ts`, and this unit keeps its own
 * copy until that lands.
 */
export function joinClassNames(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}
