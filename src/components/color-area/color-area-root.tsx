/*
 * HeroUI 3.2.7's `ColorAreaRoot` (`packages/react/src/components/color-area/
 * color-area.tsx`) on NSH's `View`, with Kobalte's root behaviour and React
 * Stately's state.
 *
 * Upstream wraps React Aria Components' `ColorArea`: a `div role="group"` whose
 * inline background comes from `useColorArea`, with the caller's children (the
 * Thumb) inside. NSH has no DOM, no `getBoundingClientRect` and no pointer
 * events on views, so:
 *
 * - the gradient, the border and the `showDots` pattern are real child views
 *   (R-004, R-005, R-007), each owning one property;
 * - the box is measured with `onLayout`, and presses come from a
 *   `PanResponder`'s responder (R-022);
 * - the accessible group is a `View role="group"` with a label, since there is
 *   no `aria-label` attribute to pass through.
 */

import type {
  Bounds,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  computed,
  locale,
  PanResponder,
  signal,
  split,
  View,
} from "nsh";

import { createInteractionModality } from "../../primitives";
import { ColorPickerColorContext } from "../color-picker/color-picker-context";
import { joinClassNames } from "./class-names";
import { ColorAreaBackground } from "./color-area-background";
import type { ColorAreaContextValue } from "./color-area-context";
import { ColorAreaContext } from "./color-area-context";
import { ColorAreaDots } from "./color-area-dots";
import type {
  AriaProps,
  DataProps,
  DomEventProps,
  GlobalDomProps,
} from "./color-area-dom-props";
import { viewProps } from "./color-area-dom-props";
import {
  COLOR_AREA_INTL_TRANSLATIONS,
  isRtlLocale,
} from "./color-area.intl";
import type {
  ColorAreaChildren,
  ColorAreaRenderProps,
} from "./color-area-render-props";
import { colorAreaVariants } from "./color-area.styles";
import type { ColorAreaVariants } from "./color-area.styles";
import type { Color, ColorChannel, ColorSpace } from "./colors";
import type { ColorAreaThumbValue } from "./create-color-area-state";
import { createColorAreaState } from "./create-color-area-state";
import { renderColorAreaChildren } from "./render-color-area-children";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorArea.Root` (= `ColorArea`): HeroUI 3.2.7's
 * `ColorAreaRootProps`, which is React Aria Components' `ColorArea` plus the
 * variant surface, expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `slot`, the global DOM attributes,
 * the React DOM handlers) are accepted so code written against HeroUI keeps
 * compiling; port sheet §1 and §8 say what each can and cannot do.
 */
export interface ColorAreaRootProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps,
    ColorAreaVariants {
  /**
   * The children, normally a `ColorArea.Thumb`; a function receives the render
   * props and is called once, at this placement (D17).
   */
  children?: ColorAreaChildren<ColorAreaRenderProps>;

  /** Appended after the slot classes; later classes win. A function receives the render props. */
  className?: string | ((values: ColorAreaRenderProps) => string);

  /** The inline style; a function receives the render props. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorAreaRenderProps) => StyleProp<ViewStyle>);

  /**
   * The controlled color, a CSS string or a parsed `Color`. While it is set the
   * area reads it and `onChange` reports every change.
   */
  value?: string | Color;

  /** The color before the user interacts. @default "#ffffff" */
  defaultValue?: string | Color;

  /** Called once for every change, the whole interaction included. */
  onChange?: (color: Color) => void;

  /** Called once when a pointer interaction ends (a drag's release). */
  onChangeEnd?: (color: Color) => void;

  /** The horizontal channel. @default the color space's first channel */
  xChannel?: ColorChannel;

  /** The vertical channel. @default the color space's second channel */
  yChannel?: ColorChannel;

  /** The space the area operates in; the value's own space by default. */
  colorSpace?: ColorSpace;

  /** Paints the dot pattern over the gradient. @default false */
  showDots?: ColorAreaVariants["showDots"];

  /** Blocks pointer and keyboard interaction and dims both parts. */
  isDisabled?: boolean;

  /** Accepted, no effect: NSH has no form submission. */
  isRequired?: boolean;

  /** Accepted, no effect: NSH has no form validation. */
  isInvalid?: boolean;

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no hidden inputs. */
  xName?: string;

  /** Accepted, no effect: NSH has no hidden inputs. */
  yName?: string;

  /** Accepted, no effect: NSH has no form element to associate these with. */
  form?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no RAC slot context. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: a `<div>`'s native tooltip does not exist in NSH. */
  title?: string;

  /** Accepted, no effect: NSH moves focus between pressables, not through a `tabIndex`. */
  tabIndex?: number;

  /** The accessible name of the group, and the base of the thumb's name. */
  "aria-label"?: string;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;

  /** The root was laid out; the area measures its box from this. */
  onLayout?: (event: { bounds: Bounds }) => void;
}

/* -------------------------------------------------------------------------------------------------
 * ColorArea Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * ColorAreaRoot is the group the Thumb lives in. It owns everything that
 * changes — the color, the axes, the drag, the focus — and hands it to the
 * Thumb through the context; the render props expose the same state to the
 * caller's functions (D17).
 */
export function ColorAreaRoot(props: ColorAreaRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "value",
    "defaultValue",
    "onChange",
    "onChangeEnd",
    "xChannel",
    "yChannel",
    "colorSpace",
    "showDots",
    "isDisabled",
    "isRequired",
    "isInvalid",
    "name",
    "xName",
    "yName",
    "form",
    "id",
    "nativeID",
    "ref",
    "focusable",
    "aria-label",
    "accessibilityLabel",
    "onLayout",
  ] as const);

  const isDisabled = () => local.isDisabled ?? false;

  // R-024: the group's accessible name; `aria-label` is the base the Thumb
  // extends with its channels, exactly as HeroUI's two hidden inputs take it.
  const ariaLabel = computed(
    () => local["aria-label"] ?? local.accessibilityLabel,
  );

  // RAC provides `{ value, onChange }` from a surrounding `ColorPicker` through
  // its slotted context and merges it only where the caller left the prop out
  // (port sheet §5, change 1). Outside a picker this is `undefined`.
  const outer = ColorPickerColorContext();

  const state = createColorAreaState({
    value: () => (local.value !== undefined ? local.value : outer?.value()),
    defaultValue: () => local.defaultValue,
    colorSpace: () => local.colorSpace,
    xChannel: () => local.xChannel,
    yChannel: () => local.yChannel,
    onChange: (color) => {
      local.onChange?.(color);

      // Only when the picker around this area is the one driving its value.
      if (local.value === undefined) {
        outer?.onChange(color);
      }
    },
    onChangeEnd: (color) => local.onChangeEnd?.(color),
    isDisabled,
  });

  // R-019 / R-027: the direction drives the gradient and the Left/Right keys.
  // NSH exposes the locale, not a layout direction, so it comes from the
  // language table (`useLocale().direction` upstream does the same).
  const direction = computed<"ltr" | "rtl">(() =>
    isRtlLocale(locale()) ? "rtl" : "ltr",
  );

  const modality = createInteractionModality();

  const isFocused = signal(false);
  const pointerFocusPending = signal(false);
  const thumbRef = signal<ViewRef | undefined>(undefined);

  const slots = computed(() =>
    colorAreaVariants({ showDots: local.showDots ?? false }),
  );

  // React Aria's `useRenderProps` hands the component's own class and style to
  // the caller's class/style/children functions as `defaultClassName` /
  // `defaultStyle` (react-aria-components/src/utils.tsx:255-261). Here the
  // default class is the `base` slot and the root has no inline style of its
  // own (the gradient is a child layer), so the pair is the slot string and an
  // empty object; both are getters, so a later read still sees the right slot.
  const renderProps: ColorAreaRenderProps = {
    state,
    isDisabled,
    get defaultClassName() {
      return slots().base();
    },
    get defaultStyle(): ViewStyle {
      return {};
    },
  };

  const classes = computed(() =>
    joinClassNames(
      slots().base(),
      typeof local.className === "function"
        ? local.className(renderProps)
        : local.className,
    ),
  );

  const resolvedStyle = computed<StyleProp<ViewStyle>>(() =>
    typeof local.style === "function" ? local.style(renderProps) : local.style,
  );

  /** R-021: the thumb shows the color without its alpha. */
  const displayColor = computed<Color>(() =>
    state.value().withChannelValue("alpha", 1),
  );

  /* -------------------------------------------------------------------------------------------
   * Pointer interaction (R-022)
   * ----------------------------------------------------------------------------------------- */

  // The root's box, measured once per layout: presses are converted with it.
  const bounds = signal({ width: 0, height: 0 });

  // The value fractions a drag started from; null when no drag is in flight.
  const dragOrigin = signal<ColorAreaThumbValue | null>(null);

  function requestThumbFocus() {
    const node = thumbRef();

    if (node === undefined) {
      modality.setPointerModality();
      return;
    }

    // A programmatic focus after a pointer press must not show the focus ring;
    // when the thumb already has the focus no focus event will follow, so the
    // modality is recorded directly.
    if (!isFocused()) {
      pointerFocusPending.set(true);
    }

    node.focus();
    modality.setPointerModality();
  }

  function beginDrag(origin: ColorAreaThumbValue) {
    if (isDisabled()) {
      return;
    }

    dragOrigin.set(origin);
    state.setIsDragging(true);
  }

  function moveDrag(dx: number, dy: number) {
    const origin = dragOrigin();

    if (origin === null || isDisabled()) {
      return;
    }

    const { width, height } = bounds();

    if (width <= 0 || height <= 0) {
      return;
    }

    // React Aria's `useColorArea.ts:212`: the horizontal delta is negated in a
    // right-to-left locale, because the gradient (and the value axis) runs the
    // other way. `y` is the value fraction, which grows upwards; the pointer's
    // `dy` grows downwards, hence the minus.
    const xDirection = direction() === "rtl" ? -1 : 1;

    state.setThumbPercent({
      x: clamp01(origin.x + (xDirection * dx) / width),
      y: clamp01(origin.y - dy / height),
    });
  }

  function endDrag() {
    if (!state.isDragging()) {
      return;
    }

    dragOrigin.set(null);
    // Ends the interaction: one `onChangeEnd`, as React Aria reports it.
    state.setIsDragging(false);
    requestThumbFocus();
  }

  // R-022: pressing the panel moves the value to the pointer (React Aria's
  // background pointerdown) and starts the drag; moving applies the gesture's
  // total delta; release / terminate report the end once.
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isDisabled(),
    onPanResponderGrant: (event) => {
      if (isDisabled()) {
        return;
      }

      modality.setPointerModality();
      pointerFocusPending.set(false);

      const { width, height } = bounds();

      if (width <= 0 || height <= 0) {
        return;
      }

      // React Aria's `useColorArea.ts:298-299`: the press fraction is measured
      // from the mirrored edge in a right-to-left locale, exactly like the
      // gradient that is painted there.
      const origin = {
        x: clamp01(
          direction() === "rtl"
            ? 1 - event.locationX / width
            : event.locationX / width,
        ),
        y: clamp01(1 - event.locationY / height),
      };

      beginDrag(origin);
      state.setThumbPercent(origin);
    },
    onPanResponderMove: (_event, gesture) => moveDrag(gesture.dx, gesture.dy),
    onPanResponderRelease: () => endDrag(),
    onPanResponderTerminate: () => endDrag(),
  });

  function handleThumbGrant() {
    if (isDisabled()) {
      return;
    }

    // R-022: a press on the thumb keeps the value and drags from there; React
    // Aria also focuses the thumb on pointerdown.
    modality.setPointerModality();
    pointerFocusPending.set(false);
    requestThumbFocus();
    beginDrag(state.getThumbPercent());
  }

  /* -------------------------------------------------------------------------------------------
   * Layout
   * ----------------------------------------------------------------------------------------- */

  const handleLayout = (event: { bounds: Bounds }) => {
    bounds.set({
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
    local.onLayout?.(event);
  };

  /* -------------------------------------------------------------------------------------------
   * Context
   * ----------------------------------------------------------------------------------------- */

  const contextValue: ColorAreaContextValue = {
    state,
    slots,
    isDisabled,
    direction,
    translations: COLOR_AREA_INTL_TRANSLATIONS,
    ariaLabel,
    displayColor,
    modality,
    isFocused,
    setFocused: (focused) => {
      isFocused.set(focused);

      if (!focused) {
        pointerFocusPending.set(false);
      }
    },
    setThumbRef: (node) => thumbRef.set(node),
    beginThumbDrag: handleThumbGrant,
    moveThumbDrag: (dx, dy) => moveDrag(dx, dy),
    endThumbDrag: () => endDrag(),
    consumePointerFocus: () => {
      if (!pointerFocusPending()) {
        return false;
      }

      pointerFocusPending.set(false);

      return true;
    },
  };

  const resolveChildren = () => {
    // The single read of `props.children`, inside the provider (the `_common`
    // §41 exception: a component that provides a context reads it at the
    // placement). A render prop is called once with the values (D17).
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderColorAreaChildren(
        (children as (values: ColorAreaRenderProps) => JSX.Element)(
          renderProps,
        ),
        renderProps,
      );
    }

    return renderColorAreaChildren(
      children as ColorAreaChildren<ColorAreaRenderProps>,
      renderProps,
    );
  };

  return (
    <View
      {...viewProps(rest)}
      // A callback only: NSH writes into a ref store, and an undefined one
      // would throw at mount on the web target (common rules, real hosts).
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // The root is the responder, not a focus stop: only the Thumb takes Tab.
      focusable={local.focusable ?? false}
      role="group"
      accessibilityLabel={
        ariaLabel() ?? COLOR_AREA_INTL_TRANSLATIONS.colorPicker
      }
      disabled={isDisabled()}
      class={classes()}
      // R-006: `status-disabled` → the literal 0.5 opacity and the disabled
      // cursor (NSH has no status classes); `disabled` already blocks presses.
      classList={{ "opacity-50 cursor-not-allowed": isDisabled() }}
      style={resolvedStyle()}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {/* R-004 / R-019 / R-029: the gradient field, its own layer. */}
      <ColorAreaBackground state={state} direction={direction} />

      {/* R-005: the 1px inner shadow, a layer so the gradient cannot cover it. */}
      <View
        class="absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.1)]"
        style={{ pointerEvents: "none" }}
      />

      {/* R-007 / R-008: the dot pattern, mounted only while `showDots`. */}
      <If when={local.showDots ?? false}>
        <ColorAreaDots />
      </If>

      <ColorAreaContext.Provider value={contextValue}>
        {resolveChildren()}
      </ColorAreaContext.Provider>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
