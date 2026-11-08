import type { ButtonGroupOrientation } from "./button-group.styles";
import type { ButtonVariant } from "./button.styles";

/**
 * The classes HeroUI's button-group.css puts on every `.button` inside a group.
 * They are written after the variant classes so they win where they overlap.
 */
export function buttonGroupItemClasses(
  orientation: ButtonGroupOrientation,
  variant: ButtonVariant | undefined,
): string {
  // R-033, R-040, R-041
  const classes = ["rounded-none", "active:scale-100", "focus:z-10"];

  if (orientation === "horizontal") {
    // R-034, R-035. R-036 (a lone child) needs no rule of its own: first and
    // last both match, so all four corners keep their 24-point radius.
    classes.push("first:rounded-s-3xl", "last:rounded-e-3xl");

    if (variant === "outline") {
      // R-047, R-048, R-049: clear both logical sides, restore the outer ones,
      // and clear them again on a lone child.
      classes.push(
        "border-s-0 border-e-0 first:border-s last:border-e only:border-s-0 only:border-e-0",
      );
    }
  } else {
    // R-037, R-038, R-039
    classes.push("first:rounded-t-3xl", "last:rounded-b-3xl");

    if (variant === "outline") {
      // R-050, R-051, R-052
      classes.push(
        "border-t-0 border-b-0 first:border-t last:border-b only:border-t-0 only:border-b-0",
      );
    }
  }

  return classes.join(" ");
}
