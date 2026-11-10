import type { NumberFormatOptions } from "@internationalized/number";
import { computed, locale, signal, split, untracked, View } from "nsh";
import type { Accessor, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { createInteractionModality } from "../../primitives/create-interaction-modality";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { joinClassNames } from "./class-names";
import { createSliderState } from "./create-slider-state";
import type { SliderRenderProps } from "./slider-context";
import { SliderContext, type SliderContextValue } from "./slider-context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./slider-dom-props";
import { sliderVariants } from "./slider.styles";
import { isRtlLocale } from "./slider.utils";
import type { Orientation } from "./slider.utils";
import { renderChildren } from "./render-children";

export type { SliderRenderProps } from "./slider-context";

/* -------------------------------------------------------------------------------------------------
 * Slider Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Slider.Root`: HeroUI 3.2.7's `SliderRootProps`, which is React
 * Aria Components' `Slider` (the value contract plus `formatOptions`) and the
 * empty variant object, expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`slot`, `render`, the `aria-*` relations,
 * `data-*`) are accepted so code written against HeroUI keeps compiling; see
 * the port sheet section 1 and section 8 for what they can and cannot do here.
 */
export interface SliderRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The content, or a render prop called once with `{ orientation,
   * isDisabled, state }` (D17: accessors). Bare strings inside it become
   * `Text` at the placement.
   */
  children?: JSX.Element | ((values: SliderRenderProps) => JSX.Element);

  /**
   * Appended after the variant classes; later classes win. The function form
   * gets the same accessors the render prop gets.
   */
  className?: string | ((values: SliderRenderProps) => string | undefined);

  /** Style of the root view; the function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: SliderRenderProps) => StyleProp<ViewStyle>);

  /** The controlled value: a number for one thumb, an array for several. */
  value?: number | number[];

  /** The uncontrolled initial value. @default [minValue] */
  defaultValue?: number | number[];

  /** Called on every change, with a number when the caller gave one. */
  onChange?: (value: number | number[]) => void;

  /** Called when one interaction ends: a key press, a drag release. */
  onChangeEnd?: (value: number | number[]) => void;

  /** The range's minimum. @default 0 */
  minValue?: number;

  /** The range's maximum. @default 100 */
  maxValue?: number;

  /** The value increment of the arrows and of the step grid. @default 1 */
  step?: number;

  /** The layout and the thumbs' travel. @default "horizontal" */
  orientation?: Orientation;

  /** Dims the whole slider and blocks every interaction. @default false */
  isDisabled?: boolean;

  /** How Output, Mark and the thumb value labels are formatted. */
  formatOptions?: NumberFormatOptions;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /**
   * Upstream forces `role="group"`; a caller's value never reaches the
   * element, so this is accepted and ignored.
   */
  role?: string;

  /** The accessible name, preferring it over the text a `Label` inside registers. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-errormessage"?: string;

  /**
   * Upstream maps straight to the DOM attribute, where CSS uses it to dim the
   * bar and screen readers read the control as disabled. `"true"` and `true`
   * both count, `"false"` does not.
   */
  "aria-disabled"?: boolean | "true" | "false";

  /**
   * Upstream's second disabled switch: CSS reads `[data-disabled="true"]`,
   * while assistive technology is not told. `"true"` and `true` both count.
   */
  "data-disabled"?: boolean | "true" | "false";

  /** React's list identity; never reaches the host. */
  key?: string | number;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * Slider.Root / SliderRoot: the state root of the eight-part compound.
 *
 * Upstream is a two-column CSS grid whose named areas place the caller's
 * Label, Output, Track (with the parts inside it) and Marks. NSH has no
 * `grid-template-areas` and no `:has()`, so the areas become explicit grid
 * lines on each part and the vertical root asks `Marks` whether it is mounted
 * (port sheet R-002 / R-054 / R-056).
 *
 * Built on the core `View`, not nsh/base `Slider`: that component fixes a
 * "track → indicator → range + thumbs" structure and its event payloads are
 * `{ value }`, so HeroUI's freely arrangeable Fill / Steps / Marks / Output and
 * React Aria's `onChange` / `onChangeEnd` / `formatOptions` contract cannot
 * land in it (port sheet section 3, criteria B1 and B3).
 */
export function SliderRoot(props: SliderRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "key",
    "children",
    "className",
    "style",
    "value",
    "defaultValue",
    "onChange",
    "onChangeEnd",
    "minValue",
    "maxValue",
    "step",
    "orientation",
    "isDisabled",
    "formatOptions",
    "id",
    "nativeID",
    "ref",
    "role",
    "slot",
    "render",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "aria-disabled",
    "data-disabled",
    "accessibilityLabel",
    "accessibilityValue",
    "accessibilityState",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // --- Variants --------------------------------------------------------------
  // One `tv()` result for the whole tree: every part reads its slot from it.
  const slots = computed(() => sliderVariants({}));

  // --- Disabled appearance (R-035) ------------------------------------------
  const isAriaDisabled = computed(
    () => local["aria-disabled"] === true || local["aria-disabled"] === "true",
  );
  const isDataDisabled = computed(
    () => local["data-disabled"] === true || local["data-disabled"] === "true",
  );
  const isDisabled = computed(
    () => local.isDisabled === true || isAriaDisabled() || isDataDisabled(),
  );

  // --- Value state -----------------------------------------------------------
  const state = createSliderState({
    value: () => local.value,
    defaultValue: () => local.defaultValue,
    minValue: () => local.minValue,
    maxValue: () => local.maxValue,
    step: () => local.step,
    orientation: () => local.orientation,
    isDisabled: () => isDisabled(),
    formatOptions: () => local.formatOptions,
    onChange: (value) => local.onChange?.(value),
    onChangeEnd: (value) => local.onChangeEnd?.(value),
  });

  const orientation = computed<Orientation>(() => local.orientation ?? "horizontal");
  const isVertical = computed(() => orientation() === "vertical");

  // `aria-disabled` is the switch screen readers hear; `data-disabled` only
  // changes the look upstream, so it stays out of the accessibility state.
  const accessibilityState = computed(() => {
    const own = local.accessibilityState ?? {};

    return {
      ...own,
      disabled: local.isDisabled === undefined ? own.disabled : isDisabled(),
    };
  });

  // --- Direction -------------------------------------------------------------
  // React Aria's `useLocale().direction` comes from the I18nProvider locale;
  // NSH exposes the app's locale string and nothing about the layout
  // direction, so the BCP 47 table decides (port sheet section 8).
  const isRtl = computed(() => isRtlLocale(locale()));

  // --- Registered label text (the stand-in for label for / aria-labelledby) --
  const labelTexts = signal<readonly (() => string | undefined)[]>([]);

  const registerLabel = (text: () => string | undefined) => {
    labelTexts.update((current) => [...current, text]);

    return () => {
      labelTexts.update((current) => current.filter((entry) => entry !== text));
    };
  };

  const labelText = computed(() => {
    const text = labelTexts()
      .map((entry) => entry())
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ");

    return text.length > 0 ? text : undefined;
  });

  const ariaLabel = computed<string | undefined>(() => {
    const own = local["aria-label"];

    return typeof own === "string" ? own : local.accessibilityLabel;
  });

  // --- Interaction modality --------------------------------------------------
  // One owner: a thumb's ring shows for a keyboard focus, and a track press
  // focuses its thumb *before* it records the pointer, so that focus does not
  // count as keyboard navigation (port sheet section 2).
  const modality = createInteractionModality();

  // --- Marks registry --------------------------------------------------------
  // R-054 / R-056: upstream switches the vertical template with
  // `:has(> .slider__marks)`; NSH has no `:has`, so `Slider.Marks` registers
  // itself. The signal makes the root's classes follow a Marks mounting late.
  const markCount = signal(0);

  const registerMarks = () => {
    markCount.update((count) => count + 1);

    return () => {
      markCount.update((count) => Math.max(0, count - 1));
    };
  };

  const hasMarks = computed(() => markCount() > 0);

  // --- Thumb registry --------------------------------------------------------
  // RAC finds the hidden input by DOM id. A plain map keeps the refs out of
  // the reactive graph: only event handlers read it.
  const thumbRefs = new Map<number, ViewRef>();

  const registerThumb = (index: number, node: ViewRef) => {
    thumbRefs.set(index, node);

    return () => {
      if (thumbRefs.get(index) === node) {
        thumbRefs.delete(index);
      }
    };
  };

  const focusThumb = (index: number) => {
    thumbRefs.get(index)?.focus();
  };

  // The Track reports its laid-out size; a thumb converts a pointer delta in
  // points into a percent with it (upstream reads `getBoundingClientRect`).
  const trackSize = signal({ width: 0, height: 0 });

  // --- Render props and classes ---------------------------------------------
  const renderProps: SliderRenderProps = {
    orientation,
    isDisabled,
    state,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // R-051: the vertical root → `@apply h-full gap-2`; the columns are R-054's
  // single `1fr` until a Marks mounts, then R-056's `auto auto` centred pair.
  // The fixed `grid-cols-[auto_auto] justify-center` is *not* equivalent: with
  // no Marks the second column would still pull the track and output around.
  // R-037 / R-052 (`flex-direction` on the block) are deleted: the root is a
  // grid, where flex-direction does nothing.
  const classes = computed(() =>
    joinClassNames(
      slots().base(),
      isVertical()
        ? "h-full gap-2 grid-rows-[auto_1fr_auto]"
        : undefined,
      isVertical()
        ? hasMarks()
          ? "grid-cols-[auto_auto] justify-center"
          : "grid-cols-[1fr]"
        : undefined,
      resolvedClassName(),
    ),
  );

  // R-004 / R-005 / R-063: the Label's part classes, through the Label's
  // additive `partClass` channel. Horizontal top-left; vertical row 3, centred,
  // and across both columns only when a Marks column exists.
  const labelPartClass = computed(() => {
    if (!isVertical()) {
      return "w-fit text-sm font-medium row-start-1 col-start-1";
    }

    return joinClassNames(
      "w-fit text-sm font-medium row-start-3 text-center",
      hasMarks() ? "col-span-2" : undefined,
    );
  });

  // R-036: upstream cancels the Label's own 0.5 with `opacity: 1` when the
  // slider is disabled. We never pass `isDisabled` to the Label's field state,
  // so its 0.5 never appears and there is nothing to cancel.
  const fieldState: FieldState = {
    registerLabel,
    partClass: () => labelPartClass(),
    // A `<label for>` press focuses the control upstream; here it focuses the
    // first thumb and records the keyboard modality, as `labelProps.onClick`
    // does (port sheet section 2).
    focusField: () => {
      focusThumb(0);
      modality.setKeyboardModality();
    },
  };

  const accessibilityLabel = () => ariaLabel() ?? labelText();

  const contextValue: SliderContextValue = {
    slots,
    state,
    orientation,
    isDisabled,
    isRtl,
    hasMarks,
    registerMarks,
    registerThumb,
    focusThumb,
    trackSize,
    setTrackSize: (size) => trackSize.set(size),
    modality,
    ariaLabel,
    labelText,
  };

  // HeroUI's root reads `props.children` here, inside both providers and at
  // the placement; a computed made in the body would be evaluated outside them
  // and a Label would lose the field context. One read only.
  const resolveChildren = (
    children: JSX.Element | ((values: SliderRenderProps) => JSX.Element),
  ) => {
    // A one-argument function is the render prop (HeroUI's `children?:
    // ReactNode | ((values) => ReactNode)`); D17 calls it once with accessors.
    // A zero-argument function is NSH's own reactive child.
    if (typeof children === "function" && children.length >= 1) {
      const rendered = untracked(() =>
        (children as (values: SliderRenderProps) => JSX.Element)(renderProps),
      );

      return renderChildren(rendered);
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <SliderContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <View
          {...hostProps(rest)}
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          role="group"
          accessibilityLabel={accessibilityLabel()}
          accessibilityState={accessibilityState()}
          // R-035: `:disabled / [data-disabled="true"] / [aria-disabled="true"]`
          // → `@apply status-disabled` (opacity 0.5, cursor not-allowed,
          // pointer-events none). Non-token values are literals.
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
    </SliderContext.Provider>
  );
}
