/*
 * HeroUI 3.2.7's `ColorAreaThumb` (`packages/react/src/components/color-area/
 * color-area.tsx`) on NSH's `View`, with Kobalte's thumb behaviour.
 *
 * Upstream's Thumb is React Aria Components' `ColorThumb`: a `div` that draws
 * the current color, positions itself at the two channels' values and contains
 * two hidden `type="range"` inputs — one per channel — which are the real focus
 * stop, the keyboard target and the accessible value.
 *
 * NSH has no range input, no focusable view that presses can move and no DOM
 * style. So the Thumb itself becomes the `role="adjustable"` focus stop (R-023):
 * it carries `accessibilityValue` for the horizontal channel, a text value that
 * names both channels and the color, and its keys through `keymap` while it has
 * the focus. Its `className` / `style` / `children` accept render functions
 * whose values are accessors (D17).
 */

import type {
  JSX,
  MouseEvent as NshMouseEvent,
  StyleProp,
  ViewRef,
  ViewProps,
  ViewStyle,
} from "nsh";
import { computed, PanResponder, signal, split, View } from "nsh";

import { createKeymapScope } from "../../primitives";
import { joinClassNames } from "./class-names";
import { useColorAreaContext } from "./color-area-context";
import type {
  AriaProps,
  DataProps,
  DomEventProps,
  GlobalDomProps,
} from "./color-area-dom-props";
import { viewProps } from "./color-area-dom-props";
import type {
  ColorAreaChildren,
  ColorThumbRenderProps,
} from "./color-area-render-props";
import { renderColorAreaChildren } from "./render-color-area-children";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorArea.Thumb`: HeroUI 3.2.7's `ColorAreaThumbProps`, which is
 * React Aria Components' `ColorThumb` with the DOM surface itself.
 *
 * The state comes from the context, so the Thumb can sit anywhere inside
 * `ColorArea`; only its look, its hover callbacks and its children are props.
 */
export interface ColorAreaThumbProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /**
   * The thumb's content (an icon, a label …), or a function receiving the
   * render props, called once at the placement (D17).
   */
  children?: ColorAreaChildren<ColorThumbRenderProps>;

  /** Appended after the thumb classes; later classes win. A function receives the render props. */
  className?: string | ((values: ColorThumbRenderProps) => string);

  /** The inline style; a function receives the render props. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorThumbRenderProps) => StyleProp<ViewStyle>);

  /** The pointer entered the thumb. */
  onHoverStart?: (event: NshMouseEvent) => void;

  /** The pointer left the thumb. */
  onHoverEnd?: (event: NshMouseEvent) => void;

  /** Every hover change, in both directions. */
  onHoverChange?: (isHovering: boolean) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: a `<div>`'s native tooltip does not exist in NSH. */
  title?: string;

  /** Accepted, no effect: NSH moves focus between pressables, not through a `tabIndex`. */
  tabIndex?: number;

  /** Forwarded to the thumb `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * ColorArea Thumb
 * -----------------------------------------------------------------------------------------------*/

/**
 * ColorAreaThumb draws the current color and is the area's one control: it
 * takes the pointer drag (R-022), the keyboard (R-023) and the focus ring
 * (R-016), and it is the element assistive technologies reach (R-024).
 */
