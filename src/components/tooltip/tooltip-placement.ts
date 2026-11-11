import type { Align } from "nsh";

/** The side of the anchor an overlay is on. */
export type TooltipSide = "top" | "bottom" | "left" | "right";

/**
 * React Aria's `Placement` (`@react-types/overlays`), which HeroUI's Content
 * accepts unchanged: the first word is the side, the optional second word the
 * alignment along it. Tooltip and Popover share this list; the tables are
 * independent because the two components' defaults differ.
 */
export type TooltipPlacement =
  | "bottom"
  | "bottom left"
  | "bottom right"
  | "bottom start"
  | "bottom end"
  | "top"
  | "top left"
  | "top right"
  | "top start"
  | "top end"
  | "left"
  | "left top"
  | "left bottom"
  | "right"
  | "right top"
  | "right bottom"
  | "start"
  | "start top"
  | "start bottom"
  | "end"
  | "end top"
  | "end bottom";

export interface ResolvedTooltipPlacement {
  side: TooltipSide;
  align: Align;
}

/**
 * Maps a React Aria placement string to the core `Overlay`'s side and align
 * (port sheet §5.6). Logical `start` / `end` land on `left` / `right` (LTR);
 * NSH has no reading-direction channel in TSX, which is registered as a known
 * difference. Unlike Popover, the default side is `top`.
 */
export function resolveTooltipPlacement(
  placement: TooltipPlacement | undefined,
): ResolvedTooltipPlacement {
  const [first, second] = (placement ?? "top").split(" ");

  let side: TooltipSide;

  switch (first) {
    case "top":
    case "bottom":
    case "left":
    case "right":
      side = first;
      break;
    case "start":
      side = "left";
      break;
    case "end":
      side = "right";
      break;
    default:
      side = "top";
      break;
  }

  if (second === undefined) {
    return { side, align: "center" };
  }

  // Above and below the anchor the alignment runs horizontally; beside it,
  // vertically (React Aria's `top` / `bottom` secondary values).
  const starts = side === "top" || side === "bottom" ? ["left", "start"] : ["top", "start"];
  const ends = side === "top" || side === "bottom" ? ["right", "end"] : ["bottom", "end"];

  return {
    side,
    align: starts.includes(second) ? "start" : ends.includes(second) ? "end" : "center",
  };
}
