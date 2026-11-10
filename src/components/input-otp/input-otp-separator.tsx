import type { JSX, ViewProps, ViewRef } from "nsh";
import { computed, split, View } from "nsh";

import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./input-otp-dom-props";
import { hostProps } from "./input-otp-dom-props";
import { InputOTPContext } from "./input-otp-context";

/* -------------------------------------------------------------------------------------------------
 * InputOTP Separator
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `InputOTP.Separator`: HeroUI 3.2.7's `InputOTPSeparatorProps`, a
 * `div`'s intrinsic attributes. Upstream's part is self-closing and ignores
 * children it is given (port sheet §1.5).
 */
export interface InputOTPSeparatorProps
  extends Omit<ViewProps, "children" | "class" | "classList" | "style" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * Accepted, no effect: upstream's part renders a bare `div` and passes the
   * caller's children nowhere (port sheet §1.5).
   */
  children?: JSX.Element;

  /** Appended after the bar's slot classes; later classes win. */
  className?: string;

  /** Style of the bar. */
  style?: ViewProps["style"];

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to (NSH's counterpart of a DOM id). */
  nativeID?: string;

  /** The accessible name. */
  "aria-label"?: string;

  /** The accessible name through NSH's own prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH has no tab order on plain views. */
  tabIndex?: number;

  /** Accepted, no effect: views take presses through `onPress`. */
  onClick?: unknown;

  /** Accepted, no effect, as `onClick`. */
  onDoubleClick?: unknown;

  /** Accepted, no effect, as `onClick`. */
  onMouseDown?: unknown;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Forwarded to the `View` host as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `InputOTP.Separator` / `InputOTPSeparator`: the small dash HeroUI's stories
 * put between two groups. It is a decorative 2×6 bar with no role (R-022);
 * `Separator` is not reused, because that part carries the separator role and
 * its own look (port sheet §5).
 */
export function InputOTPSeparator(props: InputOTPSeparatorProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "aria-label",
    "accessibilityLabel",
    "tabIndex",
    "onClick",
    "onDoubleClick",
    "onMouseDown",
    "render",
    "slot",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // Read once in the body: the root whose separator this is, if any.
  const ctx = InputOTPContext();

  const classes = computed(() => joinClassNames(ctx?.slots.separator() ?? "", local.className));

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      // A fixed test identity, not a public prop (port sheet §4b).
      testID="input-otp-separator"
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
    />
  );
}
