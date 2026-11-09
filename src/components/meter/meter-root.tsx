import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import type { NumberFormatOptions } from "@internationalized/number";
import { computed, signal, split, untracked, View } from "nsh";

import { createProgressState } from "../../primitives/create-progress-state";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { joinClassNames } from "./class-names";
import { hostProps, type AriaProps, type DataProps, type GlobalDomProps } from "./meter-dom-props";
import { MeterContext, type MeterContextValue, type MeterRenderProps } from "./meter-context";
import { meterVariants, type MeterColor, type MeterSize } from "./meter.styles";
import { renderChildren } from "./render-children";

export type { MeterRenderProps } from "./meter-context";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Meter.Root`: HeroUI 3.2.7's `MeterRootProps`, which is React
 * Aria Components' `Meter` plus the two variant dimensions, expressed with
 * NSH's view host props.
 *
 * The value is read-only upstream: there is no `defaultValue`, no
 * `onChange`, no uncontrolled fallback. The DOM-only members (`slot`,
 * `render`, the `aria-*` relations, `data-*`) are accepted so code written
 * against HeroUI keeps compiling; see port sheet §1 and §8 for what they can
 * and cannot do here.
 */
export interface MeterRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The content, or a render prop called once with `{ percentage, valueText }`
   * (D17: accessors). Bare strings inside it become `Text` at the placement.
   */
  children?: JSX.Element | ((values: MeterRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: MeterRenderProps) => string | undefined);

  /** Style of the root view; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: MeterRenderProps) => StyleProp<ViewStyle>);

  /** The current value, clamped into `[minValue, maxValue]`. @default 0 */
  value?: number;

  /** The range's minimum. @default 0 */
  minValue?: number;

  /** The range's maximum. @default 100 */
  maxValue?: number;

  /** How the value is formatted when no `valueLabel` is given. @default { style: "percent" } */
  formatOptions?: NumberFormatOptions;

  /**
   * A human-readable value, used for the accessible value text and as the
   * default `Output` content. HeroUI types it as `ReactNode`; it ends up in
   * `aria-valuetext` and a text node, so it is narrowed to `string` here
   * (port sheet §1, §8).
   */
  valueLabel?: string;

  /** The fill color. @default "accent" */
  color?: MeterColor;

  /** The track height and corner radius. @default "md" */
  size?: MeterSize;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The accessible name, preferring it over the text a `Label` inside registers. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /**
   * Disables the meter: dims it and marks it disabled for assistive
   * technology. Upstream also accepts `data-disabled="true"`, which has no
   * NSH channel (port sheet §4, R-029).
   */
  "aria-disabled"?: boolean;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * Meter.Root / MeterRoot: the read-only quantity indicator.
 *
 * It is built on the core `View`, not on nsh/base `Progress`: that component
 * fixes the "track → indicator → children" structure and accepts only a 0–100
 * percent `value`, so HeroUI's Output-before-Track layout, its
 * `minValue` / `maxValue` / `formatOptions` / `valueLabel` contract and its
 * accessible value cannot land in it (port sheet §3, criteria B1 and B3). The
 * `View` satisfies all four criteria by itself.
 *
 * It holds one piece of writable state, the text every `Label` inside it
 * registers: NSH has no `<label for>` / `aria-labelledby`, so the label's text
 * becomes the root's `accessibilityLabel`. Everything else is derived.
 */
export function MeterRoot(props: MeterRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "value",
    "minValue",
    "maxValue",
    "formatOptions",
    "valueLabel",
    "color",
    "size",
    "id",
    "nativeID",
    "slot",
    "render",
    "aria-label",
    "aria-labelledby",
    "aria-disabled",
    "accessibilityLabel",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // --- Variants --------------------------------------------------------------
  const color = computed(() => local.color ?? "accent");
  const size = computed(() => local.size ?? "md");

  // One tv() result for the whole tree: the root's base classes and the three
  // parts read their own slots from it (port sheet §2).
  const slots = computed(() => meterVariants({ color: color(), size: size() }));

  // --- Value state -----------------------------------------------------------
  // React Aria Components' clamp → percentage → text chain, shared with
  // ProgressBar through the primitive (port sheet §5).
  const progress = createProgressState({
    value: () => local.value,
    minValue: () => local.minValue,
    maxValue: () => local.maxValue,
    formatOptions: () => local.formatOptions,
    valueLabel: () => local.valueLabel,
  });

  // R-029: `.meter:disabled, .meter[data-disabled="true"],
  // .meter[aria-disabled="true"]` → `status-disabled` (opacity 0.5, cursor
  // not-allowed, pointer-events none). `:disabled` never applies to a div and
  // `data-disabled` has no NSH channel; `aria-disabled` is the one entry left.
  const isDisabled = computed(() => local["aria-disabled"] === true);

  // --- Registered label text (the stand-in for label for / aria-labelledby) --
  // A Label inside the meter reports its text here; the root turns it into the
  // accessible name, so `<Label>Storage</Label>` names the meter "Storage"
  // without touching Label's code.
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

  // Only `registerLabel`: FieldContext's `isDisabled` would dim the Label as
  // well, and upstream deliberately cancels the Label's own 0.5 when the meter
  // is disabled so the two do not compound (port sheet §4, R-030).
  const fieldState: FieldState = { registerLabel };

  // --- Render props and classes ---------------------------------------------
  const renderProps: MeterRenderProps = {
    percentage: progress.percentage,
    valueText: progress.valueText,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // R-001 … R-003, R-005, R-007 in `meter.styles.ts`, then the caller's
  // `className`; later classes win.
  const classes = computed(() => joinClassNames(slots().base(), resolvedClassName()));

  const contextValue: MeterContextValue = {
    slots,
    percentage: progress.percentage,
    valueText: progress.valueText,
  };

  // HeroUI's roots read `props.children` here, inside both providers and at
  // the placement; a computed made in the body would be evaluated outside
  // them and a Label would lose the field context. One read only.
  const resolveChildren = (
    children: JSX.Element | ((values: MeterRenderProps) => JSX.Element),
  ) => {
    // A one-argument function is the render prop (HeroUI's
    // `children?: ReactNode | ((values: MeterRenderProps) => ReactNode)`);
    // D17 calls it once with accessors. A zero-argument function is NSH's own
    // reactive child and reaches `renderChildren` untouched.
    if (typeof children === "function" && children.length >= 1) {
      const rendered = untracked(() =>
        (children as (values: MeterRenderProps) => JSX.Element)(renderProps),
      );

      return renderChildren(rendered);
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <MeterContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <View
          {...hostProps(rest)}
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          role="progressbar"
          accessibilityLabel={
            local["aria-label"] ?? local.accessibilityLabel ?? labelText()
          }
          accessibilityValue={{
            min: progress.minValue(),
            max: progress.maxValue(),
            now: progress.value(),
            text: progress.valueText(),
          }}
          accessibilityState={{ disabled: isDisabled() }}
          class={classes()}
          classList={{
            "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
          }}
          style={resolvedStyle()}
        >
          {resolveChildren(local.children)}
        </View>
      </FieldContext.Provider>
    </MeterContext.Provider>
  );
}
