/**
 * Joins class strings in order, dropping empty ones.
 *
 * HeroUI's `composeSlotClassName` puts the slot class first and the caller's
 * `className` after it; NSH's "later wins" rule then gives the caller the final
 * say on any property it restates (D13).
 *
 * Local copy of `src/components/kbd/class-names.ts` (also in Badge, Chip,
 * Switch, ColorSwatch and ColorField); the controller lifts it into
 * `src/primitives/` between batches, and this unit keeps one copy for both of
 * its components until that change lands (port sheet §5).
 */
export function joinClassNames(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}
