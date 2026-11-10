import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import {
  FALLBACK_RADIO_ITEM_CONTEXT,
  type RadioFieldRenderProps,
  RadioItemContext,
} from "./radio-context";
import { radioVariants } from "./radio.styles";
import { renderChildren } from "./render-children";

/**
 * The props of `Radio.Indicator`: HeroUI 3.2.7's `RadioIndicatorProps`, a
 * `span` placed inside `Radio.Control` that draws the default dot, or the
 * caller's custom content instead.
 *
 * `children` is the HeroUI render prop (a function with parameters) receiving
 * the field state (D17); a plain element replaces the default dot, and an empty
 * render result restores it (upstream's `:empty`).
 */
export interface RadioIndicatorProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Custom content, or a render prop called once with accessors. */
  children?: JSX.Element | ((values: RadioFieldRenderProps) => JSX.Element);

  /** Appended after the indicator slot classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  ref?: (node: ViewRef) => void;

  /** The DOM attribute upstream; `true` unless the caller overrides it. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** Hides the indicator from assistive technologies; `aria-hidden` wins. */
  accessibilityElementsHidden?: boolean;

  /** An identifier for UI tests, on the indicator. */
  testID?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** The name other elements refer to; also set by `id`. */
  nativeID?: string;
}

/**
 * `Radio.Indicator` / `RadioIndicator`: absolutely fills the Control. Without
 * content it draws the default dot; with content (including a render prop that
 * returns a node) it draws only that, as upstream's `:empty` does. The dot's
 * fill and scale follow the selection, the hover and the group's variant
 * (R-015, R-022—R-024, R-031, R-032).
 *
 * The decorative dot is hidden from assistive technologies by default, the
 * `aria-hidden="true"` HeroUI hard-codes on `dom.span` (`radio.tsx:131`); a
 * caller may override it, as `{...props}` does there.
 */
export function RadioIndicator(props: RadioIndicatorProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "aria-hidden",
    "slot",
    "render",
    "accessibilityElementsHidden",
    "testID",
    "id",
    "nativeID",
  ] as const);

  const ctx = RadioItemContext() ?? FALLBACK_RADIO_ITEM_CONTEXT;

  // One read of `children` (common rules): the same value decides whether the
  // default dot shows and, when it is a render prop, what it renders.
  const children = computed(() => local.children);

  const fieldRenderProps: RadioFieldRenderProps = {
    isSelected: ctx.isSelected,
    isDisabled: ctx.isDisabled,
    isReadOnly: ctx.isReadOnly,
    isInvalid: ctx.isInvalid,
    isRequired: ctx.isRequired,
  };

  // The render prop runs inside the `computed` rather than under `untracked`,
  // because HeroUI calls it on every render and a body may return a conditional
  // tree (`children(state)` in `radio.tsx:120`). With the call untracked, that
  // whole tree is decided once and freezes; tracking it re-runs the body when
  // the state it read at the top level changes. A body that reads the state
  // only inside its child expressions still reads nothing here, so the common
  // case is built once and left alone.
  const resolved = computed(() => {
    const value = children();

    if (typeof value === "function" && value.length >= 1) {
      return (value as (values: RadioFieldRenderProps) => JSX.Element)(fieldRenderProps);
    }

    return value as JSX.Element;
  });

  // R-022: `:empty` becomes this test on the resolved content. Upstream draws
  // the dot whenever the indicator ends up with no children, so a render prop
  // that returns nothing gets the dot too (the sheet's §5 reading of `:empty`).
  const showsDefault = computed(() => {
    const value = resolved();

    return value === undefined || value === null || typeof value === "boolean";
  });

  // R-022—R-024, R-015, R-031, R-032: one owner for the dot's fill and scale.
  // Selected wins over every unselected branch, and the pressed scale replaces
  // the resting one (one property, one owner).
  const dotClasses = computed(() => {
    const parts = [
      "size-full rounded-lg bg-field transition duration-200 ease-out motion-reduce:transition-none",
    ];

    if (ctx.isSelected()) {
      // R-023: selected dot.
      parts.push("bg-accent-foreground");
      // R-024: selected + pressed, 8px instead of 6px.
      parts.push(ctx.isPressed() ? "scale-[0.5714]" : "scale-[0.4286]");
    } else if (ctx.variant() === "secondary") {
      // R-031 / R-032: the secondary dot is `--radio-control-bg`, and the
      // hover one `--radio-control-bg-hover`.
      parts.push(ctx.isHovered() ? "bg-default-hover" : "bg-default");
    } else if (ctx.isHovered()) {
      // R-015: hover, unselected, primary.
      parts.push("bg-field-hover");
    }

    return parts.join(" ");
  });

  const classes = computed(() =>
    [radioVariants().indicator(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // The upstream `aria-hidden="true"` is a default a caller can override,
  // because HeroUI spreads `{...props}` after it.
  const hidden = computed(
    () => local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true,
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityElementsHidden={hidden()}
      importantForAccessibility={hidden() ? "no-hide-descendants" : "auto"}
      class={classes()}
      style={local.style}
    >
      {showsDefault() ? <View class={dotClasses()} /> : renderChildren(resolved())}
    </View>
  );
}
