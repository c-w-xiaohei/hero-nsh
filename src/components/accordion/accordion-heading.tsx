import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split } from "nsh";
import { AccordionHeader } from "nsh/base";

import { renderChildren } from "./children";
import { AccordionContext } from "./accordion-context";

/**
 * The props of `Accordion.Heading`: HeroUI 3.2.7's `AccordionHeadingProps`,
 * which is React Aria Components' `Heading` (a heading element around the
 * trigger). `level` defaults to 3, as upstream and as nsh/base's header.
 */
export interface AccordionHeadingProps {
  /** The heading level screen readers announce (`h3` upstream by default). */
  level?: number;

  /** The Trigger, and anything else in the heading. */
  children?: JSX.Element;

  /** Appended after the heading slot classes; a string, as upstream's type. */
  className?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** The heading was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** Style of the heading. */
  style?: StyleProp<ViewStyle>;

  /** The heading view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect (D18). */
  [key: `data-${string}`]: unknown;
}

/**
 * Accordion.Heading / AccordionHeading: the heading around a Trigger, built on
 * nsh/base `AccordionHeader` (port sheet §3). That component takes any children
 * (B1), paints nothing (B2) and turns `level` into the accessibility level (B3
 * / B4 are trivial: it holds no state).
 */
export function AccordionHeading(props: AccordionHeadingProps): JSX.Element {
  const [local] = split(props, [
    "level",
    "children",
    "className",
    "render",
    "id",
    "nativeID",
    "testID",
    "onLayout",
    "style",
    "ref",
  ] as const);

  const accordion = AccordionContext();
  const level = computed(() => local.level ?? 3);

  // R-005: `.accordion__heading` → `flex`, then the caller's class.
  const classes = computed(() =>
    [accordion?.slots().heading() ?? "", local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <AccordionHeader
      level={level()}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      class={classes()}
      style={local.style}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children as JSX.Element)}
    </AccordionHeader>
  );
}
