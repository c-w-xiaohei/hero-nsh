import type { ToggleButtonGroupOrientation } from "./toggle-button-group.styles";

/**
 * The classes HeroUI's toggle-button-group.css puts on every
 * `.toggle-button` inside a group. They are written after the variant
 * classes, so they win where the two overlap, and before the caller's
 * `className`.
 */
export function toggleButtonGroupItemClasses(
  orientation: ToggleButtonGroupOrientation,
  isDetached: boolean,
  fullWidth: boolean,
): string {
  const classes: string[] = [];

  // R-031, R-032, R-033, R-034; R-035, R-036, R-037. A lone member hits both
  // the first and the last rule, so its four corners keep their 24-point
  // radius without a rule of its own. R-047 needs no class either: attached
  // classes only exist when the group is not detached, so a detached group's
  // member keeps the base `rounded-3xl`.
  if (!isDetached) {
    classes.push("rounded-none");

    if (orientation === "horizontal") {
      classes.push("first:rounded-s-3xl", "last:rounded-e-3xl");
    } else {
      classes.push("first:rounded-t-3xl", "last:rounded-b-3xl");
    }
  }

  // R-038: `transform: none` while pressed, after the size variant's
  // `active:scale-[0.98]` / `[0.96]` in the class string.
  classes.push("active:scale-100");

  // R-040
  if (fullWidth) {
    classes.push("flex-1");
  }

  return classes.join(" ");
}
