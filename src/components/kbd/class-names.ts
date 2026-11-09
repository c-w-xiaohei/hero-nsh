/**
 * Joins class strings in order, dropping empty ones.
 *
 * The port sheet §2 / §4 asks for the slot class and the caller's `className`
 * to be concatenated, with the caller's classes last: NSH's "later wins" rule
 * then gives the caller the final say without a merge library deciding which
 * of two custom theme tokens conflicts.
 */
export function joinClassNames(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}