export function ColorAreaThumb(props: ColorAreaThumbProps): JSX.Element {
  const context = useColorAreaContext();
  const { state, slots, isDisabled, direction, modality, displayColor } =
    context;

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onFocus",
    "onBlur",
    "onMouseEnter",
    "onMouseLeave",
    "ref",
    "id",
    "nativeID",
    "focusable",
    "role",
    "aria-label",
    "accessibilityLabel",
  ] as const);

  const isHovered = signal(false);
  const isFocused = context.isFocused;

  // R-016: only a keyboard interaction shows the ring; NSH's `focus-visible:`
  // is the same as `focus:`, so the modality decides.
  const isFocusVisible = computed(
    () => isFocused() && modality.isKeyboard(),
  );

  const renderProps: ColorThumbRenderProps = {
    color: displayColor,
    isDragging: state.isDragging,
    isHovered,
    isFocused,
    isFocusVisible,
    isDisabled,
  };

  /* -------------------------------------------------------------------------------------------
   * Accessibility (R-023, R-024)
   * ----------------------------------------------------------------------------------------- */

  const channelText = (channel: "x" | "y") => {
    const color = state.value();
    const resolved = state.channels()[channel === "x" ? "xChannel" : "yChannel"];

    return `${color.getChannelName(resolved)} ${color.formatChannelValue(resolved)}`;
  };

  const colorName = () => state.value().getColorName();

  /**
   * Kobalte's thumb name: the two channels and the color, prefixed by the
   * caller's `aria-label` when there is one (port sheet §2). It reads the same
   * values as `accessibilityValue`'s `text`, which is what a screen reader
   * announces while the value changes.
   */
  const accessibilityLabel = computed(() =>
    [
      local["aria-label"] ?? context.ariaLabel(),
      channelText("x"),
      channelText("y"),
      colorName(),
    ]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(", "),
  );

  const accessibilityValue = computed(() => ({
    min: state.xMinValue(),
    max: state.xMaxValue(),
    now: state.xValue(),
    text: [channelText("x"), channelText("y"), colorName()].join(", "),
  }));

  /* -------------------------------------------------------------------------------------------
   * Keyboard (R-023)
   * ----------------------------------------------------------------------------------------- */

  // Every step reports a keyboard interaction, so the focus ring is right even
  // when the first key arrives long after a pointer drag.
  const step = (apply: () => void) => {
    if (isDisabled()) {
      return;
    }

    modality.setKeyboardModality();
    apply();
  };

  const isRtl = () => direction() === "rtl";

  // RAC's mapping: arrows move one channel step, Shift / Page keys one page,
  // Home / End jump horizontally, and Left / Right swap in a right-to-left
  // locale. Shift on Home / End / Page never changes the amount upstream.
  const bindings: Record<string, () => void> = {
    left: () =>
      step(() =>
        isRtl()
          ? state.incrementX(state.xStep())
          : state.decrementX(state.xStep()),
      ),
    "shift+left": () =>
      step(() =>
        isRtl()
          ? state.incrementX(state.xPageSize())
          : state.decrementX(state.xPageSize()),
      ),
    right: () =>
      step(() =>
        isRtl()
          ? state.decrementX(state.xStep())
          : state.incrementX(state.xStep()),
      ),
    "shift+right": () =>
      step(() =>
        isRtl()
          ? state.decrementX(state.xPageSize())
          : state.incrementX(state.xPageSize()),
      ),
    up: () => step(() => state.incrementY(state.yStep())),
    "shift+up": () => step(() => state.incrementY(state.yPageSize())),
    down: () => step(() => state.decrementY(state.yStep())),
    "shift+down": () => step(() => state.decrementY(state.yPageSize())),
    home: () =>
      step(() =>
        isRtl()
          ? state.incrementX(state.xPageSize())
          : state.decrementX(state.xPageSize()),
      ),
    "shift+home": () =>
      step(() =>
        isRtl()
          ? state.incrementX(state.xPageSize())
          : state.decrementX(state.xPageSize()),
      ),
    end: () =>
      step(() =>
        isRtl()
          ? state.decrementX(state.xPageSize())
          : state.incrementX(state.xPageSize()),
      ),
    "shift+end": () =>
      step(() =>
        isRtl()
          ? state.decrementX(state.xPageSize())
          : state.incrementX(state.xPageSize()),
      ),
    pageup: () => step(() => state.incrementY(state.yPageSize())),
    "shift+pageup": () => step(() => state.incrementY(state.yPageSize())),
    pagedown: () => step(() => state.decrementY(state.yPageSize())),
    "shift+pagedown": () => step(() => state.decrementY(state.yPageSize())),
  };

  // Bound only while this thumb has the focus, and dropped on blur or unmount
  // (`_common`: list keys never use `when: "always"`).
  createKeymapScope({
    isActive: isFocused,
    bindings,
    options: { repeat: true },
  });

  /* -------------------------------------------------------------------------------------------
   * Pointer (R-022)
   * ----------------------------------------------------------------------------------------- */

  // A press that lands on the thumb keeps the value and drags from it; the
  // panel's responder (on the root) never sees it, because the deepest
  // responder that claims the press wins.
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isDisabled(),
    onPanResponderGrant: () => context.beginThumbDrag(),
    onPanResponderMove: (_event, gesture) =>
      context.moveThumbDrag(gesture.dx, gesture.dy),
    onPanResponderRelease: () => context.endThumbDrag(),
    onPanResponderTerminate: () => context.endThumbDrag(),
  });

  /* -------------------------------------------------------------------------------------------
   * Hover
   * ----------------------------------------------------------------------------------------- */

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

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

  /* -------------------------------------------------------------------------------------------
   * Focus
   * ----------------------------------------------------------------------------------------- */

  const handleFocus = () => {
    context.setFocused(true);

    // A `focus()` after a pointer press is not a focus-visible interaction.
    if (context.consumePointerFocus()) {
      modality.setPointerModality();
    } else {
      modality.onFocus();
    }

    local.onFocus?.();
  };

  const handleBlur = () => {
    context.setFocused(false);
    local.onBlur?.();
  };

  /* -------------------------------------------------------------------------------------------
   * Look
   * ----------------------------------------------------------------------------------------- */

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() =>
    joinClassNames(slots().thumb(), resolvedClassName()),
  );

  // R-020: the absolute position, from each channel's fraction; `y` is the
  // value fraction, so the top edge is `1 - y`. The half-size offsets are
  // margins, not `translate(-50%, -50%)`: NSH's `onLayout` and `measure()` do
  // not apply transforms, so a translated thumb would report a box 8 points off
  // its drawn center (and the geometry tests' only channel is that box). R-011 /
  // R-021: the fill is the display color (alpha forced to 1), the only inline
  // color.
  const thumbStyle = computed<StyleProp<ViewStyle>>(() => {
    const position = state.getThumbPosition();
    // R-017: the thumb is 16 points, 20 while dragging.
    const halfSize = state.isDragging() ? 10 : 8;

    return [
      {
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        marginLeft: -halfSize,
        marginTop: -halfSize,
        backgroundColor: displayColor().toString("css"),
      },
      typeof local.style === "function" ? local.style(renderProps) : local.style,
    ];
  });

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => {
        context.setThumbRef(node);
        local.ref?.(node);
      }}
      nativeID={local.id ?? local.nativeID}
      // R-023: the role, the value and the Tab stop live on the thumb itself,
      // where React Aria keeps them on the horizontal hidden input. A disabled
      // thumb leaves the Tab order.
      role="adjustable"
      focusable={local.focusable ?? !isDisabled()}
      disabled={isDisabled()}
      accessibilityState={{ disabled: isDisabled() }}
      accessibilityLabel={accessibilityLabel()}
      accessibilityValue={accessibilityValue()}
      class={classes()}
      classList={{
        // R-016: `status-focused` → the 2px focus ring, offset from the background.
        "ring-2 ring-focus ring-offset-2 ring-offset-background outline-none":
          isFocusVisible(),
        // R-017: `.color-area__thumb[data-dragging="true"]` → `size-5`; the base
        // size is written here too, so one owner decides the thumb's size.
        "size-5": state.isDragging(),
        "size-4": !state.isDragging(),
        // R-018: `status-disabled` → the literal 0.5 opacity and disabled cursor.
        "opacity-50 cursor-not-allowed": isDisabled(),
      }}
      style={thumbStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...panResponder.panHandlers}
    >
      {/*
        The single read of `props.children`, at the placement. A bare string
        becomes a `Text` because a `View` draws none.
      */}
      {renderColorAreaChildren(
        local.children as ColorAreaChildren<ColorThumbRenderProps>,
        renderProps,
      )}
    </View>
  );
}
