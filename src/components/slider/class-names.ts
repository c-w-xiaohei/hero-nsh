/**
 * Joins class strings in order, dropping empty ones.
 *
 * HeroUI's `composeSlotClassName` puts the slot class first and the caller's
 * `className` after it; NSH's "later wins" rule then gives the caller the final
 * say on any property it restates.
 *
 * Local copy of `src/components/progress-bar/class-names.ts`; the port sheet's
 * cross-unit list does not include a shared module.
 */
export function joinClassNames(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}
