import type { NumberFormatOptions } from "@internationalized/number";
import { computed, signal, split, untracked, View } from "nsh";
import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { createProgressState } from "../../primitives/create-progress-state";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { joinClassNames } from "./class-names";
import type { ProgressBarRenderProps } from "./context";
import { ProgressBarContext, type ProgressBarContextValue } from "./context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./progress-bar-dom-props";
import {
  progressBarVariants,
  type ProgressBarVariants,
} from "./progress-bar.styles";
import { renderChildren } from "./render-children";

export type { ProgressBarRenderProps } from "./context";

/* -------------------------------------------------------------------------------------------------
 * ProgressBar Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ProgressBar.Root`: HeroUI 3.2.7's `ProgressBarRootProps`, which
 * is React Aria Components' `ProgressBar` (the read-only value contract plus
 * `formatOptions` / `valueLabel`) and the two variant dimensions, expressed
 * with NSH's view host props.
 *
 * The DOM-only members upstream (`slot`, `render`, the `aria-*` relations,
 * `data-*`) are accepted so code written against HeroUI keeps compiling; see
 * the port sheet section 1 and section 8 for what they can and cannot do here.
 */
export interface ProgressBarRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The content, or a render prop called once with `{ percentage, valueText,
   * isIndeterminate }` (D17: accessors). Bare strings inside it become `Text`
   * at the placement.
   */
  children?:
    | JSX.Element
    | ((values: ProgressBarRenderProps) => JSX.Element);

  /**
   * Appended after the variant classes; later classes win. The function form
   * gets the same accessors the render prop gets.
   */
  className?: string | ((values: ProgressBarRenderProps) => string | undefined);

  /** Style of the root view; the function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ProgressBarRenderProps) => StyleProp<ViewStyle>);

  /** The current value, clamped into `[minValue, maxValue]`. @default 0 */
  value?: number;

  /** The range's minimum. @default 0 */
  minValue?: number;

  /** The range's maximum. @default 100 */
  maxValue?: number;

  /**
   * Shows motion instead of a value: no percentage, no text, a 40%-wide fill
   * translating across the track. @default false
   */
  isIndeterminate?: boolean;

  /**
   * How the value is formatted when no `valueLabel` is given.
   * @default { style: "percent" }
   */
  formatOptions?: NumberFormatOptions;

  /**
   * A human-readable value, used for the accessible value text and as the
   * default `Output` content. HeroUI types it as `ReactNode`; it ends up in
   * `aria-valuetext` and a text node, so it is narrowed to `string` here
   * (port sheet section 1, section 8).
   */
  valueLabel?: string;

  /** The fill color. @default "accent" */
  color?: ProgressBarVariants["color"];

  /** The track height and corner radius. @default "md" */
  size?: ProgressBarVariants["size"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /**
   * Accepted, no effect: upstream forces `role="progressbar"` in its
   * `mergeProps`, so a caller's value never reaches the element.
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

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * ProgressBar.Root / ProgressBarRoot: a read-only value displayed by four parts
 * a caller arranges freely. Upstream is a CSS grid with named areas; NSH has no
 * `grid-area`, so the areas become explicit placement on `Output` and `Track`
 * and the caller's `Label` takes the remaining cell by auto-placement (port
 * sheet section 4).
 *
 * Built on the core `View`, not nsh/base `Progress`: that component fixes a
 * "track → indicator → children" structure and accepts only a 0–100 percent
 * value, so HeroUI's Output-before-Track layout and its
 * `minValue` / `maxValue` / `formatOptions` / `valueLabel` contract cannot land
 * in it (port sheet section 3, criteria B1 and B3).
 *
 * The only writable state is the text each `Label` inside registers: NSH has no
 * `<label for>` / `aria-labelledby`, so the registered text becomes the root's
 * `accessibilityLabel`, with a direct `aria-label` winning.
 */
export function ProgressBarRoot(props: ProgressBarRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "value",
    "minValue",
    "maxValue",
    "isIndeterminate",
    "formatOptions",
    "valueLabel",
    "color",
    "size",
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
  const color = computed(() => local.color ?? "accent");
  const size = computed(() => local.size ?? "md");

  // One `tv()` result for the whole tree: the root's base classes and the three
  // parts read their own slots from it, so a `color` / `size` change updated in
  // one place (port sheet section 2).
  const slots = computed(() => progressBarVariants({ color: color(), size: size() }));

  // --- Value state -----------------------------------------------------------
  const progress = createProgressState({
    value: () => local.value,
    minValue: () => local.minValue,
    maxValue: () => local.maxValue,
    isIndeterminate: () => local.isIndeterminate,
    formatOptions: () => local.formatOptions,
    valueLabel: () => local.valueLabel,
  });

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

  // R-020: `.progress-bar:disabled [data-slot="label"] { @apply opacity-100 }`.
  // Only `registerLabel` is provided: FieldContext's `isDisabled` would dim the
  // Label too, and upstream deliberately cancels the Label's own 0.5 so the
  // two do not compound. The whole tree's 0.5 comes from the root alone.
  const fieldState: FieldState = { registerLabel };

  // --- Render props and classes ---------------------------------------------
  const renderProps: ProgressBarRenderProps = {
    percentage: progress.percentage,
    valueText: progress.valueText,
    isIndeterminate: progress.isIndeterminate,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // R-001 / R-003 / R-005 in `progress-bar.styles.ts`, then the caller's
  // `className`; later classes win.
  const classes = computed(() => joinClassNames(slots().base(), resolvedClassName()));

  // --- Disabled appearance (R-019) ------------------------------------------
  const isAriaDisabled = computed(
    () => local["aria-disabled"] === true || local["aria-disabled"] === "true",
  );
  const isDataDisabled = computed(
    () => local["data-disabled"] === true || local["data-disabled"] === "true",
  );
  const isDisabled = computed(() => isAriaDisabled() || isDataDisabled());

  // `aria-disabled` is the switch screen readers hear; `data-disabled` only
  // changes the look upstream, so it stays out of the accessibility state.
  const accessibilityState = computed(() => {
    const own = local.accessibilityState ?? {};

    return {
      ...own,
      disabled:
        local["aria-disabled"] === undefined ? own.disabled : isAriaDisabled(),
    };
  });

  const accessibilityLabel = () =>
    local["aria-label"] ?? local.accessibilityLabel ?? labelText();

  // The Track measures itself; Fill reads this when animating. Until the first
  // layout the indeterminate animation waits (port sheet section 4, R-017).
  const trackWidth = signal(0);

  const contextValue: ProgressBarContextValue = {
    slots,
    state: renderProps,
    trackWidth,
    setTrackWidth: (width: number) => trackWidth.set(width),
  };

  // HeroUI's root reads `props.children` here, inside both providers and at the
  // placement; a computed made in the body would be evaluated outside them and
  // a Label would lose the field context. One read only.
  const resolveChildren = (
    children: JSX.Element | ((values: ProgressBarRenderProps) => JSX.Element),
  ) => {
    // A one-argument function is the render prop (HeroUI's `children?:
    // ReactNode | ((values) => ReactNode)`); D17 calls it once with accessors.
    // A zero-argument function is NSH's own reactive child and reaches
    // `renderChildren` untouched.
    if (typeof children === "function" && children.length >= 1) {
      const rendered = untracked(() =>
        (children as (values: ProgressBarRenderProps) => JSX.Element)(renderProps),
      );

      return renderChildren(rendered);
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <ProgressBarContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <View
          {...hostProps(rest)}
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          role="progressbar"
          accessibilityLabel={accessibilityLabel()}
          accessibilityValue={{
            min: progress.minValue(),
            max: progress.maxValue(),
            // React Aria leaves `aria-valuenow` off when indeterminate; that is
            // what an undefined `now` says here (port sheet section 8).
            now: progress.isIndeterminate() ? undefined : progress.value(),
            text: progress.valueText(),
          }}
          accessibilityState={accessibilityState()}
          class={classes()}
          // R-019: `.progress-bar:disabled / [data-disabled="true"] /
          // [aria-disabled="true"]` → `@apply status-disabled` (opacity 0.5,
          // cursor not-allowed, pointer-events none). The theme has no such
          // variables, so the values are literals (common rules).
          classList={{
            "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
          }}
          style={resolvedStyle()}
        >
          {resolveChildren(local.children)}
        </View>
      </FieldContext.Provider>
    </ProgressBarContext.Provider>
  );
}
