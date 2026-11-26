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
import { cleanup, computed, createAnimatedValue, signal, split, View } from "nsh";

import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { createInput } from "../../primitives/environment";
import { createPan } from "../../primitives/pan";
import { createPressFeedback, PressableFeedbackContext } from "../../primitives/pressable";
import type { PressableFeedbackContextValue } from "../../primitives/pressable";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "./color-slider-dom-props";
import { hostProps } from "./color-slider-dom-props";
import type { ColorSliderPan, ColorSliderThumbRenderProps } from "./color-slider-context";
import {
  ColorSliderContext,
  ColorSliderPanContext,
  EMPTY_COLOR_SLIDER_STATE,
} from "./color-slider-context";
import {
  claimSliderTouch,
  markThumbTouch,
  releaseSliderTouch,
  releaseThumbTouch,
  setThumbHitArea,
  sliderTouchClaimed,
} from "./color-slider-pan-state";
import { renderRenderPropChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Thumb props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorSlider.Thumb`: HeroUI 3.2.7's `ColorSliderThumbProps`,
 * which is React Aria Components' `ColorThumb` (`HoverEvents`, `children`,
 * `className`, `style`), expressed with NSH's view host props.
 *
 * HeroUI exposes no focus props on the thumb, because the hidden input owned
 * the focus; here the thumb is the focus stop, so `onFocus` / `onBlur` are
 * forwarded too (additive, port sheet §1).
 */
export interface ColorSliderThumbProps
  extends Omit<ViewProps, "children" | "class" | "style" | "role" | keyof DomEventProps>,
    AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /** The thumb's content, or a render prop called once with its accessors (D17). */
  children?:
    | JSX.Element
    | ((values: ColorSliderThumbRenderProps) => JSX.Element);

  /** Appended after the slot classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: ColorSliderThumbRenderProps) => string | undefined);

  /** Style of the thumb; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorSliderThumbRenderProps) => StyleProp<ViewStyle>);

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The pointer entered the thumb (off while disabled). */
  onHoverStart?: (event: NshMouseEvent) => void;

  /** The pointer left the thumb. */
  onHoverEnd?: (event: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /**
   * The thumb's own accessible name, below the root's `aria-label` and the
   * `Label` inside the root (upstream names the input through `aria-labelledby`).
   */
  "aria-label"?: string;

  /** The accessible name through the host prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** Forwarded to the thumb `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Thumb
 * -----------------------------------------------------------------------------------------------*/

/**
 * ColorSlider.Thumb / ColorSliderThumb: the draggable knob, and the slider's
 * accessible element.
 *
 * Upstream the knob is a decoration around a visually hidden
 * `<input type="range">`: Tab stops on the input, the arrow keys are the
 * browser's, and `aria-valuemin` / `aria-valuemax` / `aria-valuenow` /
 * `aria-valuetext` come from the slider state. NSH has no such input, so the
 * thumb itself is `role="adjustable"` and `focusable`, its values go to
 * `accessibilityValue`, and its keys are a keymap scope bound only while it has
 * the focus (port sheet §2 and §5).
 *
 * It also owns the drag: React Aria's `useSliderThumb` starts from the current
 * percentage on press and applies the movement as a delta, never jumping to the
 * finger, which is what the responder handlers below do.
 */
export function ColorSliderThumb(props: ColorSliderThumbProps): JSX.Element {
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
    "onTouchStart",
    "onTouchEnd",
    "onTouchCancel",
    "onFocus",
    "onBlur",
    "aria-label",
    "accessibilityLabel",
  ] as const);

  // Read once, in the body: the slider this thumb belongs to, if any.
  const slider = ColorSliderContext();

  const isVertical = () => slider?.orientation() === "vertical";
  const isDisabled = () => slider?.isDisabled() ?? false;
  const isRtl = () => slider?.rtl() ?? false;

  const isFocused = signal(false);
  const isHovered = signal(false);

  // R-027: React Aria's `useFocusRing`; a pointer press does not focus a view,
  // and the Track records the pointer after focusing, so keyboard focus is the
  // only way the ring appears.
  const isFocusVisible = computed(
    () => isFocused() && (slider?.modality.isKeyboard() ?? false),
  );

  const renderProps = (): ColorSliderThumbRenderProps => ({
    color: (slider?.publicState ?? EMPTY_COLOR_SLIDER_STATE).displayColor,
    isDragging: () => slider?.state.isDragging() ?? false,
    isHovered,
    isFocused,
    isFocusVisible,
    isDisabled: () => slider?.isDisabled() ?? false,
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
   * R-045 / R-075: the thumb's size and its cross-axis position, per
   * orientation. R-081 is deleted: RAC also writes `forced-color-adjust: none`,
   * and NSH has neither a forced-colors mode nor that style key.
   */
  const sizeClasses = computed(() =>
    isVertical() ? "left-1/2 size-4" : "top-1/2 size-4",
  );

  // R-021 … R-025 in `color-slider.styles.ts`, then the orientation's size and
  // cross-axis class, then the caller's `className`.
  const classes = computed(() =>
    joinClassNames(slider?.slots.thumb(), sizeClasses(), resolvedClassName()),
  );

  /** R-080: the position along the slider's axis, as a percentage. */
  const positionStyle = computed<ViewStyle>(() => {
    const percent = slider?.state.getThumbPercent() ?? 0;

    // The vertical axis counts up from the bottom, and a horizontal RTL track
    // counts up from the right (`left` stays physical, as RAC writes it).
    const position = (isVertical() || isRtl() ? 1 - percent : percent) * 100;

    return isVertical() ? { top: `${position}%` } : { left: `${position}%` };
  });

  /**
   * R-079 / R-080: the thumb's own paint. `translate` centres it on the
   * position; the background is the display color, and a disabled thumb drops
   * the inline color so the slot's `bg-default` (R-028) shows through.
   */
  const thumbStyle = computed<ViewStyle>(() => ({
    ...positionStyle(),
    translate: "-50% -50%",
    backgroundColor: isDisabled()
      ? undefined
      : slider?.state.displayColor().toString("css"),
  }));

  // --- Seams (adapt sheet A-001 / A-003 / A-005) ------------------------------
  const input = createInput();

  // A-001: the press-feedback seam, consuming only the `hitSlop`/`layout`
  // half-channel — the thumb walks the responder system, not press events, so
  // `pressDown`/`pressUp`/`scale`/`isPressed` stay unwired. Under the default
  // pointer environment `enabled` is false and `hitSlop()` answers
  // `undefined`; under touch the 16pt knob is padded to the 44pt minimum.
  const feedbackEnabled = () => input() === "touch" && !isDisabled();
  const feedback = createPressFeedback({ enabled: feedbackEnabled });

  // The seam's read half for the fixture's `CtxProbe` (`hitSlop` is a view
  // prop with no other observable surface, sheet §6); the children mount once
  // inside the provider at the placement.
  const feedbackValue: PressableFeedbackContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    scale: feedback.scale,
    highlightOpacity: createAnimatedValue(0),
    rippleProgress: createAnimatedValue(0),
    enabled: feedbackEnabled,
    hitSlop: feedback.hitSlop,
    isAllAnimationsDisabled: () => false,
  };

  // A-002 in `handleLayout` below: `bounds` feeds `hitSlop`, the caller's
  // `onLayout` still runs.
  const handleLayout = (event: { bounds: Bounds }) => {
    feedback.layout(event);
    local.onLayout?.(event);
  };

  // --- Pointer ---------------------------------------------------------------
  // A drag applies the movement since the press as a fraction of the track, so
  // grabbing the knob never jumps it under the finger; `pageX` / `pageY` are
  // surface coordinates, so a clipped pointer still yields a true delta.
  let startPage = { x: 0, y: 0 };
  let startPercent = 0;

  // A-003: the bare responder chain is the desktop path. Under touch the
  // predicates below stay false and `pan` claims instead — the native Scroll
  // recognizer would otherwise take an axial drag through a JS-claimed bare
  // responder without ever asking `onResponderTerminationRequest` (sheet §6),
  // so the arbitration lives in the pan's `shouldClaim`, not in a gate on the
  // grant.
  const handleStartShouldSetResponder = () =>
    input() !== "touch" && slider !== undefined && !isDisabled();

  // The grant half of a drag or tap: the drag's baseline plus React Aria's
  // "press is an interaction" (startDragging → focus → pointer modality).
  const beginDrag = (pageX: number, pageY: number) => {
    if (!slider || isDisabled()) {
      return false;
    }

    startPage = { x: pageX, y: pageY };
    startPercent = slider.state.getThumbPercent();
    slider.state.startDragging();
    // React Aria's `useSliderThumb` focuses the hidden input on a press; the
    // pointer modality is recorded after it, so this focus does not paint the
    // keyboard ring (port sheet §2).
    node?.focus();
    slider.modality.setPointerModality();

    return true;
  };

  const handleGrant = (event: GestureResponderEvent) =>
    beginDrag(event.pageX, event.pageY);

  const handleMove = (event: GestureResponderEvent) => {
    if (!slider || isDisabled() || !slider.state.isDragging()) {
      return;
    }

    const size = slider.trackSize();
    const length = isVertical() ? size.height : size.width;

    if (length <= 0) {
      return;
    }

    const delta = isVertical()
      ? startPage.y - event.pageY
      : isRtl()
        ? startPage.x - event.pageX
        : event.pageX - startPage.x;

    slider.state.setPercent(startPercent + delta / length);
  };

  const handleRelease = () => {
    if (!slider || !slider.state.isDragging()) {
      return;
    }

    slider.state.endInteraction();
  };

  // A-003: the touch path. `shouldClaim` is the first-frame axial-dominance
  // test — a move along the slider's axis is a drag on the thumb, a cross-axis
  // or ambiguous one is the surrounding Scroll's. Once the pan holds the
  // touches `onShouldBlockNativeResponder` keeps the Scroll from taking them
  // back.
  const pan = createPan({
    enabled: () => input() === "touch",
    shouldClaim: (_event, gesture) => {
      if (slider === undefined || isDisabled()) {
        return false;
      }

      const along = isVertical() ? gesture.dy : gesture.dx;
      const across = isVertical() ? gesture.dx : gesture.dy;

      return along !== 0 && Math.abs(across) < Math.abs(along);
    },
    onDragStart: (event, gesture) => {
      claimSliderTouch(event.identifier);
      // `x0`/`y0` is where the finger went down, not where the first dominant
      // move fired: the pre-claim travel is part of the drag's delta, exactly
      // as the bare grant's `event.pageX`/`pageY` baseline is.
      beginDrag(gesture.x0, gesture.y0);
    },
    onDrag: (event) => handleMove(event),
    onDragEnd: () => handleRelease(),
  });

  // The pan's probe surface (the `panKeys` count under the default
  // environment is the negative assertion that no gesture path mounted).
  const panValue: ColorSliderPan = {
    panHandlers: pan.panHandlers,
    active: pan.active,
  };

  // The one handler that always runs at finger-down, before any move-frame
  // claim: it publishes the thumb's slop-expanded hit area in surface
  // coordinates (`pageX - locationX` is the border-box origin for a touch on
  // the thumb itself, and goes negative inside the slop). The track's
  // capture claim — asked before the target's own, on every move frame —
  // consults the frame to defer drags that went down on the thumb. The
  // ledger's reused-identifier cleanup also lives here, before the gesture.
  const handleTouchStart = (event: GestureResponderEvent) => {
    const rawSlop = feedback.hitSlop();
    // The seam answers a `Partial<Edges>` here, but the prop type also takes a
    // bare number (equal on all four sides) — normalize before reading.
    const slop =
      typeof rawSlop === "number"
        ? { top: rawSlop, right: rawSlop, bottom: rawSlop, left: rawSlop }
        : (rawSlop ?? {});
    const size = feedback.bounds();

    setThumbHitArea({
      x: event.pageX - event.locationX - (slop.left ?? 0),
      y: event.pageY - event.locationY - (slop.top ?? 0),
      width: size.width + (slop.left ?? 0) + (slop.right ?? 0),
      height: size.height + (slop.top ?? 0) + (slop.bottom ?? 0),
    });
    // The identifier ledger is the space-free half of the track's deferral:
    // a finger this handler answered is inside the thumb's hit test whatever
    // space the host reports the frame above in (Android's touch-start
    // `locationX` arrives surface-relative there — the geometric frame the
    // line above computes sits in the wrong space).
    markThumbTouch(event.identifier);
    releaseSliderTouch(event.identifier);
    local.onTouchStart?.(event);
  };

  // A touch tap never produces a move frame, so `shouldClaim` is never asked
  // and the gated bare chain never runs; `onTouchEnd` commits the tap instead.
  // A touch the pan claimed (or one the Scroll took) is skipped by the claim
  // ledger — and claimed or not, the thumb ends the propagation so the track
  // cannot also commit the same finger.
  const handleTouchEnd = (event: GestureResponderEvent) => {
    setThumbHitArea(null);
    releaseThumbTouch(event.identifier);
    // The caller's raw touch callback is always reported; the tap commit
    // below is the touch-only half.
    local.onTouchEnd?.(event);

    if (input() !== "touch") {
      return;
    }

    event.stopPropagation();

    if (sliderTouchClaimed(event.identifier)) {
      releaseSliderTouch(event.identifier);
      return;
    }

    // The tap's commit is `handleGrant` + `handleRelease` verbatim: an
    // interaction with no value change, exactly what a bare grant-then-release
    // commits on the desktop.
    if (beginDrag(event.pageX, event.pageY)) {
      handleRelease();
    }
  };

  const handleTouchCancel = (event: GestureResponderEvent) => {
    setThumbHitArea(null);
    releaseThumbTouch(event.identifier);
    releaseSliderTouch(event.identifier);
    local.onTouchCancel?.(event);
  };

  // --- Hover -----------------------------------------------------------------
  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    // A-005: under touch the hover signal stays off entirely, so a web sticky
    // hover cannot pin `isHovered` after a press (the tabs A-002 ruling: host
    // hover callbacks do not pass under touch, only the raw `onMouseEnter` /
    // `onMouseLeave` passthrough does).
    if (input() === "touch" || isDisabled() || isHovered()) {
      return;
    }

    isHovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);

    if (input() === "touch" || !isHovered()) {
      return;
    }

    isHovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  // --- Focus -----------------------------------------------------------------
  const handleFocus = () => {
    isFocused.set(true);
    // V4: a view is focused by Tab on macOS and the web; the Track's press
    // focuses the thumb and then records the pointer, so this listener only
    // sees keyboard focus in practice.
    slider?.modality.onFocus();
    local.onFocus?.();
  };

  const handleBlur = () => {
    isFocused.set(false);
    local.onBlur?.();
  };

  let node: ViewRef | undefined;

  const handleRef = (next: ViewRef) => {
    node = next;
    slider?.registerThumb(next);
    local.ref?.(next);
  };

  cleanup(() => {
    slider?.registerThumb(undefined);
    setThumbHitArea(null);
  });

  // --- Keyboard --------------------------------------------------------------
  /**
   * One key press is one committed change: React Aria's slider state marks the
   * thumb dragging for the duration of the keystroke and clears it after, which
   * is what fires `onChangeEnd` per press (port sheet §2, "键盘每按一次方向键
   * 就提交一次"). Kobalte's "commit on blur" is the difference the sheet calls
   * out.
   */
  const stepBy = (direction: 1 | -1, stepSize?: number) => {
    if (!slider || isDisabled()) {
      return;
    }

    slider.modality.setKeyboardModality();
    slider.state.startDragging();
    slider.state.step(direction, stepSize);
    slider.state.endInteraction();
  };

  /**
   * R-083's key map, as React Aria's `useSliderThumb` binds it: arrows move one
   * step (Left / Down down, Right / Up up, the two horizontal ones swapped when
   * the layout is right-to-left), Shift+arrows and PageUp / PageDown move one
   * `pageSize`, Home / End jump to the channel's ends.
   */
  const stepAlongAxis = (direction: 1 | -1, stepSize?: number) => {
    const flipped = isRtl() && !isVertical();

    stepBy(flipped ? ((-direction) as 1 | -1) : direction, stepSize);
  };

  const jumpToEnd = (end: "min" | "max") => {
    if (!slider || isDisabled()) {
      return;
    }

    slider.modality.setKeyboardModality();
    slider.state.startDragging();

    if (end === "min") {
      slider.state.setToMin();
    } else {
      slider.state.setToMax();
    }

    slider.state.endInteraction();
  };

  const pageSize = () => slider?.state.pageSize() ?? 1;

  createKeymapScope({
    isActive: () => isFocused() && !isDisabled(),
    bindings: slider
      ? {
          // `keymap` names the arrows "left" / "right" / "up" / "down"
          // (`nsh/index.d.ts` `Keymap`); "arrowleft" is not a keystroke and a
          // binding of it never fires.
          left: () => stepAlongAxis(-1),
          right: () => stepAlongAxis(1),
          up: () => stepBy(1),
          down: () => stepBy(-1),
          "shift+left": () => stepAlongAxis(-1, pageSize()),
          "shift+right": () => stepAlongAxis(1, pageSize()),
          "shift+up": () => stepBy(1, pageSize()),
          "shift+down": () => stepBy(-1, pageSize()),
          pageup: () => stepBy(1, pageSize()),
          pagedown: () => stepBy(-1, pageSize()),
          home: () => jumpToEnd("min"),
          end: () => jumpToEnd("max"),
        }
      : {},
    options: { repeat: true },
  });

  /** R-083: the assistive-technology actions a range element offers. */
  const handleAccessibilityAction = (event: { actionName: string }) => {
    if (event.actionName === "increment") {
      stepBy(1);
    } else if (event.actionName === "decrement") {
      stepBy(-1);
    }
  };

  // --- Class state -----------------------------------------------------------
  const isDragging = () => slider?.state.isDragging() ?? false;

  return (
    <View
      {...hostProps(rest)}
      ref={handleRef}
      nativeID={local.id ?? local.nativeID}
      // R-083: the transport of React Aria's `role="slider"` on the hidden
      // input. `adjustable` is NSH's name for the same semantics.
      role="adjustable"
      // Upstream the input is focusable; a disabled thumb is not.
      focusable={local.focusable ?? !isDisabled()}
      accessibilityLabel={
        local["aria-label"] ??
        local.accessibilityLabel ??
        slider?.accessibleName()
      }
      accessibilityValue={{
        min: slider?.state.getThumbMinValue() ?? 0,
        max: slider?.state.getThumbMaxValue() ?? 1,
        now: slider?.state.getThumbValue() ?? 0,
        text: slider?.state.valueText() ?? "",
      }}
      accessibilityState={{ disabled: isDisabled() }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={handleAccessibilityAction}
      class={classes()}
      classList={{
        // R-026: `[data-dragging="true"]` → `cursor-grabbing`.
        "cursor-grabbing": isDragging(),
        // R-027: `[data-focus-visible="true"]` → `status-focused` (`ring-2
        // ring-focus`, a 2-point page-coloured offset, no outline). R-027's
        // `z-10` is the static `z-10` of the thumb slot: changing `z-index` on
        // the focused view drops the web focus (color-slider.styles.ts, R-023).
        "ring-2 ring-focus ring-offset-[2px] ring-offset-background outline-none":
          isFocusVisible(),
        // R-028: `[data-disabled="true"]` → `cursor-default bg-default`; the
        // inline background color is dropped while disabled (R-079).
        "cursor-default bg-default": isDisabled(),
      }}
      style={[thumbStyle(), resolvedStyle()]}
      // A-001: the seam's view-prop half — `hitSlop` is undefined under the
      // pointer environment (the prop lands but expands nothing) and pads the
      // 16pt knob to the 44pt minimum under touch.
      hitSlop={feedback.hitSlop()}
      onLayout={handleLayout}
      onStartShouldSetResponder={handleStartShouldSetResponder}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
      // A-003: the touch-gated pan spreads after the bare chain — JSX's
      // last-prop-wins hands the responder lane to the pan's emitted props
      // under touch (the ShouldSet pairs, grant/move/release/terminate, the
      // termination request and the native block), so `shouldClaim` runs and
      // `onPanResponderGrant` drives `onDragStart`/`active`. Under the
      // pointer environment `panHandlers()` resolves to `{}` — the spread
      // mounts nothing and the gated bare chain above keeps the desktop
      // path. Spread first instead, these own props would shadow the pan's
      // emitted keys and its whole lifecycle would never run.
      {...pan.panHandlers()}
      // The part's own raw touch handlers stay bound after the spread: the
      // pan emits none, and the hit-area publish plus the tap compensation
      // below need them.
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* A-001/A-003: the seams' probe surfaces wrap the children; the single
          children read still happens exactly once, inside the providers. */}
      <PressableFeedbackContext.Provider value={feedbackValue}>
        <ColorSliderPanContext.Provider value={panValue}>
          {renderRenderPropChildren(local.children as JSX.Element, renderProps())}
        </ColorSliderPanContext.Provider>
      </PressableFeedbackContext.Provider>
    </View>
  );
}
