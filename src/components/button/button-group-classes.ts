import type { ButtonGroupPosition } from "./button-group-context";
import type { ButtonGroupOrientation } from "./button-group.styles";
import type { ButtonVariant } from "./button.styles";

/**
 * The classes HeroUI's button-group.css puts on every `.button` inside a group.
 * They are written after the variant classes so they win where they overlap.
 */
export function buttonGroupItemClasses(
  orientation: ButtonGroupOrientation,
  variant: ButtonVariant | undefined,
  position: ButtonGroupPosition,
): string {
  // R-033, R-040, R-041
  const classes = ["rounded-none", "active:scale-100", "focus:z-10"];

  if (orientation === "horizontal") {
    // R-034 … R-036: the first keeps its start corners, the last its end ones,
    // a lone child keeps all four.
    if (position === "only") classes.push("rounded-3xl");
    else if (position === "first") classes.push("rounded-s-3xl");
    else if (position === "last") classes.push("rounded-e-3xl");

    if (variant === "outline") {
      // R-047 … R-049: the outer sides keep their border, the inner ones drop
      // it, and a lone child keeps both.
      if (position === "only") {
        // no change
      } else if (position === "first") {
        classes.push("border-e-0");
      } else if (position === "last") {
        classes.push("border-s-0");
      } else {
        classes.push("border-s-0 border-e-0");
      }
    }
  } else {
    // R-037 … R-039: same along the block axis. Every row takes the group's
    // width so the stack reads as one shape; upstream gets the same from its
    // equal-width demo labels, and a ragged edge is not a style it asks for.
    classes.push("w-full");
    if (position === "only") classes.push("rounded-3xl");
    else if (position === "first") classes.push("rounded-t-3xl");
    else if (position === "last") classes.push("rounded-b-3xl");

    if (variant === "outline") {
      // R-050 … R-052
      if (position === "only") {
        // no change
      } else if (position === "first") {
        classes.push("border-b-0");
      } else if (position === "last") {
        classes.push("border-t-0");
      } else {
        classes.push("border-t-0 border-b-0");
      }
    }
  }

  return classes.join(" ");
}
