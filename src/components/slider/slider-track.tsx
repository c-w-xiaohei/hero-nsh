import type {
  Bounds,
  GestureResponderEvent,
  JSX,
  MouseEvent as NshMouseEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, signal, split, untracked, View } from "nsh";

import { joinClassNames } from "./class-names";
import type { SliderRenderProps, SliderTrackRenderProps } from "./slider-context";
import { SliderContext } from "./slider-context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./slider-dom-props";
import { getClosestValueIndex } from "./slider.utils";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Slider Track
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Slider.Track`: HeroUI 3.2.7's `SliderTrackProps`, which is
 * React Aria Components' `SliderTrack` (children or a render prop, the DOM
 * attributes, the hover events) and `className`.
 */
export interface SliderTrackProps
  extends Omit<ViewProps, "children" | "class" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The track's content, or a render prop called once with `{ state,
   * orientation, isDisabled, isHovered }` (D17: accessors).
   */
  children?: JSX.Element | ((values: SliderTrackRenderProps) => JSX.Element);

  /**
   * Appended after the slot classes; later classes win. The function form
   * gets the same accessors the render prop gets.
   */
  className?: string | ((values: SliderTrackRenderProps) => string | undefined);

  /** Style of the track; the function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: SliderTrackRenderProps) => StyleProp<ViewStyle>);

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The pointer entered the track (off while the slider is disabled). */
  onHoverStart?: (e: NshMouseEvent) => void;

  /** The pointer left the track. */
  onHoverEnd?: (e: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /** React's list identity; never reaches the host. */
  key?: string | number;

  /** Forwarded to the `View` host as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * Slider.Track / SliderTrack: the groove. It paints the two end caps and owns
 * the press and drag that move a thumb.
 *
 * The interaction is React Aria's `useSlider` rewritten onto NSH's responder
 * system: a press takes the track, converts the point into a value, picks the
 * closest thumb, focuses it and starts dragging; the moves are applied as a
 * fraction of the track's measured length; the release ends the drag, which is
 * what commits `onChangeEnd` (port sheet section 5).
 *
 * The track measures itself for the thumbs: the percent conversion needs the
 * laid-out length in points, where upstream reads `getBoundingClientRect()`.
 *
 * `focusable={false}` is deliberate: the track takes presses, which would
 * otherwise make it a Tab stop of its own (port sheet T-014).
 */
export function SliderTrack(props: SliderTrackProps): JSX.Element {
  const [local, rest] = split(props, [
    "key",
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "slot",
    "render",
    "onLayout",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // Read once, in the body: the slider this track belongs to, if any.
  const slider = SliderContext();

  const hovered = signal(false);

  const isVertical = () => slider?.orientation() === "vertical";

  const renderProps: SliderTrackRenderProps | undefined = slider
    ? {
        orientation: slider.orientation,
        isDisabled: slider.isDisabled,
        state: slider.state,
        isHovered: hovered,
      }
    : undefined;

  function resolvedClassName(): string | undefined {
    const value = local.className;

    return typeof value === "function" && renderProps
      ? value(renderProps)
      : typeof value === "string"
        ? value
        : undefined;
  }

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" && renderProps
      ? value(renderProps)
      : typeof value === "function"
        ? undefined
        : value;
  };

  // R-009: `.slider__track` → `grid-area: track`, written as row 2 and, when
  // horizontal, both columns; the vertical root keeps column 1 for the track
  // and column 2 for Marks (R-015 / R-053).
  //
  // R-043: the horizontal `.slider__track` → `@apply h-5 w-full`.
  // R-044: the horizontal `.slider__track` → `@apply border-x-[0.75rem]
  // border-x-transparent`, the room the thumb needs at both ends.
  // R-064: the vertical `.slider__track` → `@apply h-full w-5`.
  // R-065: the vertical `.slider__track` → `@apply border-y-[0.75rem]
  // border-y-transparent`.
  // R-068: the vertical `.slider__track` → `justify-self: center`.
  const classes = computed(() =>
    joinClassNames(
      slider?.slots().track(),
      isVertical()
        ? "row-start-2 col-start-1 h-full w-5 border-y-[0.75rem] border-y-transparent justify-self-center"
        : "row-start-2 col-start-1 col-span-2 h-5 w-full border-x-[0.75rem] border-x-transparent",
      resolvedClassName(),
    ),
  );

  // R-045 / R-046 / R-066 / R-067: upstream's `data-fill-start` /
  // `data-fill-end` paint the transparent end borders. Single thumb:
  // `fillWidth == 100` ends the fill, `fillWidth > 0` starts it. Several
  // thumbs: the fill reaches from the first to the last thumb.
  const fillState = computed(() => {
    const state = slider?.state;

    if (!state) {
      return { start: false, end: false };
    }

    const values = state.values();
    const last = values.length - 1;
    const startPercent = values.length > 1 ? state.getThumbPercent(0) : 0;
    const endPercent = state.getThumbPercent(last) ?? 0;
    const [start, end] = startPercent <= endPercent
      ? [startPercent, endPercent]
      : [endPercent, startPercent];
    const width = (end - start) * 100;

    if (values.length === 1) {
      return { start: width > 0, end: width === 100 };
    }

    return { start: start === 0, end: start * 100 + width === 100 };
  });

  // --- Pointer drag (React Aria's useSlider on the responder system) ---------
  let dragIndex: number | undefined;
  let dragStartPageX = 0;
  let dragStartPageY = 0;
  let dragStartPercent = 0;

  /** The track's laid-out length along the travel axis, in points. */
  const travelLength = () => {
    const size = slider?.trackSize();

    if (!size) {
      return 0;
    }

    return isVertical() ? size.height : size.width;
  };

  /** Where a point on the track sits along the travel axis, as `0…1`. */
  const percentAt = (locationX: number, locationY: number) => {
    const length = travelLength();

    if (length <= 0) {
      return 0;
    }

    if (isVertical()) {
      return 1 - locationY / length;
    }

    return slider?.isRtl() ? 1 - locationX / length : locationX / length;
  };

  const handleGrant = (event: GestureResponderEvent) => {
    const owner = slider;

    if (!owner || owner.isDisabled() || travelLength() <= 0) {
      return;
    }

    const percent = percentAt(event.locationX, event.locationY);
    const value = owner.state.getPercentValue(percent);
    const index = getClosestValueIndex(owner.state.values(), value);

    dragIndex = index;
    dragStartPageX = event.pageX;
    dragStartPageY = event.pageY;
    dragStartPercent = percent;

    // Focus first, record the pointer after: `focus()` makes the thumb's
    // `onFocus` mark the interaction as keyboard, and this write puts it back
    // to pointer, so a click does not paint a focus ring (port sheet §2).
    owner.focusThumb(index);
    owner.modality.setPointerModality();

    owner.state.setThumbDragging(index, true);
    owner.state.setThumbValue(index, value);
  };

  const handleMove = (event: GestureResponderEvent) => {
    const owner = slider;

    if (!owner || dragIndex === undefined) {
      return;
    }

    const length = travelLength();

    if (length <= 0) {
      return;
    }

    const delta = isVertical()
      ? (dragStartPageY - event.pageY) / length
      : (owner.isRtl()
          ? (dragStartPageX - event.pageX) / length
          : (event.pageX - dragStartPageX) / length);

    owner.state.setThumbValue(dragIndex, owner.state.getPercentValue(dragStartPercent + delta));
  };

  const handleRelease = () => {
    if (!slider || dragIndex === undefined) {
      return;
    }

    slider.state.setThumbDragging(dragIndex, false);
    dragIndex = undefined;
  };

  const handleLayout = (event: { bounds: Bounds }) => {
    slider?.setTrackSize({
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
    local.onLayout?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    if (slider?.isDisabled() || hovered()) {
      return;
    }

    hovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);

    if (!hovered()) {
      return;
    }

    hovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  const resolveChildren = (
    children: JSX.Element | ((values: SliderTrackRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1 && renderProps) {
      return renderChildren(
        untracked(() => (children as (values: SliderTrackRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      classList={{
        // R-045 / R-046: the horizontal caps.
        "border-s-accent": fillState().start && !isVertical(),
        "border-e-accent": fillState().end && !isVertical(),
        // R-066 / R-067: the vertical caps (start is the bottom).
        "border-b-accent": fillState().start && isVertical(),
        "border-t-accent": fillState().end && isVertical(),
      }}
      style={resolvedStyle()}
      focusable={false}
      onLayout={handleLayout}
      // The decorative dots and the fill listen to nothing; the track is the
      // one view here that takes the pointer.
      onStartShouldSetResponder={() => !(slider?.isDisabled() ?? false)}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {resolveChildren(local.children)}
    </View>
  );
}
