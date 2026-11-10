import type {
  Accessor,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, locale, signal, split, untracked, View } from "nsh";

import { createInteractionModality } from "../../primitives/create-interaction-modality";
import { ColorPickerColorContext } from "../color-picker/color-picker-context";
import type { FieldState } from "../label/context";
import { FieldContext } from "../label/context";
import type { Color, ColorChannel, ColorSpace } from "../color-swatch";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "./color-slider-dom-props";
import { hostProps } from "./color-slider-dom-props";
import type {
  ColorSliderContextValue,
  ColorSliderOrientation,
  ColorSliderRenderProps,
  ColorSliderStateAccessor,
  ColorSliderStateSnapshot,
  ColorSliderTrackSize,
} from "./color-slider-context";
import { ColorSliderContext } from "./color-slider-context";
import { isRtlLocale } from "./color-slider-direction";
import { colorSliderVariants } from "./color-slider.styles";
import type { ColorSliderVariants } from "./color-slider.styles";
import { getValidColorSpace } from "./color-slider-utils";
import type { ColorSliderState } from "./create-color-slider-state";
import { createColorSliderState } from "./create-color-slider-state";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Channel types (HeroUI 3.2.7 `color-slider.tsx:20-41`)
 * -----------------------------------------------------------------------------------------------*/

/** Channels available in HSL color space. */
export type HSLChannel = "hue" | "saturation" | "lightness" | "alpha";

/** Channels available in HSB color space. */
export type HSBChannel = "hue" | "saturation" | "brightness" | "alpha";

/** Channels available in RGB color space. */
export type RGBChannel = "red" | "green" | "blue" | "alpha";

/** Channels shared between HSL and HSB (but NOT RGB). */
export type HSLHSBSharedChannel = "hue" | "saturation";

/** Alpha works across every color space. */
export type AlphaChannel = "alpha";

/**
 * The `channel` / `colorSpace` pairs HeroUI accepts, as a discriminated union:
 * `channel="red"` with `colorSpace="hsl"` is a type error upstream, and here.
 * An invalid pair is still corrected at runtime (HeroUI's
 * `getValidColorSpace`), for callers who cast their way past the type.
 */
export type ColorSliderChannelProps =
  | { channel: HSLChannel; colorSpace?: "hsl" }
  | { channel: HSBChannel; colorSpace?: "hsb" }
  | { channel: RGBChannel; colorSpace?: "rgb" }
  | {
      channel: HSLHSBSharedChannel;
      colorSpace?: "hsl" | "hsb";
    }
  | { channel: AlphaChannel; colorSpace?: ColorSpace };

/* -------------------------------------------------------------------------------------------------
 * Root props
 * -----------------------------------------------------------------------------------------------*/

/**
 * Everything but the channel: HeroUI's
 * `Omit<ComponentPropsWithRef<typeof ColorSliderPrimitive>, "channel" | "colorSpace">`
 * plus `ColorSliderVariants`, expressed with NSH's view host props.
 */
