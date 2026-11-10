import type { JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { split } from "nsh";

import { PopoverContent } from "../popover";
import type { PopoverPlacement, PopoverRenderValues } from "../popover";
import { SurfaceContext } from "../surface";
import { joinClassNames } from "./class-names";
import { ColorPickerContext } from "./color-picker-context";
import { colorPickerVariants } from "./color-picker.styles";
import type { AriaProps, DataProps, GlobalDomProps } from "./dom-props";

/* -------------------------------------------------------------------------------------------------
 * Popover
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorPicker.Popover`: HeroUI 3.2.7's `ColorPickerPopoverProps`,
 * which is React Aria Components' `Popover` minus `children` plus a required
 * children prop. `placement` defaults to `"bottom left"` upstream, as here.
 */
export interface ColorPickerPopoverProps
  extends AriaProps,
    DataProps,
    GlobalDomProps {
  /** The popover's content: any color parts, the swatch picker included. */
  children: JSX.Element;

  /** Appended after the `popover` slot class; a function receives the render values. */
  className?: string | ((values: PopoverRenderValues) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: PopoverRenderValues) => StyleProp<ViewStyle>);

  /** The overlay view; `focus()` and `measure()` reach it. */
  ref?: (node: ViewRef) => void;

  /** React Aria placement (default `"bottom left"`). */
  placement?: PopoverPlacement;

  /** The content's own open state; given, it overrides the root's (RAC semantics). */
  isOpen?: boolean;

  defaultOpen?: boolean;

  onOpenChange?: (isOpen: boolean) => void;

  /** The gap between the trigger and the popover (default 8). */
  offset?: number;

  /** The safe-area margin (default 12; React Aria's `containerPadding`). */
  containerPadding?: number;

  /** Accepted, no effect: the core Overlay has no separate cross-axis offset. */
  crossOffset?: number;

  /** Accepted, no effect: the core Overlay always flips when the other side fits. */
  shouldFlip?: boolean;

  /** Removes the underlay and the focus move. */
  isNonModal?: boolean;

  /** When `true`, Escape does not close. */
  isKeyboardDismissDisabled?: boolean;

  /** Accepted, no effect: NSH has no element object to hand to the predicate. */
  shouldCloseOnInteractOutside?: (element: unknown) => boolean;

  /** Forces the exit state; the presence computes it otherwise (port sheet §1.2). */
  isExiting?: boolean;

  /** Forces the enter state (a custom enter animation). */
  isEntering?: boolean;

  /** Skips the enter and exit phases. */
  shouldSkipAnimation?: boolean;

  /** Accepted, no effect: the overlay renders in its own root view. */
  UNSTABLE_portalContainer?: unknown;

  /** Accepted, no effect: the core Overlay positions against the registered trigger. */
  boundaryElement?: unknown;

  /** Accepted, no effect: NSH's overlay has no max-height clamp. */
  maxHeight?: number;

  /** Accepted, no effect: NSH has no overlay arrow size. */
  arrowSize?: number;

  /** A standalone popover can be anchored to a trigger ref directly. */
  triggerRef?: ViewRef | null;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  nativeID?: string;

  testID?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/**
 * ColorPicker.Popover / ColorPickerPopover: the `color-picker__popover` slot
 * around `Popover.Content`, inside a default `Surface` as upstream.
 *
 * R-110 / R-114 … R-118 live in the popover slot (styles file); R-111
 * (transform origin), R-112 (scrollbar) and R-113 (overflow) are deleted there.
 * The animations are `Popover.Content`'s presence, one owner per property:
 * R-119 enter (150ms `ease-smooth`, `opacity-0 scale-90` start; upstream's
 * keyframe starts at 0.95, registered in port sheet §8), R-120 … R-123 the
 * per-side 4pt translation (chosen from `side()` where upstream used
 * `[data-placement^=…]`), R-124 the 100ms exit hold with `pointer-events-none`.
 */
export function ColorPickerPopover(
  props: ColorPickerPopoverProps,
): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "placement",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "offset",
    "containerPadding",
    "crossOffset",
    "shouldFlip",
    "isNonModal",
    "isKeyboardDismissDisabled",
    "shouldCloseOnInteractOutside",
    "isExiting",
    "isEntering",
    "shouldSkipAnimation",
    "UNSTABLE_portalContainer",
    "boundaryElement",
    "maxHeight",
    "arrowSize",
    "triggerRef",
    "id",
    "nativeID",
    "testID",
    "render",
    "slot",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  const slots = ColorPickerContext()?.slots ?? colorPickerVariants();

  const className = (values: PopoverRenderValues) =>
    joinClassNames(
      slots.popover(),
      typeof local.className === "function"
        ? local.className(values)
        : local.className,
    );

  // HeroUI wraps the popover in a default Surface; nothing consumes the value
  // today (surface.md §5), but it is part of the upstream contract.
  const surface = { variant: () => "default" as const };

  return (
    <SurfaceContext.Provider value={surface}>
      <PopoverContent
        ref={(node) => local.ref?.(node)}
        testID={local.testID}
        nativeID={local.id ?? local.nativeID}
        placement={local.placement ?? "bottom left"}
        isOpen={local.isOpen}
        defaultOpen={local.defaultOpen}
        onOpenChange={local.onOpenChange}
        offset={local.offset}
        containerPadding={local.containerPadding}
        crossOffset={local.crossOffset}
        shouldFlip={local.shouldFlip}
        isNonModal={local.isNonModal}
        isKeyboardDismissDisabled={local.isKeyboardDismissDisabled}
        shouldCloseOnInteractOutside={local.shouldCloseOnInteractOutside}
        isExiting={local.isExiting}
        isEntering={local.isEntering}
        shouldSkipAnimation={local.shouldSkipAnimation}
        triggerRef={local.triggerRef}
        className={className}
        style={local.style}
      >
        {local.children}
      </PopoverContent>
    </SurfaceContext.Provider>
  );
}
