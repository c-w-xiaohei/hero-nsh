/**
 * Joins class strings in order, dropping empty ones.
 *
 * HeroUI's `composeSlotClassName` puts the slot class first and the caller's
 * `className` after it; NSH's "later wins" rule then gives the caller the final
 * say on any property it restates.
 *
 * Local copy of `src/components/badge/class-names.ts`; the port sheet §5
 * proposes lifting it into `src/primitives/class-names.ts`, and this unit keeps
 * its own copy until that change lands.
 */
export function joinClassNames(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}
