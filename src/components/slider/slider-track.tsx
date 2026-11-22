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

import { createInput } from "../../primitives/environment";
import { createPan } from "../../primitives/pan";
import { createPressFeedback } from "../../primitives/pressable";
import { joinClassNames } from "./class-names";
import {
  claimSliderTouch,
  releaseSliderTouch,
  sliderTouchClaimed,
} from "./slider-pan-state";
import type {
  SliderRenderProps,
  SliderSeam,
  SliderTrackRenderProps,
} from "./slider-context";
import { SliderContext, SliderSeamContext } from "./slider-context";
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
    "onTouchEnd",
    "onTouchCancel",
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

  // A-004: the grant body, shared by the bare responder chain, the touch
  // pan's `onDragStart` and the tap compensation — it reports `true` when it
  // armed a jump so the claim ledger reads the same acceptance. `pageX` /
  // `pageY` are the touch-down point in surface coordinates, the baseline
  // `handleMove` subtracts from.
  const beginJump = (
    locationX: number,
    locationY: number,
    pageX: number,
    pageY: number,
  ): boolean => {
    const owner = slider;

    if (!owner || owner.isDisabled() || travelLength() <= 0) {
      return false;
    }

    const percent = percentAt(locationX, locationY);
    const value = owner.state.getPercentValue(percent);
    const index = getClosestValueIndex(owner.state.values(), value);

    dragIndex = index;
    dragStartPageX = pageX;
    dragStartPageY = pageY;
    dragStartPercent = percent;

    // Focus first, record the pointer after: `focus()` makes the thumb's
    // `onFocus` mark the interaction as keyboard, and this write puts it back
    // to pointer, so a click does not paint a focus ring (port sheet §2).
    owner.focusThumb(index);
    owner.modality.setPointerModality();

    owner.state.setThumbDragging(index, true);
    owner.state.setThumbValue(index, value);

    return true;
  };

  const handleGrant = (event: GestureResponderEvent) => {
    beginJump(event.locationX, event.locationY, event.pageX, event.pageY);
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

  // --- Mobile seams (adapt-sheets/slider.md §2) -------------------------------
  // A-002: the hit-area half of the press-feedback seam, gated on the input
  // axis plus the slider's disabled flag. Only `hitSlop`/`layout` are wired —
  // the track drags through the responder system, never through press events,
  // so `pressDown`/`pressUp`/`scale`/`isPressed` report their resting values.
  const input = createInput();
  const seamEnabled = () => input() === "touch" && !(slider?.isDisabled() ?? false);
  const feedback = createPressFeedback({ enabled: seamEnabled });

  // A-004: the touch drag path. Under pointer `panHandlers()` is `{}` and no
  // listener mounts; under touch the bare chain's predicate below is false
  // and this pan's move claim decides on the first dominant frame — along the
  // travel axis only, so a cross-axis swipe is left to the surrounding Scroll
  // (the host's native recognizer claims at ~10 points; a floor would arrive
  // after it).
  const pan = createPan({
    enabled: seamEnabled,
    shouldClaim: (_event, gesture) => {
      const along = isVertical() ? gesture.dy : gesture.dx;
      const across = isVertical() ? gesture.dx : gesture.dy;

      return along !== 0 && Math.abs(across) < Math.abs(along);
    },
    onDragStart: (event, gesture) => {
      // `locationX`/`locationY` are the current local point on the claiming
      // frame and `gesture.dx`/`dy` its travel since touch-down, so the
      // difference is the down point in view coordinates — the press-jump
      // baseline and the pre-threshold travel both survive. The same rewind
      // in surface coordinates gives `handleMove`'s delta baseline.
      if (
        beginJump(
          event.locationX - gesture.dx,
          event.locationY - gesture.dy,
          event.pageX - gesture.dx,
          event.pageY - gesture.dy,
        )
      ) {
        claimSliderTouch(event.identifier);
      }
    },
    onDrag: (event) => {
      handleMove(event);
    },
    onDragEnd: () => {
      handleRelease();
    },
  });

  // A-004, tap-to-jump compensation: a bare tap produces no move frame, so the
  // pan never claims it and the bare chain (gated off under touch) cannot
  // commit it either. An unclaimed touch ending on the track jumps the value
  // exactly the way `handleGrant` + `handleRelease` would — jump, drag
  // bracket, one `onChange` + one `onChangeEnd`. A thumb touch never gets
  // here (`handleTouchEnd` there stops propagation), and a pan-claimed touch
  // already settled its own end.
  const handleTouchEnd = (event: GestureResponderEvent) => {
    local.onTouchEnd?.(event);

    if (input() !== "touch") {
      return;
    }

    if (sliderTouchClaimed(event.identifier)) {
      releaseSliderTouch(event.identifier);
      return;
    }

    beginJump(event.locationX, event.locationY, event.pageX, event.pageY);
    handleRelease();
  };

  const handleTouchCancel = (event: GestureResponderEvent) => {
    local.onTouchCancel?.(event);
    releaseSliderTouch(event.identifier);
  };

  // A-002: the track's size report leads the chain (the pointer maths needs
  // it first), the seam's `bounds` feeds `hitSlop` next, the caller's
  // `onLayout` stays last.
  const handleLayout = (event: { bounds: Bounds }) => {
    slider?.setTrackSize({
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
    feedback.layout(event);
    local.onLayout?.(event);
  };

  // A-006: hover is a pointer affordance; under touch it must neither write
  // `hovered` nor fire `onHover*` — `isHovered` only lives in the render
  // prop, so the gate sits in the handlers and the style table stays
  // untouched. The caller's own `onMouseEnter`/`onMouseLeave` still run first.
  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    if (input() === "touch" || slider?.isDisabled() || hovered()) {
      return;
    }

    hovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);

    if (input() === "touch" || !hovered()) {
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

  // The seam surface a fixture probe reads through `SliderSeamContext` —
  // offered inside this track's own View, never on `SliderContextValue`.
  const seamValue: SliderSeam = {
    enabled: seamEnabled,
    pan: { panHandlers: pan.panHandlers, active: pan.active },
    feedback,
  };

  return (
    <View
      {...hostProps(rest)}
      {...pan.panHandlers()}
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
      // A-002: the view-prop half of the hit area — the seam's computed slop,
      // `undefined` while gated off. Bound after both spreads so a caller's
      // `hitSlop` in `rest` never reaches the host.
      hitSlop={feedback.hitSlop()}
      // The decorative dots and the fill listen to nothing; the track is the
      // one view here that takes the pointer.
      // A-004: the desktop chain stays mounted; under touch its start
      // predicate reads false and the pan's own responder family answers.
      onStartShouldSetResponder={() =>
        input() !== "touch" && !(slider?.isDisabled() ?? false)
      }
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SliderSeamContext.Provider value={seamValue}>
        {resolveChildren(local.children)}
      </SliderSeamContext.Provider>
    </View>
  );
}
