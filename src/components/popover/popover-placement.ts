import type { Align } from "nsh";

/** The side of the anchor an overlay is on. */
export type PopoverSide = "top" | "bottom" | "left" | "right";

/**
 * React Aria's `Placement` (`@react-types/overlays`), which HeroUI's Content
 * accepts unchanged. The first word is the side, the optional second word the
 * alignment along it.
 */
export type PopoverPlacement =
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

export interface ResolvedPopoverPlacement {
  side: PopoverSide;
  align: Align;
}

/**
 * Maps a React Aria placement string to the core `Overlay`'s side and align
 * (port sheet §5.6). Logical `start` / `end` land on `left` / `right` (LTR);
 * RTL has no channel in NSH TSX, which is registered as a known difference.
 */
export function resolvePopoverPlacement(
  placement: PopoverPlacement | undefined,
): ResolvedPopoverPlacement {
  const [first, second] = (placement ?? "bottom").split(" ");

  let side: PopoverSide;

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
      side = "bottom";
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

/** Rebuilds a React Aria placement string from a resolved side and alignment. */
export function popoverPlacementString(
  side: PopoverSide,
  align: Align,
): PopoverPlacement {
  if (align === "center") {
    return side;
  }

  if (side === "top" || side === "bottom") {
    return `${side} ${align === "start" ? "start" : "end"}` as PopoverPlacement;
  }

  return `${side} ${align === "start" ? "top" : "bottom"}` as PopoverPlacement;
}