export interface ColorSliderRootBaseProps
  extends Omit<ViewProps, "children" | "class" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps,
    ColorSliderVariants {
  /**
   * The content, or a render prop called once with `{ orientation, isDisabled,
   * state }` (D17: accessors). It is read once, inside both providers and at
   * the placement, so a `Label` inside still reaches `FieldContext`.
   */
  children?: JSX.Element | ((values: ColorSliderRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: ColorSliderRenderProps) => string | undefined);

  /** Style of the root; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorSliderRenderProps) => StyleProp<ViewStyle>);

  /** The controlled value: a CSS color string or a `Color`. */
  value?: Color | string;

  /** The initial value in uncontrolled mode. @default hsl(0, 100%, 50%) */
  defaultValue?: Color | string;

  /** Called on every change, with a new `Color`. */
  onChange?: (value: Color) => void;

  /** Called once when an interaction ends, with the value it left behind. */
  onChangeEnd?: (value: Color) => void;

  /** The layout. @default "horizontal" */
  orientation?: ColorSliderOrientation;

  /** Dims the whole slider and blocks its input. */
  isDisabled?: boolean;

  /** Reads as `isDisabled` when `true`, as the stylesheet's `[aria-disabled]` did. */
  "aria-disabled"?: boolean;

  /** Accepted, no effect: NSH has no form submission (port sheet §8). */
  name?: string;

  /** Accepted, no effect: NSH has no form submission (port sheet §8). */
  form?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /**
   * The accessible name of the thumb. A `Label` inside the root wins, as
   * upstream's `aria-labelledby` does over `aria-label` (port sheet §1).
   */
  "aria-label"?: string;

  /** The accessible name through the host prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/** HeroUI's `ColorSliderRootProps`: the base props and the channel union. */
export type ColorSliderRootProps = ColorSliderRootBaseProps & ColorSliderChannelProps;

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * ColorSlider.Root / ColorSliderRoot: HeroUI's `ColorSlider`, which is React
 * Aria Components' `ColorSlider` around React Stately's `useColorSliderState`.
 *
 * It is built on the core `View`, not on nsh/base `Slider`: that component
 * fixes the track → indicator → thumbs structure and its value is a `number`,
 * so HeroUI's Output / Track / Thumb placement, its `Color` value and its
 * channel contract cannot land in it (port sheet §3, criteria B1 and B3).
 *
 * The root owns the value, the channel, the orientation, the shared modality
 * and the registrations that stand in for the upstream `:has()` selectors
 * (port sheet §2). `Label` is an independent component and reaches this root
 * through `FieldContext`, never through the props.
 */
export function ColorSliderRoot(props: ColorSliderRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "value",
    "defaultValue",
    "onChange",
    "onChangeEnd",
    "channel",
    "colorSpace",
    "orientation",
    "isDisabled",
    "aria-disabled",
    "name",
    "form",
    "id",
    "nativeID",
    "slot",
    "render",
    "aria-label",
    "accessibilityLabel",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  const slots = computed(() => colorSliderVariants({}));

  const orientation = computed<ColorSliderOrientation>(
    () => local.orientation ?? "horizontal",
  );

  // HeroUI reads `useLocale().direction`; NSH's styling can read the direction
  // (`rtl:` classes, logical `start` / `end`) but TypeScript cannot, so the
  // tag is translated here (port sheet §2, "方向 direction").
  const rtl = computed(() => isRtlLocale(locale()));

  // HeroUI auto-corrects an invalid channel / colorSpace pair before it hands
  // it to the primitive; the warning is dropped (port sheet §8).
  const colorSpace = computed(() =>
    getValidColorSpace(local.channel, local.colorSpace),
  );

  const isDisabled = computed(
    () => local.isDisabled ?? local["aria-disabled"] === true,
  );

  // --- Value and geometry ----------------------------------------------------
  // RAC provides `{ value, onChange }` from a surrounding `ColorPicker` through
  // its slotted context and merges it only where the caller left the prop out
  // (port sheet §5, change 1). Outside a picker this is `undefined`.
  const outer = ColorPickerColorContext();

  const state = createColorSliderState({
    value: () => (local.value !== undefined ? local.value : outer?.value()),
    defaultValue: () => local.defaultValue,
    onChange: (value) => {
      local.onChange?.(value);

      // Only when the picker around this slider is the one driving its value.
      if (local.value === undefined) {
        outer?.onChange(value);
      }
    },
    onChangeEnd: (value) => local.onChangeEnd?.(value),
    channel: () => local.channel,
    colorSpace,
  });

  const publicState = toPublicState(state);

  // --- Label registration (the stand-in for `<label for>` / aria-labelledby) --
  // A `Label` inside the root reports its text here; `hasLabel` is the
  // *existence* of the registration, not whether the text is usable, which is
  // what `:has([data-slot="label"])` tested upstream (port sheet §2).
  const labelTexts = signal<readonly (() => string | undefined)[]>([]);

  const registerLabel = (text: () => string | undefined) => {
    labelTexts.update((current) => [...current, text]);

    return () => {
      labelTexts.update((current) => current.filter((entry) => entry !== text));
    };
  };

  const hasLabel = computed(() => labelTexts().length > 0);

  const labelText = computed(() => {
    const text = labelTexts()
      .map((entry) => entry())
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ");

    return text.length > 0 ? text : undefined;
  });

  // Only `registerLabel`: `isDisabled` would dim the Label too, and upstream
  // cancels the Label's own 0.5 while the slider is disabled, so the two must
  // not compound (port sheet §4, R-030).
  const fieldState: FieldState = { registerLabel };

  // --- Output registration (the stand-in for `:has(.color-slider__output)`) ---
  const outputCount = signal(0);

  const hasOutput = computed(() => outputCount() > 0);

  const registerOutput = () => {
    outputCount.update((count) => count + 1);

    return () => outputCount.update((count) => Math.max(0, count - 1));
  };

  // --- Track size and thumb focus -------------------------------------------
  const trackSize = signal<ColorSliderTrackSize>({ width: 0, height: 0 });
  const setTrackSize = (size: ColorSliderTrackSize) => trackSize.set(size);

  // A plain holder, not a signal: it is written by the thumb's ref callback
  // and read by a handler, never rendered.
  let thumbNode: ViewRef | undefined;

  const registerThumb = (node: ViewRef | undefined) => {
    thumbNode = node;
  };

  const focusThumb = () => {
    thumbNode?.focus();
  };

  // The modality is shared: a Track press focuses the thumb first and then
  // records a pointer interaction, so this one tracker sees both (port sheet
  // §2, "输入方式 modality").
  const modality = createInteractionModality();

  // --- Render props and classes ---------------------------------------------
  const renderProps: ColorSliderRenderProps = {
    orientation,
    isDisabled,
    state: publicState,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  /**
   * R-002 / R-005 / R-009 / R-011 / R-048 / R-053 / R-056 / R-058: the CSS
   * names grid areas and collapses them with `:has()`. NSH has neither, so the
   * root picks the template from `orientation`, `hasLabel` and `hasOutput`
   * (four existence combinations each way) and the parts place themselves
   * (R-017 / R-019); the Label is then the only freely placed item and lands
   * where the CSS put it.
   *
   * R-031 and R-047 are deleted: both write `flex-direction` on the root, which
   * is a grid container in every layout, so neither ever had an effect.
   *
   * The classes come after the base slot's own `grid-cols-[1fr_auto]` /
   * `grid-rows-[auto_auto]` / `gap-1`, so they override exactly the rows,
   * columns and gap upstream's more specific selectors overrode.
   */
  const layoutClasses = computed(() => {
    if (orientation() === "vertical") {
      // R-046: vertical `.color-slider` → `height: 100%` → `h-full`.
      // R-046: vertical `.color-slider` → `gap: 8` → `gap-2`.
      // R-050: vertical `.color-slider` → `grid-template-columns: 1fr`.
      // R-051: vertical `.color-slider` → `align-items: center` → `items-center`.
      // R-052: vertical `.color-slider` → `justify-items: center` → the Label
      // and Output boxes are centred by content width, which is also what the
      // deleted `w-fit` (R-014) and `text-align: center` (R-061) achieved for
      // an unwrapped label.
      const base = "h-full gap-2 grid-cols-[1fr] items-center justify-items-center";

      if (!hasLabel() && !hasOutput()) {
        // R-053: neither exists → one `track` area.
        // R-054: `grid-template-rows: 1fr`.
        // R-055: `gap: 0`.
        return `${base} grid-rows-[1fr] gap-0`;
      }

      if (hasLabel() && hasOutput()) {
        // R-049: both → `grid-template-rows: auto 1fr auto`.
        return `${base} grid-rows-[auto_1fr_auto]`;
      }

      return hasLabel()
        ? // R-057: only the label → `grid-template-rows: 1fr auto`.
          `${base} grid-rows-[1fr_auto]`
        : // R-059: only the output → `grid-template-rows: auto 1fr`.
          `${base} grid-rows-[auto_1fr]`;
    }

    if (!hasLabel() && !hasOutput()) {
      // R-005: neither exists → a single `track` area, one column.
      // R-006: `grid-template-columns: 1fr`.
      // R-007: `grid-template-rows: auto`.
      // R-008: `gap: 0`.
      return "grid-cols-[1fr] grid-rows-[auto] gap-0";
    }

    if (!hasLabel() || !hasOutput()) {
      // R-006 / R-010 / R-012: one of the two exists → `grid-template-columns: 1fr`
      // (the row template stays the base's `auto auto`).
      return "grid-cols-[1fr]";
    }

    // R-003 / R-004: both exist → the base's `grid-cols-[1fr_auto]` and
    // `grid-rows-[auto_auto]` are already right.
    // R-015 / R-048: the Label needs no placement class: Output (R-017) and
    // Track (R-019) take their cells, so the Label is the only freely placed
    // item and lands in the cell the CSS named `label` (row 1 column 1
    // horizontally, row 3 vertically).
    return "";
  });

  // R-001 … R-004 and R-016 in `color-slider.styles.ts`, then the layout
  // override, then the caller's `className`; later classes win.
  const classes = computed(() =>
    joinClassNames(slots().base(), layoutClasses(), resolvedClassName()),
  );

  const accessibleName = computed(
    () => labelText() ?? local["aria-label"] ?? local.accessibilityLabel,
  );

  const contextValue: ColorSliderContextValue = {
    slots: {
      base: () => slots().base(),
      output: () => slots().output(),
      track: () => slots().track(),
      thumb: () => slots().thumb(),
    },
    orientation,
    isDisabled,
    rtl,
    hasLabel,
    hasOutput,
    state,
    publicState,
    modality,
    trackSize,
    setTrackSize,
    registerOutput,
    registerThumb,
    focusThumb,
    accessibleName,
  };

  // A one-argument function is HeroUI's render prop (D17); a zero-argument one
  // is NSH's reactive child and reaches `renderChildren` untouched.
  const resolveChildren = (
    children: ColorSliderRootProps["children"],
  ): JSX.Element => {
    if (typeof children === "function" && children.length >= 1) {
      const rendered = untracked(() =>
        (children as (values: ColorSliderRenderProps) => JSX.Element)(renderProps),
      );

      return renderChildren(rendered);
    }

    return renderChildren(children as JSX.Element);
  };

  // The single read of `props.children`, inside both providers and at the
  // placement (research 4.1 / 4.6, and the provider exception in the common
  // rules): a computed made here would evaluate outside them, and a Label
  // would lose `FieldContext`.
  return (
    <ColorSliderContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <View
          {...hostProps(rest)}
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          // R-029: `.color-slider:disabled, [data-disabled="true"],
          // [aria-disabled="true"]` → `status-disabled` (opacity 0.5, cursor
          // not-allowed, pointer-events none) with the literals the theme notes
          // require. The DOM attribute is `disabled`, which also blocks the
          // presses and tells assistive technology.
          disabled={isDisabled()}
          class={classes()}
          classList={{
            "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
          }}
          style={resolvedStyle()}
        >
          {resolveChildren(local.children)}
        </View>
      </FieldContext.Provider>
    </ColorSliderContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Render-prop state
 * -----------------------------------------------------------------------------------------------*/

/**
 * Wraps the internal state as the render prop's `state`: callable for a
 * snapshot (`state().getThumbValue()`), with the same members as accessors on
 * the function (`state.getThumbValue()`), so both spellings of D17 work.
 */
function toPublicState(state: ColorSliderState): ColorSliderStateAccessor {
  const snapshot = (): ColorSliderStateSnapshot => ({
    value: state.value(),
    getDisplayColor: () => state.displayColor(),
    getThumbValue: () => state.getThumbValue(),
    getThumbPercent: () => state.getThumbPercent(),
    getThumbValueLabel: (index: number) => state.getThumbValueLabel(index),
    getThumbMinValue: () => state.getThumbMinValue(),
    getThumbMaxValue: () => state.getThumbMaxValue(),
  });

  return Object.assign(snapshot, {
    value: state.value,
    displayColor: state.displayColor,
    getDisplayColor: () => state.displayColor(),
    getThumbValue: () => state.getThumbValue(),
    getThumbPercent: () => state.getThumbPercent(),
    getThumbValueLabel: (index: number) => state.getThumbValueLabel(index),
    getThumbMinValue: () => state.getThumbMinValue(),
    getThumbMaxValue: () => state.getThumbMaxValue(),
  });
}

/** The channel literals a slider can edit, in the order `ColorChannel` declares them. */
export type ColorSliderChannel = ColorChannel;
