import { computed, split, Text } from "nsh";
import type { JSX, TextProps, ViewRef } from "nsh";

import { joinClassNames } from "./class-names";
import { ProgressBarContext } from "./context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./progress-bar-dom-props";

/* -------------------------------------------------------------------------------------------------
 * ProgressBar Output
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ProgressBar.Output`: HeroUI 3.2.7's `ProgressBarOutputProps`,
 * which is a `span` (or another intrinsic element through the `E` generic)
 * with `children` and `className`.
 *
 * NSH has one kind of text element, so the host is fixed to `Text`: it renders
 * the default value text and a caller's bare string, which a `View` would not.
 */
export interface ProgressBarOutputProps
  extends Omit<TextProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Rendered as upstream's `span` renders it; the value text when omitted. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the `Text` host as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * ProgressBar.Output / ProgressBarOutput: the formatted value.
 *
 * Upstream renders `<span>{children ?? state.valueText}</span>`. NSH's `Text`
 * is the same shape, so the default value text, a caller's bare string and the
 * `text-sm font-medium tabular-nums` typography all land on one host (port
 * sheet section 5). The slot classes come from the root's context; outside a
 * root the part renders only the caller's `className`, as upstream's empty
 * context does.
 */
export function ProgressBarOutput(props: ProgressBarOutputProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "slot",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // Read once, in the body: the bar this output belongs to, if any.
  const bar = ProgressBarContext();

  // R-007 / R-008 in `progress-bar.styles.ts`, then the caller's `className`.
  const classes = computed(() =>
    joinClassNames(bar?.slots().output(), local.className),
  );

  return (
    <Text
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
    >
      {local.children ?? bar?.state.valueText()}
    </Text>
  );
}
