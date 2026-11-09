import {
  computed,
  signal,
  split,
  untracked,
  View,
} from "nsh";
import type {
  AccessibilityRole,
  Accessor,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";

import { createProgressState } from "../../primitives/create-progress-state";
import { themeToken } from "../../theme";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { ProgressCircleContext } from "./context";
import type { ProgressCircleContextValue } from "./context";
import { accessibilityState, viewProps } from "./dom-props";
import type { AriaProps, DataProps, GlobalDomProps } from "./dom-props";
import { progressCircleVariants } from "./progress-circle.styles";
import type { ProgressCircleVariants } from "./progress-circle.styles";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * What a render-prop `className`, `style` or `children` receives. RAC's
 * `ProgressBarRenderProps` has these three values; D17 turns each into an
 * accessor, and the function itself is called once.
 */
export interface ProgressCircleRenderProps {
  /** `0..100`, or `undefined` while indeterminate. */
  percentage: Accessor<number | undefined>;

  /** The formatted (or caller-supplied) value text. */
  valueText: Accessor<string | undefined>;

  /** `true` when there is no known value. */
  isIndeterminate: Accessor<boolean>;
}

/**
 * The props of `ProgressCircle.Root` (= `ProgressCircle`): HeroUI 3.2.7's
 * `ProgressCircleRootProps`, which is RAC's `ProgressBar` props plus the two
 * variant dimensions, expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `slot`, any `data-*`, the
 * cross-element ARIA relations, `disabled`) and the SVG attributes of the
 * parts are accepted so code written against HeroUI keeps compiling; the port
 * sheet §1 and §8 say what each can and cannot do here.
 */
export interface ProgressCircleRootProps
  extends Omit<ViewProps, "children" | "class" | "role" | "style" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The parts, or a render prop given the same accessors as `className`. Read
   * once, at its placement, inside both providers: the context reaches a
   * part only when the read happens there (research 4.1's provider
   * exception).
   */
  children?:
    | JSX.Element
    | ((values: ProgressCircleRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. The function form runs once per state change. */
  className?: string | ((values: ProgressCircleRenderProps) => string);

  /** Appended after the variant styles; the function form runs once per state change. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ProgressCircleRenderProps) => StyleProp<ViewStyle>);

  /** Forwarded as a callback to the root `View`; a ref store would throw on the web target. */
  ref?: (node: ViewRef) => void;

  /** The fill color; `accent` by default. R-002 / R-016 … R-020. */
  color?: ProgressCircleVariants["color"];

  /** The track's box size; `md` (28 pt) by default. R-013 … R-015. */
  size?: ProgressCircleVariants["size"];

  /** The progress value; `0` by default. Clamped into the range. */
  value?: number;

  /** The bottom of the range; `0` by default. */
  minValue?: number;

  /** The top of the range; `100` by default. */
  maxValue?: number;

  /** No known value: no `accessibilityValue.now`, a fixed quarter arc, a spinning track. */
  isIndeterminate?: boolean;

  /** How the value is formatted; `{ style: "percent" }` by default. */
  formatOptions?: Intl.NumberFormatOptions;

  /** Overrides the formatted value text. A `string`, because NSH's accessible value text is one. */
  valueLabel?: string;

  /** Accepted, no effect: upstream always renders `role="progressbar"`, overwriting the caller's value. */
  role?: AccessibilityRole;

  /** Accepted, no effect, as upstream: `:disabled` never matches the root `div`. */
  disabled?: boolean;

  /** Accepted, no effect: NSH has no data attributes; this alias opens R-011's disabled look instead. */
  "data-disabled"?: boolean | "true" | "false";

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;
}

/**
 * `ProgressCircle.Root` / `ProgressCircleRoot`: one progress semantics with two
 * drawn rings, as in HeroUI 3.2.7.
 *
 * It creates the read-only progress state through `createProgressState`, reads
 * the two paints from the theme, and provides two contexts: the circle's own
 * (slots, percentage, value text, indeterminate flag, paints) and the library's
 * `FieldContext`, whose `registerLabel` lets an internal `Label` name the
 * `progressbar` — the NSH stand-in for upstream's `LabelContext` /
 * `aria-labelledby` association (port sheet §2).
 *
 * Built on the core `View`: nsh/base's linear `Progress` fixes track and fill
 * slots on one horizontal axis and cannot host two arbitrary rings (port sheet
 * §3, criteria B1 and B3).
 */
export function ProgressCircleRoot(props: ProgressCircleRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "color",
    "size",
    "value",
    "minValue",
    "maxValue",
    "isIndeterminate",
    "formatOptions",
    "valueLabel",
    "role",
    "disabled",
    "render",
    "slot",
    "id",
    "nativeID",
    "focusable",
    "accessibilityLabel",
    "accessibilityState",
    "accessibilityElementsHidden",
    "aria-label",
    "aria-hidden",
    "aria-disabled",
    "aria-valuetext",
    "data-disabled",
  ] as const);

  const state = createProgressState({
    value: () => local.value,
    minValue: () => local.minValue,
    maxValue: () => local.maxValue,
    isIndeterminate: () => local.isIndeterminate,
    formatOptions: () => local.formatOptions,
    valueLabel: () => local.valueLabel,
  });

  const renderProps: ProgressCircleRenderProps = {
    percentage: state.percentage,
    valueText: state.valueText,
    isIndeterminate: state.isIndeterminate,
  };

  // The slot functions follow both variant dimensions; a `tv()` call in the
  // body would freeze `color` / `size` at their first value.
  const slots = computed(() =>
    progressCircleVariants({ color: local.color, size: local.size }),
  );

  /**
   * R-002 / R-016 … R-020: the fill paint.
   *
   * Upstream writes `--progress-circle-stroke` from the `color` modifier;
   * NSH cannot read or write custom properties, so the same five tokens are
   * looked up here and handed to `FillCircle` through the context. A token
   * follows the appearance by itself.
   */
  const stroke = computed(() => {
    switch (local.color ?? "accent") {
      case "default":
        return themeToken("default-foreground"); // R-016
      case "success":
        return themeToken("success"); // R-018
      case "warning":
        return themeToken("warning"); // R-019
      case "danger":
        return themeToken("danger"); // R-020
      case "accent":
      default:
        return themeToken("accent"); // R-002 / R-017
    }
  });

  /** R-003: the track paint is always `--default`, whatever `color` says. */
  const trackStroke = computed(() => themeToken("default"));

  /**
   * R-011: the three selectors that reach a `div` are `[data-disabled="true"]`
   * and `[aria-disabled="true"]` (`:disabled` never matches a div upstream
   * either). `data-disabled` is the NSH alias for the attribute CSS branch;
   * the `disabled` prop intentionally plays no part.
   */
  const isDisabled = computed(
    () =>
      local["aria-disabled"] === true ||
      local["data-disabled"] === true ||
      local["data-disabled"] === "true",
  );

  // --- Registered label (the stand-in for aria-labelledby) -------------------
  // A `Label` inside the root reports its text here. Upstream opens the Label
  // slot when the caller supplies neither `aria-label` nor `aria-labelledby`
  // (`useSlot(!props['aria-label'] && !props['aria-labelledby'])`), but the
  // slot's callback ref reopens it as soon as the Label attaches
  // (utils.tsx:364-388 sets `hasSlot` true from the ref), so a registered
  // Label names the bar even when the caller also passed `aria-label`. The
  // name then reads "<aria-label> <label text>" through `aria-labelledby`.
  // NSH cannot resolve that cross-element reference, so the two are joined
  // below. Only one Label names a progressbar upstream (the context is a
  // single slot); a second one replaces the first.
  const labelSource = signal<(() => string | undefined) | undefined>(undefined);

  const field: FieldState = {
    registerLabel: (read) => {
      labelSource.set(read);

      return () => labelSource.set(undefined);
    },
  };

  const labelText = computed(() => {
    const read = labelSource();
    const text = read?.();

    return text !== undefined && text.length > 0 ? text : undefined;
  });

  // --- Accessibility ---------------------------------------------------------
  // The caller's name (the DOM `aria-label` first, then NSH's own
  // `accessibilityLabel`) and a Label registered through `FieldContext` both
  // name the bar: upstream's `aria-labelledby` reads "<caller name> <label
  // text>" ("Outer Inner"), and the Label is never dropped because a caller
  // name exists. Either one alone names the bar. NSH has no cross-element
  // reference, so the parts are joined here with one space.
  const accessibilityLabel = computed(() => {
    const ownLabel = local["aria-label"] || local.accessibilityLabel;
    const parts = [ownLabel, labelText()].filter(
      (part): part is string => part !== undefined && part.length > 0,
    );

    return parts.length > 0 ? parts.join(" ") : undefined;
  });

  /**
   * Upstream sets `aria-valuemin` / `aria-valuemax` in both modes, omits
   * `aria-valuenow` while indeterminate, and writes `aria-valuetext` from
   * `valueText`, which is undefined while indeterminate (the caller's own
   * `aria-valuetext` never reaches it; see `createProgressState`).
   */
  const accessibilityValue = computed(() => {
    const min = state.minValue();
    const max = state.maxValue();
    const text = state.valueText();

    if (state.isIndeterminate()) {
      return text === undefined ? { min, max } : { min, max, text };
    }

    const now = state.value();

    return text === undefined
      ? { min, max, now }
      : { min, max, now, text };
  });

  const a11yState = computed(() =>
    accessibilityState(local.accessibilityState, local["aria-disabled"]),
  );

  // --- Render props ----------------------------------------------------------
  // D17: the function forms are called once per state change, never per frame.
  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // The slot class first, then the caller's, so a later class wins on a
  // conflict. Concatenated directly (as Switch and Chip do) rather than
  // through `tv`'s `className`, which would let tailwind-merge arbitrate
  // token classes.
  const classes = computed(() =>
    [slots().base(), resolvedClassName() ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // The single read of `children`, at its placement inside the providers. A
  // one-argument function is the render prop (research 4.1 / D17); a
  // zero-argument function is NSH's reactive child and is placed as is.
  const resolveChildren = (
    children: JSX.Element | ((values: ProgressCircleRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      return untracked(() =>
        (children as (values: ProgressCircleRenderProps) => JSX.Element)(
          renderProps,
        ),
      );
    }

    return children as JSX.Element;
  };

  const contextValue: ProgressCircleContextValue = {
    slots,
    percentage: state.percentage,
    valueText: state.valueText,
    isIndeterminate: state.isIndeterminate,
    stroke,
    trackStroke,
  };

  return (
    <ProgressCircleContext.Provider value={contextValue}>
      <FieldContext.Provider value={field}>
        <View
          {...viewProps(rest)}
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          role="progressbar"
          accessible
          accessibilityLabel={accessibilityLabel()}
          accessibilityValue={accessibilityValue()}
          accessibilityState={a11yState()}
          accessibilityElementsHidden={
            local["aria-hidden"] ?? local.accessibilityElementsHidden
          }
          // R-011: `status-disabled` → opacity .5, cursor not-allowed,
          // pointer-events none. The theme has no variables for them, so they
          // are written as the literals the sheet names.
          classList={{
            "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
          }}
          // A `<div>` is not a keyboard focus stop upstream.
          focusable={local.focusable ?? false}
          class={classes()}
          style={resolvedStyle()}
        >
          {resolveChildren(local.children)}
        </View>
      </FieldContext.Provider>
    </ProgressCircleContext.Provider>
  );
}
