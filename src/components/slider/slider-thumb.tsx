import type {
  AccessibilityState,
  GestureResponderEvent,
  JSX,
  MouseEvent as NshMouseEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, effect, signal, split, untracked, View } from "nsh";

import {
  createInteractionModality,
  type InteractionModalityState,
} from "../../primitives/create-interaction-modality";
import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { shadow } from "../../tokens/geometry";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { joinClassNames } from "./class-names";
import type { SliderThumbRenderProps } from "./slider-context";
import { SliderContext } from "./slider-context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./slider-dom-props";
import type { Orientation } from "./slider.utils";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Slider Thumb
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Slider.Thumb`: HeroUI 3.2.7's `SliderThumbProps`, which is
 * React Aria Components' `SliderThumb` — the value index, the deprecated
 * per-thumb `orientation`, the accessibility relations, the focus / hover
 * events and the hidden input's form props.
 */
export interface SliderThumbProps
  extends Omit<
      ViewProps,
      "children" | "class" | "style" | "role"
    >,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The thumb's content, or a render prop called once with the thumb's state
   * (D17: accessors). A `Label` placed here names this thumb only.
   */
  children?: JSX.Element | ((values: SliderThumbRenderProps) => JSX.Element);

  /**
   * Appended after the slot classes; later classes win. The function form
   * gets the same accessors the render prop gets.
   */
  className?: string | ((values: SliderThumbRenderProps) => string | undefined);

  /** Style of the thumb; the function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: SliderThumbRenderProps) => StyleProp<ViewStyle>);

  /** Which value of the range this thumb edits. @default 0 */
  index?: number;

  /**
   * The thumb's own travel axis. Deprecated upstream, and it never overrides
   * the root's grid: it moves this thumb and its drag along the given axis
   * even when the root is laid out along the other one.
   */
  orientation?: Orientation;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The thumb's name, taking precedence over a Label inside it and the root's. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-errormessage"?: string;

  /** The thumb is disabled; taken together with the root's. */
  isDisabled?: boolean;

  /** Focuses this thumb after mount (macOS and the web). @default false */
  autoFocus?: boolean;

  /** React Aria's `FocusableProps.onFocusChange`: `true` on focus, `false` on blur. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;
  form?: string;

  /** Accepted, no effect upstream too: deprecated validation props. */
  isRequired?: boolean;
  isInvalid?: boolean;

  /** Accepted, no effect: there is no hidden input to hold a ref to. */
  inputRef?: unknown;

  /** The pointer entered the thumb (off while disabled). */
  onHoverStart?: (e: NshMouseEvent) => void;

  /** The pointer left the thumb. */
  onHoverEnd?: (e: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /** React's list identity; never reaches the host. */
  key?: string | number;

  /** Forwarded to the `View` host as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * R-027 / R-028: the thumb's visible block. Upstream is the `::after`
 * pseudo-element; NSH has no pseudo-elements, so it is a real, empty child
 * view with the same declarations.
 * R-029: `origin-center transition-all motion-reduce:transition-none`.
 * R-031 / R-032: while dragging it scales to 0.9, cancelled by reduced motion.
 */
const THUMB_VISUAL_CLASSES =
  `relative z-10 rounded-lg bg-accent-foreground text-black ${shadow.field.both} origin-center transition-all motion-reduce:transition-none`;

/**
 * Slider.Thumb / SliderThumb: one draggable value.
 *
 * Upstream is a hidden `<input type="range">` wrapped by a styled `span`; in
 * NSH the thumb view itself is the adjustable element: `role="adjustable"`,
 * `accessibilityValue` with min / max / now / text, `focusable`, the keyboard
 * bound only while it holds the focus, and the responder system for dragging
 * (port sheet section 5).
 */
export function SliderThumb(props: SliderThumbProps): JSX.Element {
  const [local, rest] = split(props, [
    "key",
    "children",
    "className",
    "style",
    "index",
    "orientation",
    "id",
    "nativeID",
    "ref",
    "slot",
    "render",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "accessibilityLabel",
    "accessibilityState",
    "isDisabled",
    "autoFocus",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "name",
    "form",
    "isRequired",
    "isInvalid",
    "inputRef",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // Read once, in the body: the slider this thumb belongs to, if any.
  const slider = SliderContext();

  const index = computed(() => local.index ?? 0);

  // RAC's `useSliderThumb.ts:108-114`: `isVertical` is the thumb's own
  // `orientation` when given, else the root's. It decides this thumb's
  // position axis and drag axis, never the root's grid.
  const isVertical = computed(
    () => (local.orientation ?? slider?.orientation() ?? "horizontal") === "vertical",
  );

  // HeroUI sizes and centres the thumb from the root's `[data-orientation]`
  // (styles/components/slider.css:167-182, :247-263), so the deprecated
  // per-thumb `orientation` only moves this thumb; it does not resize it.
  const isRootVertical = computed(() => slider?.orientation() === "vertical");

  const isDisabled = computed(
    () => (local.isDisabled ?? false) || (slider?.isDisabled() ?? false),
  );

  const state = slider?.state;
  const modality: InteractionModalityState | undefined =
    slider?.modality ?? createInteractionModality();

  const value = computed(() => state?.values()[index()] ?? 0);
  const percent = computed(() => state?.getThumbPercent(index()) ?? 0);

  // --- Local interaction state ----------------------------------------------
  const hovered = signal(false);
  const focused = signal(false);

  // R-033: the ring is `:focus-visible`'s, so it shows for a keyboard focus
  // and not for a press; the shared modality is what tells them apart.
  const isFocusVisible = computed(() => focused() && modality?.isKeyboard() === true);

  // --- Local label (a Label placed inside this thumb names it) ---------------
  const labelTexts = signal<readonly (() => string | undefined)[]>([]);

  const registerLabel = (text: () => string | undefined) => {
    labelTexts.update((current) => [...current, text]);

    return () => {
      labelTexts.update((current) => current.filter((entry) => entry !== text));
    };
  };

  const localLabelText = computed(() => {
    const text = labelTexts()
      .map((entry) => entry())
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      .join(" ");

    return text.length > 0 ? text : undefined;
  });

  // --- Ref and registration --------------------------------------------------
  let node: ViewRef | undefined;
  let unregister: (() => void) | undefined;

  const handleRef = (next: ViewRef) => {
    local.ref?.(next);
    node = next;
    unregister?.();
    unregister = slider?.registerThumb(index(), next);
  };

  cleanup(() => unregister?.());

  // RAC's `useSliderThumb` marks the thumb editable when it mounts; the value
  // writes are refused while it is not, which is how a disabled thumb ignores
  // the pointer (port sheet section 2).
  effect(() => {
    slider?.state.setThumbEditable(index(), !isDisabled());
  });

  // `autoFocus` focuses the thumb's hidden input upstream; here the view is
  // the focus stop, and only macOS and the web honour `focus()` on a view.
  effect(() => {
    if (local.autoFocus === true) {
      node?.focus();
    }
  });

  // The caller's own focus field, inside this thumb only.
  const fieldState: FieldState = {
    registerLabel,
    partClass: () => "w-fit text-sm font-medium",
    focusField: () => {
      node?.focus();
      modality?.setKeyboardModality();
    },
  };

  // --- Keyboard --------------------------------------------------------------
  // RAC's `useSliderThumb.onKeyDown` (`useSlider.ts`): arrows one step, with
  // Shift or PageUp / PageDown one page, Home / End the thumb's bounds, and
  // left / right mirrored in an RTL locale. Each key is one committed
  // interaction: the dragging flag brackets it, so `onChangeEnd` fires once.
  const withDragging = (change: () => void) => {
    if (!state) {
      return;
    }

    const at = index();

    state.setThumbDragging(at, true);
    change();
    state.setThumbDragging(at, false);
  };

  const stepBy = (direction: 1 | -1, page: boolean) => {
    if (!state) {
      return;
    }

    const amount = page ? state.pageSize() : state.step();

    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    withDragging(() => {
      if (direction > 0) {
        state.incrementThumb(index(), amount);
      } else {
        state.decrementThumb(index(), amount);
      }
    });
  };

  const jumpTo = (edge: "min" | "max") => {
    if (!state) {
      return;
    }

    withDragging(() => {
      state.setThumbValue(
        index(),
        edge === "min" ? state.getThumbMinValue(index()) : state.getThumbMaxValue(index()),
      );
    });
  };

  const keyboard = (handler: () => void) => () => {
    modality?.setKeyboardModality();
    handler();
  };

  createKeymapScope({
    isActive: () => focused() && !isDisabled(),
    bindings: {
      // `keymap` names the arrows `up` / `down` / `left` / `right`. The
      // horizontal pair follows the layout direction, as `isRTL` does upstream.
      left: keyboard(() => stepBy(slider?.isRtl() ? 1 : -1, false)),
      right: keyboard(() => stepBy(slider?.isRtl() ? -1 : 1, false)),
      "shift+left": keyboard(() => stepBy(slider?.isRtl() ? 1 : -1, true)),
      "shift+right": keyboard(() => stepBy(slider?.isRtl() ? -1 : 1, true)),
      up: keyboard(() => stepBy(1, false)),
      down: keyboard(() => stepBy(-1, false)),
      "shift+up": keyboard(() => stepBy(1, true)),
      "shift+down": keyboard(() => stepBy(-1, true)),
      pageup: keyboard(() => stepBy(1, true)),
      pagedown: keyboard(() => stepBy(-1, true)),
      home: keyboard(() => jumpTo("min")),

      end: keyboard(() => jumpTo("max")),
    },
    options: { repeat: true },
  });

  // --- Pointer drag ----------------------------------------------------------
  let dragStartPageX = 0;
  let dragStartPageY = 0;
  let dragStartPercent = 0;
  let draggingNow = false;

  const travelLength = () => {
    const size = slider?.trackSize();

    if (!size) {
      return 0;
    }

    return isVertical() ? size.height : size.width;
  };

  const handleGrant = (event: GestureResponderEvent) => {
    if (!state || isDisabled()) {
      return;
    }

    dragStartPageX = event.pageX;
    dragStartPageY = event.pageY;
    dragStartPercent = percent();
    draggingNow = true;

    // RAC's `onPointerDown` focuses the hidden input, then the press counts as
    // a pointer interaction; the order keeps the ring off (port sheet §2).
    node?.focus();
    modality?.setPointerModality();

    state.setThumbDragging(index(), true);
  };

  const handleMove = (event: GestureResponderEvent) => {
    if (!state || !draggingNow) {
      return;
    }

    const length = travelLength();

    if (length <= 0) {
      return;
    }

    // RAC's `useSliderThumb` maps a pixel delta to a percent of the track; the
    // thumb does not jump to the pointer, it moves from where it was.
    const delta = isVertical()
      ? (dragStartPageY - event.pageY) / length
      : (slider?.isRtl()
          ? (dragStartPageX - event.pageX) / length
          : (event.pageX - dragStartPageX) / length);

    state.setThumbPercent(index(), dragStartPercent + delta);
  };

  const handleRelease = () => {
    if (!state || !draggingNow) {
      return;
    }

    draggingNow = false;
    state.setThumbDragging(index(), false);
  };

  // --- Focus and hover -------------------------------------------------------
  const handleFocus = () => {
    focused.set(true);
    slider?.state.setFocusedThumb(index());
    modality?.onFocus();
    local.onFocusChange?.(true);
    local.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    slider?.state.setFocusedThumb(undefined);
    local.onFocusChange?.(false);
    local.onBlur?.();
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);

    if (isDisabled() || hovered()) {
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

  // --- Render props, classes and style --------------------------------------
  const renderProps: SliderThumbRenderProps | undefined = state
    ? {
        state,
        isDragging: () => state.isThumbDragging(index()),
        isHovered: hovered,
        isFocused: focused,
        isFocusVisible,
        isDisabled,
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

  // R-047: the horizontal `.slider__thumb` → `@apply h-full`.
  // R-048: the horizontal `.slider__thumb` → `@apply top-1/2`; the inline style
  // gives `left`, and `translate` centres it on both axes.
  // R-049: the horizontal thumb's `width: calc(1.5rem + 0.25rem)` → `w-7`.
  // R-069: the vertical `.slider__thumb` → `@apply w-full`.
  // R-070: the vertical `.slider__thumb` → `@apply left-1/2`; the inline style
  // gives `top`, kept as `left-1/2` for RTL correctness as upstream does.
  // R-071: the vertical thumb's `height: calc(1.5rem + 0.25rem)` → `h-7`.
  const classes = computed(() =>
    joinClassNames(
      state ? slider?.slots().thumb() : undefined,
      isRootVertical() ? "w-full left-1/2 h-7" : "h-full top-1/2 w-7",
      resolvedClassName(),
    ),
  );

  // R-050: the horizontal `::after` → `w-6 h-4`.
  // R-072: the vertical `::after` → `w-4 h-6`. The block follows the root
  // orientation like every other thumb size class.
  const visualClasses = computed(() =>
    joinClassNames(THUMB_VISUAL_CLASSES, isRootVertical() ? "w-4 h-6" : "w-6 h-4"),
  );

  // R-076: the thumb's offset is `(isVertical or RTL ? 1 - percent : percent)`
  // of the track; `translate` is `-50% -50%`, and the other axis comes from
  // `top-1/2` / `left-1/2`.
  const positionStyle = computed<ViewStyle>(() => {
    const current = percent();
    const flipped =
      isVertical() || (slider?.isRtl() ?? false) ? 1 - current : current;
    const offset: `${number}%` = `${flipped * 100}%`;

    return isVertical()
      ? { top: offset, translate: "-50% -50%" }
      : { left: offset, translate: "-50% -50%" };
  });

  // AriaProps' index signature types `aria-label` as `unknown`, so the own
  // label is narrowed before it joins the fallbacks.
  const accessibilityLabel = (): string | undefined => {
    const own = local["aria-label"];

    if (typeof own === "string") {
      return own;
    }

    return (
      local.accessibilityLabel ??
      localLabelText() ??
      slider?.ariaLabel() ??
      slider?.labelText()
    );
  };

  const accessibilityValue = () =>
    state
      ? {
          min: state.getThumbMinValue(index()),
          max: state.getThumbMaxValue(index()),
          now: value(),
          text: state.getThumbValueLabel(index()),
        }
      : undefined;

  const accessibilityState = computed(() => {
    const own = (local.accessibilityState ?? {}) as AccessibilityState;

    return isDisabled() ? { ...own, disabled: true } : own;
  });

  const resolveChildren = (
    children: JSX.Element | ((values: SliderThumbRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1 && renderProps) {
      return renderChildren(
        untracked(() => (children as (values: SliderThumbRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <FieldContext.Provider value={fieldState}>
      <View
        {...hostProps(rest)}
        ref={handleRef}
        nativeID={local.id ?? local.nativeID}
        role="adjustable"
        focusable
        disabled={isDisabled()}
        accessibilityLabel={accessibilityLabel()}
        accessibilityValue={accessibilityValue()}
        accessibilityState={accessibilityState()}
        class={classes()}
        classList={{
          // R-030: `[data-dragging="true"]` → `cursor-grabbing` over the base
          // `cursor-grab`.
          "cursor-grabbing": state?.isThumbDragging(index()) ?? false,
          // R-033: `[data-focus-visible="true"]` → `status-focused`
          // (`ring-2 ring-focus`, 2px offset, no outline).
          //
          // The rule's `z-10` is deliberately not toggled here: NSH's web host
          // rebuilds a focused view when its z-index changes, which drops the
          // focus (and with it the keyboard). The thumb keeps the slot's `z-2`,
          // above the fill and the dots; the loss is registered in §8.
          "ring-2 ring-focus ring-offset-[2px] ring-offset-background outline-none":
            isFocusVisible(),
          // R-034: `[data-disabled="true"]` → `cursor-default`.
          "cursor-default": isDisabled(),
        }}
        // RAC applies the position first and the caller's `style` after it
        // (`style={{...thumbProps.style, ...renderProps.style}}`), so a caller
        // keeps the final say on left / top / transform.
        style={[positionStyle(), resolvedStyle()]}
        onStartShouldSetResponder={() => !isDisabled()}
        onResponderGrant={handleGrant}
        onResponderMove={handleMove}
        onResponderRelease={handleRelease}
        onResponderTerminate={handleRelease}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* R-028: the pseudo-element's empty content is this view's; it stays
            transparent to the thumb's own children. */}
        <View
          class={visualClasses()}
          classList={{
            // R-031 / R-032: while dragging the block scales down, and reduced
            // motion cancels the scale.
            "scale-[0.9] motion-reduce:scale-100": state?.isThumbDragging(index()) ?? false,
          }}
        />
        {resolveChildren(local.children)}
      </View>
    </FieldContext.Provider>
  );
}
