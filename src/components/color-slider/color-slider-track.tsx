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
import { computed, signal, split, View } from "nsh";

import { Checkerboard } from "./checkerboard";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "./color-slider-dom-props";
import { hostProps } from "./color-slider-dom-props";
import type { ColorSliderTrackRenderProps } from "./color-slider-context";
import { ColorSliderContext, EMPTY_COLOR_SLIDER_STATE } from "./color-slider-context";
import { clamp } from "./color-slider-utils";
import { renderRenderPropChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Track props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorSlider.Track`: HeroUI 3.2.7's `ColorSliderTrackProps`,
 * which is React Aria Components' `SliderTrack` (`HoverEvents`, `children`,
 * `className`, `style`), expressed with NSH's view host props.
 */
export interface ColorSliderTrackProps
  extends Omit<ViewProps, "children" | "class" | "style" | "role" | keyof DomEventProps>,
    AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /**
   * Usually the `ColorSlider.Thumb`, or a render prop called once (D17) with
   * the track's accessors plus `isHovered`. Bare strings become `Text`.
   */
  children?:
    | JSX.Element
    | ((values: ColorSliderTrackRenderProps) => JSX.Element);

  /** Appended after the slot classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: ColorSliderTrackRenderProps) => string | undefined);

  /** Style of the track; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorSliderTrackRenderProps) => StyleProp<ViewStyle>);

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The pointer entered the track (off while disabled). */
  onHoverStart?: (event: NshMouseEvent) => void;

  /** The pointer left the track. */
  onHoverEnd?: (event: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /** Forwarded to the track `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Track
 * -----------------------------------------------------------------------------------------------*/

/**
 * ColorSlider.Track / ColorSliderTrack: the rail. It owns the gradient layer,
 * the checkerboard, the two end caps and the thumb's containing block, and it
 * takes the pointer: React Aria's Track handles a press anywhere on itself by
 * moving the thumb to that position, which in NSH is the responder system
 * (port sheet §5, "指针怎么走").
 *
 * Each layer owns one property: the track is the box (`relative`, size,
 * placement, measurement), the checkerboard the tiles, the gradient layer the
 * `backgroundImage` and the track's inner border shadow (an inset shadow under
 * a child layer would not show), the start cap the minimum-value color over
 * its own checkerboard, the end cap the maximum-value color, and the thumb its
 * position and paint (port sheet §5, "分层").
 */
export function ColorSliderTrack(props: ColorSliderTrackProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "focusable",
    "slot",
    "render",
    "onLayout",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
  ] as const);

  // Read once, in the body: the slider this track belongs to, if any.
  const slider = ColorSliderContext();

  const isVertical = () => slider?.orientation() === "vertical";
  const isDisabled = () => slider?.isDisabled() ?? false;
  const isRtl = () => slider?.rtl() ?? false;

  const isHovered = signal(false);

  const renderProps = (): ColorSliderTrackRenderProps => ({
    orientation: () => slider?.orientation() ?? "horizontal",
    isDisabled: () => slider?.isDisabled() ?? false,
    state: slider?.publicState ?? EMPTY_COLOR_SLIDER_STATE,
    isHovered,
  });

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps()) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps()) : value;
  };

  /**
   * R-019: `grid-area: track`. The CSS gives the track its own row and spans
   * both columns when the label and the output share the first row; NSH has no
   * grid areas, so the track places itself from the root's registrations.
   */
  const placementClasses = computed(() => {
    if (isVertical()) {
      // R-019 / R-048: the output row, then the track, then the label; when the
      // label is the only other part the track takes the first row instead
      // (R-056).
      return slider?.hasOutput() ? "row-start-2" : "row-start-1";
    }

    // R-019: a full-width second row under `label output`, or the first column
    // of the collapsed templates.
    return slider?.hasLabel() && slider?.hasOutput()
      ? "row-start-2 col-span-2"
      : "row-start-2 col-start-1";
  });

  /**
   * R-032 / R-033 and R-062 / R-063: the track's box per orientation.
   * `rounded-none` overrides R-018's dead `rounded-2xl`, and half a thumb is
   * left at each end so the thumb does not overhang the slider's ends.
   *
   * Upstream writes that clearance as `width: calc(100% - 1.25rem)`. NSH's
   * class resolver has no `calc()` and `ViewStyle`'s lengths are points or a
   * percentage, so the same box is produced the other way round: the track
   * stretches over its grid area and the 10-point margins take the 20 points
   * away, which is also why it stays centred (registered in §8).
   */
  const sizeClasses = computed(() =>
    isVertical()
      ? // R-062: vertical `.color-slider__track` → `width: 20` → `w-5`.
        // R-063: `height: calc(100% - 1.25rem)`, as the margins above.
        "w-5 justify-self-center self-stretch my-2.5 rounded-none"
      : // R-032: horizontal `.color-slider__track` → `height: 20` → `h-5`.
        // R-033: `width: calc(100% - 1.25rem)`, as the margins above.
        "h-5 justify-self-stretch mx-2.5 rounded-none",
  );

  // R-018 in `color-slider.styles.ts`, then the size, then the placement, then
  // the caller's `className`; later classes win.
  const classes = computed(() =>
    joinClassNames(
      slider?.slots.track(),
      sizeClasses(),
      placementClasses(),
      resolvedClassName(),
    ),
  );

  /** R-076: the channel gradient, from the display color and the channel's range. */
  const backgroundImage = computed(() => {
    if (!slider) {
      return undefined;
    }

    // R-076: `to top` for a vertical slider; `to right` horizontally, `to left`
    // when the layout is right-to-left (Kobalte's track makes the same choice).
    const to = isVertical() ? "top" : isRtl() ? "left" : "right";
    const channel = slider.state.channel();
    const range = slider.state.channelRange();
    const displayColor = slider.state.displayColor();
    const stop = (value: number) =>
      displayColor.withChannelValue(channel, value).toString("css");

    if (channel === "hue") {
      // Seven stops, every 60 degrees, so the hue wheel is smooth.
      const stops = [0, 60, 120, 180, 240, 300, 360].map(stop).join(", ");

      return `linear-gradient(to ${to}, ${stops})`;
    }

    if (channel === "lightness") {
      // Three stops: the midpoint keeps black → color → white even.
      const middle = (range.minValue + range.maxValue) / 2;

      return `linear-gradient(to ${to}, ${stop(range.minValue)}, ${stop(middle)}, ${stop(range.maxValue)})`;
    }

    return `linear-gradient(to ${to}, ${stop(range.minValue)}, ${stop(range.maxValue)})`;
  });

  /** R-078: the two cap colors are the channel at its minimum and maximum. */
  const startColor = computed(() => {
    if (!slider) {
      return undefined;
    }

    const range = slider.state.channelRange();

    return slider.state
      .displayColor()
      .withChannelValue(slider.state.channel(), range.minValue)
      .toString("css");
  });

  const endColor = computed(() => {
    if (!slider) {
      return undefined;
    }

    const range = slider.state.channelRange();

    return slider.state
      .displayColor()
      .withChannelValue(slider.state.channel(), range.maxValue)
      .toString("css");
  });

  /**
   * R-077 / R-040 / R-070: the checkerboard is only painted while the channel's
   * gradient can be translucent, i.e. for alpha. Every other channel's display
   * color has alpha 1, so upstream's tiled layer is never visible there either;
   * skipping it saves dozens of views per slider.
   */
  const isAlpha = computed(() => slider?.state.channel() === "alpha");

  /**
   * R-020 / R-035 / R-036 / R-038 / R-065 / R-066: the start cap's box, per
   * orientation. R-037 is its horizontal radius (`rounded-ss-2xl rounded-es-2xl`,
   * the outer end), R-067 its vertical `-bottom-2.5`, R-068 the full radius of
   * its bottom corners.
   */
  const startCapClasses = computed(() =>
    isVertical()
      ? "absolute z-0 pointer-events-none start-0 w-full h-2.5 rounded-es-full rounded-ee-full -bottom-2.5 overflow-hidden"
      : "absolute z-0 pointer-events-none top-0 h-full w-2.5 rounded-ss-2xl rounded-es-2xl -start-2.5 overflow-hidden",
  );

  /**
   * R-020 / R-035 / R-036 / R-042 / R-065 / R-066 / R-071: the end cap's box.
   * R-041 is its horizontal radius (`rounded-se-2xl rounded-ee-2xl`), R-072 the
   * full radius of its top corners vertically (`rounded-ss-full rounded-se-full`).
   */
  const endCapClasses = computed(() =>
    isVertical()
      ? "absolute z-0 pointer-events-none start-0 w-full h-2.5 rounded-ss-full rounded-se-full -top-2.5"
      : "absolute z-0 pointer-events-none top-0 h-full w-2.5 rounded-se-2xl rounded-ee-2xl -end-2.5",
  );

  /**
   * R-039 / R-069: the start cap's three inset borders, on its color overlay so
   * they draw above the color (left / top / bottom horizontally, left / right /
   * bottom vertically).
   */
  const startCapShadowClasses = computed(() =>
    isVertical()
      ? "shadow-[inset_1px_0_0_0_rgb(0_0_0_/_0.1),inset_-1px_0_0_0_rgb(0_0_0_/_0.1),inset_0_-1px_0_0_rgb(0_0_0_/_0.1)]"
      : "shadow-[inset_1px_0_0_0_rgb(0_0_0_/_0.1),inset_0_1px_0_0_rgb(0_0_0_/_0.1),inset_0_-1px_0_0_rgb(0_0_0_/_0.1)]",
  );

  /** R-043 / R-073: the end cap's three inset borders, on the cap itself (right / top / bottom, or left / right / top). */
  const endCapShadowClasses = computed(() =>
    isVertical()
      ? "shadow-[inset_1px_0_0_0_rgb(0_0_0_/_0.1),inset_-1px_0_0_0_rgb(0_0_0_/_0.1),inset_0_1px_0_0_rgb(0_0_0_/_0.1)]"
      : "shadow-[inset_-1px_0_0_0_rgb(0_0_0_/_0.1),inset_0_1px_0_0_rgb(0_0_0_/_0.1),inset_0_-1px_0_0_rgb(0_0_0_/_0.1)]",
  );

  /**
   * R-034 / R-064: the track's inner border shadow. It is on the gradient layer,
   * which fills the track and carries the gradient color, because an inset
   * shadow on the track itself would be painted under its children.
   */
  const gradientShadowClasses = computed(() =>
    isVertical()
      ? "shadow-[inset_1px_0_0_0_rgb(0_0_0_/_0.1),inset_-1px_0_0_0_rgb(0_0_0_/_0.1)]"
      : "shadow-[inset_0_1px_0_0_rgb(0_0_0_/_0.1),inset_0_-1px_0_0_rgb(0_0_0_/_0.1)]",
  );

  // --- Measurement -----------------------------------------------------------
  // The pointer maths needs the track's border box, which is also what React
  // Aria's `getBoundingClientRect` measured; the caller's `onLayout` still runs.
  const handleLayout = (event: { bounds: Bounds }) => {
    slider?.setTrackSize({
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
    local.onLayout?.(event);
  };

  // --- Pointer ---------------------------------------------------------------
  /**
   * Where a point inside the track falls on the channel, as a 0–1 fraction.
   * The vertical axis counts up from the bottom (R-080 puts the minimum at the
   * bottom), and a horizontal RTL track counts up from the right.
   */
  const percentAt = (x: number, y: number) => {
    const size = slider?.trackSize() ?? { width: 0, height: 0 };
    const length = isVertical() ? size.height : size.width;

    if (length <= 0) {
      return 0;
    }

    const fraction = clamp((isVertical() ? y : x) / length, 0, 1);

    if (isVertical()) {
      return 1 - fraction;
    }

    return isRtl() ? 1 - fraction : fraction;
  };

  const handleStartShouldSetResponder = () => slider !== undefined && !isDisabled();

  const handleGrant = (event: GestureResponderEvent) => {
    if (!slider || isDisabled()) {
      return false;
    }

    slider.state.setPercent(percentAt(event.locationX, event.locationY));
    slider.state.startDragging();
    // React Aria's Track focuses the thumb's input on a press. Focus first,
    // then record the pointer: `onFocus` would otherwise report the keyboard
    // and paint the focus ring after a click (port sheet §2 and §5).
    slider.focusThumb();
    slider.modality.setPointerModality();

    return true;
  };

  const handleMove = (event: GestureResponderEvent) => {
    if (!slider || isDisabled() || !slider.state.isDragging()) {
      return;
    }

    slider.state.setPercent(percentAt(event.locationX, event.locationY));
  };

  const handleRelease = () => {
    if (!slider || !slider.state.isDragging()) {
      return;
    }

    // One `onChangeEnd` per interaction, as React Aria's slider state commits
    // when the last thumb stops dragging (RAC's semantics, not Kobalte's
    // "commit on blur", port sheet §2).
    slider.state.endInteraction();
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    // React Aria's `useHover({ isDisabled })`: a disabled track never hovers.
    if (isDisabled() || isHovered()) {
      return;
    }

    isHovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);

    if (!isHovered()) {
      return;
    }

    isHovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // R-020: the track takes presses (the responder) but is not a focus stop;
      // otherwise Tab would stop here as well as on the thumb.
      focusable={false}
      class={classes()}
      style={resolvedStyle()}
      onLayout={handleLayout}
      onStartShouldSetResponder={handleStartShouldSetResponder}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/*
        R-077: the transparency checkerboard, under the gradient, clipped by this
        layer because the track itself cannot clip (the caps and the thumb stick
        out past it). Only the alpha channel can show it.
      */}
      <If when={isAlpha()}>
        <Checkerboard class="absolute inset-0 overflow-hidden pointer-events-none" />
      </If>

      {/*
        R-076 / R-034 / R-064: the gradient, and the track's inner border shadow.
        It is a sibling layer rather than the track's own background so the
        gradient has one owner and the shadow can draw over it.
      */}
      <View
        class={joinClassNames(
          "absolute inset-0 pointer-events-none",
          gradientShadowClasses(),
        )}
        style={{ backgroundImage: backgroundImage() }}
      />

      {/*
        R-020 / R-040: the start cap (the channel's minimum color). Upstream's
        `::before` also paints the checkerboard under its color, which is only
        visible when that color is translucent, i.e. for alpha.
      */}
      <View class={startCapClasses()}>
        <If when={isAlpha()}>
          <Checkerboard class="absolute inset-0" />
        </If>
        {/* R-078 / R-039 / R-069: the cap color, with its three inset borders. */}
        <View
          class={joinClassNames("absolute inset-0", startCapShadowClasses())}
          style={{ backgroundColor: startColor() }}
        />
      </View>

      {/*
        R-020 / R-044 / R-074 / R-043 / R-073: the end cap's `::after` is a single
        background color plus three inset borders, so one view holds all of it.
      */}
      <View
        class={joinClassNames(endCapClasses(), endCapShadowClasses())}
        style={{ backgroundColor: endColor() }}
      />

      {/*
        The single read of `props.children`, at the placement and after every
        layer, so the thumb (and anything else the caller puts here) draws above
        the gradient and the caps. A one-argument function is the render prop
        (D17); anything else goes through `renderChildren`.
      */}
      {renderTrackChildren(local.children, renderProps())}
    </View>
  );
}

/** A render prop called once, or plain children; both then become real views. */
function renderTrackChildren(
  children: ColorSliderTrackProps["children"],
  values: ColorSliderTrackRenderProps,
): JSX.Element {
  return renderRenderPropChildren(children as JSX.Element, values);
}
