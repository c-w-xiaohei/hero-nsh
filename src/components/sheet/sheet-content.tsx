import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { split, View } from "nsh";

import { createSheetDetent, SheetDetentContext } from "./create-sheet-detent";
import { SheetContext, SheetSwipeDirectionContext } from "./sheet-context";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";
import type { SheetRenderValues } from "./sheet-render-values";
import type { SheetPlacement } from "./sheet.styles";
import {
  sheetContentDetachedClasses,
  sheetContentSnapClasses,
  sheetVariants,
} from "./sheet.styles";

/**
 * The props of `Sheet.Content`: HeroUI's `SheetContentProps`, which is React
 * Aria's `Sheet` props minus `children` / `className`, plus the render-prop
 * form of `children` and a `style`.
 */
export interface SheetContentProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style"> {
  children?: JSX.Element | ((values: SheetRenderValues) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** Forwarded as a callback to the view. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `data-${string}`]: unknown;
}

/** Both edges whose reveal length is a height. */
function isHorizontalPlacement(placement: SheetPlacement): boolean {
  return placement === "left" || placement === "right";
}

/**
 * How far the panel is pushed toward its edge, as CSS `translate` x / y. A
 * bottom sheet leaves downward, a top one upward, and so on: the cover slides
 * out of the edge it came from.
 */
function edgeTranslate(placement: SheetPlacement, offset: number): [number, number] {
  if (placement === "bottom") return [0, offset];
  if (placement === "top") return [0, -offset];
  if (placement === "left") return [-offset, 0];

  return [offset, 0];
}

/**
 * Sheet.Content / SheetContent: the clip box whose axial length is the current
 * detent (R-008 / R-019 / R-020 / R-021 / R-022, port sheet §4c).
 *
 * Upstream this is React Aria's scroll-snap sheet: the panel is laid out at full
 * height inside a scroller and the scroll offset decides how much of it shows.
 * NSH has neither scroll-snap nor a scroll-progress timeline, so the same state
 * is `createSheetDetent`'s reveal length, owned here and handed to the parts
 * below through `SheetDetentContext` (port sheet §5): the Dialog reports its
 * natural length, the Handle drags it, the Body scrolls only once it is
 * expanded.
 */
export function SheetContent(props: SheetContentProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "render",
    "slot",
  ]);

  const context = SheetContext();

  // Outside a Root the clip box still renders with the table's defaults, the
  // way `Sheet.Dialog` does; there is simply no state to drive it.
  const placement = (): SheetPlacement => context?.placement() ?? "bottom";
  const slots = () => context?.slots() ?? sheetVariants();

  // The detent state belongs to this part: it is what the clip box's length and
  // the Handle's responder channel are (port sheet §4c handoff).
  const detent = createSheetDetent({
    placement,
    // The Backdrop's `swipeDirection` decides the drag axis (T-014), not the
    // reveal axis; it reaches the Handle through this state.
    swipeDirection: () => SheetSwipeDirectionContext() ?? undefined,
    isDetached: () => context?.isDetached() ?? false,
    isDismissable: () => context?.isDismissable() ?? true,
    snapPoints: () => context?.snapPoints(),
    isOpen: () => context?.isOpen() ?? false,
    close: () => context?.close(),
  });

  const values: SheetRenderValues = {
    // `position` is HeroUI's name for the placement in the render props.
    position: placement,
    swipeDirection: () => detent.direction(),
    stackIndex: () => context?.stackIndex() ?? 0,
    // Core gap (port sheet §8): nothing tells the Content that a nested sheet
    // opened inside it — `Sheet.NestedRoot` announces itself to no part.
    hasDescendants: () => false,
    isExpanded: () => detent.isExpanded(),
    // Core gap (port sheet §8): the entering / exiting phase belongs to the
    // host dialog, which the Backdrop owns; there is no channel to read it.
    isEntering: () => false,
    isExiting: () => false,
  };

  // R-008 `z-1 box-content overflow-clip outline-none` is the slot; R-016 /
  // R-017 / R-018 are the detached pair, appended after it so they beat the
  // placement's radius and max size; R-009 (`perspective` / `will-change`) is
  // deleted.
  const classes = () =>
    [
      slots().content(),
      context?.isDetached() ? sheetContentDetachedClasses(placement()) : undefined,
      local.className,
    ]
      .filter((part) => part !== undefined && part !== "")
      .join(" ");

  // R-019 / R-020: the placement slot caps the axial size with `max-h` /
  // `max-w`; a snap point owns that length instead, so the cap has to come off.
  // Only the class list sits after the variant classes, which is why these two
  // travel here (port sheet §4c).
  const classList = () => ({
    [sheetContentSnapClasses(placement())]: detent.hasPartialDetents(),
  });

  /**
   * R-019 / R-020 / R-021 / R-022, as the inline axial length they have to be:
   * the detent is a runtime value, so the box's height (top / bottom) or width
   * (left / right) is written here rather than in a class. The axis is the placement's, not
   * the drag axis: a horizontal `swipeDirection` on a bottom sheet still
   * reveals a height, it only changes which pointer coordinate the Handle
   * follows (`sheetDragLength` keeps the length on the panel's axis).
   *
   * R-021 / R-022 need no `calc()`: `fullLength` already subtracts the detached
   * margins, so the detached full detent is a number too.
   *
   * Without a partial detent (G-001) the panel keeps its natural height and the
   * whole box is pushed out of the edge by `offset()` instead: that is how a
   * dragged sheet disappears, since there is no scroll position to animate.
   */
  const style = (): ViewStyle => {
    if (!detent.hasPartialDetents()) {
      return { translate: edgeTranslate(placement(), detent.offset()) };
    }

    const length = detent.length();

    return isHorizontalPlacement(placement()) ? { width: length } : { height: length };
  };

  const content = () => {
    const node = local.children;

    // A function with an argument is HeroUI's render prop; a zero-argument one
    // is NSH's reactive child and belongs to `renderSheetPartChildren`.
    if (typeof node === "function" && node.length >= 1) {
      return (node as (values: SheetRenderValues) => JSX.Element)(values);
    }

    return renderSheetPartChildren(node as JSX.Element);
  };

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      classList={classList()}
      // The caller's style comes last, so it can restate a length (D13).
      style={[style(), local.style]}
    >
      {/*
        The provider exception in the common rules: the parts inside read
        `SheetDetentContext`, so `props.children` is read once, here at the
        placement, inside the provider.
      */}
      <SheetDetentContext.Provider value={detent}>{content()}</SheetDetentContext.Provider>
    </View>
  );
}
