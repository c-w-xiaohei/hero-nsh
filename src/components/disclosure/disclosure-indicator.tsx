import type { JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { IconChevronDown } from "../icons";
import type { ThemeColorToken } from "../../theme";
import { DisclosureContext, FALLBACK_DISCLOSURE_CONTEXT } from "./disclosure-context";
import { disclosureVariants } from "./disclosure.styles";

/**
 * The props of `Disclosure.Indicator`: HeroUI 3.2.7's
 * `DisclosureIndicatorProps`, an `svg` by default whose classes are cloned onto
 * a caller's own icon when one is given.
 *
 * NSH has no `cloneElement`, so a caller's icon is **wrapped** in a `View` that
 * carries the size, the `ms-auto`, the transition and the rotation (port sheet
 * §8). `color` / `paint` are NSH additions for the default icon, which cannot
 * inherit `currentColor` (R-008).
 */
export interface DisclosureIndicatorProps {
  /**
   * A caller's own icon element. Upstream clones the indicator props onto it; here
   * it is wrapped. A non-element child falls back to the default chevron, as
   * upstream ignores it.
   */
  children?: JSX.Element;

  /** Appended after the indicator slot; later classes win. */
  className?: string;

  /** Style of the indicator wrapper (upstream: of the svg). */
  style?: StyleProp<ViewStyle>;

  /** The theme token the default chevron is painted with. @default "foreground" */
  color?: ThemeColorToken;

  /** Any CSS color for the default chevron; wins over `color`. */
  paint?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** The indicator's view; a callback, because a ref store throws on the web target. */
  ref?: (node: ViewRef) => void;

  /** The accessible name of the indicator. */
  accessibilityLabel?: string;

  /** Accepted, no effect: the element generic `E` is fixed to the NSH `View`. */
  render?: unknown;

  /** Accepted, no effect: there is no SVG document to describe. */
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  viewBox?: string;
  xmlns?: string;

  /** Every other `aria-*` attribute, accepted for API parity. */
  [key: `aria-${string}`]: unknown;

  /** Every `data-*` attribute: NSH projects none of them (D18). */
  [key: `data-${string}`]: unknown;
}

/** Whether a child is something to wrap, rather than a value upstream ignores. */
function isElementChild(node: JSX.Element): boolean {
  if (node === null || node === undefined) {
    return false;
  }

  const type = typeof node;

  if (type === "string" || type === "number" || type === "boolean") {
    return false;
  }

  return !Array.isArray(node);
}

/**
 * Disclosure.Indicator / DisclosureIndicator: the chevron at the end of the
 * trigger, rotated while expanded (port sheet §3).
 *
 * R-010: upstream flips it through `[data-expanded="true"] { -rotate-180 }`;
 * NSH has no `data-*` projection, so the rotation is a `classList` entry. The
 * transition (R-009) and the layout classes (R-007) sit on the wrapper that both
 * branches share, so a caller's icon rotates exactly like the default one.
 */
export function DisclosureIndicator(props: DisclosureIndicatorProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "color",
    "paint",
    "id",
    "nativeID",
    "testID",
    "ref",
    "accessibilityLabel",
    "render",
    "fill",
    "stroke",
    "strokeWidth",
    "viewBox",
    "xmlns",
  ] as const);

  const ctx = DisclosureContext() ?? FALLBACK_DISCLOSURE_CONTEXT;
  const slots = disclosureVariants();

  // Read once, at the placement, and share it: JSX reads of `props.children`
  // build new views every time (research 4.1 / 4.6).
  const children = computed(() => local.children);
  const showsCustomIcon = computed(() => isElementChild(children()));

  const classes = computed(() =>
    [slots.indicator(), local.className ?? ""].filter((part) => part.length > 0).join(" "),
  );

  return (
    <View
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityLabel={local.accessibilityLabel}
      class={classes()}
      classList={{ "-rotate-180": ctx.isExpanded() }}
      style={local.style}
    >
      {showsCustomIcon() ? (
        children()
      ) : (
        <IconChevronDown color={local.color} paint={local.paint} />
      )}
    </View>
  );
}
