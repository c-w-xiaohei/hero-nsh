import type { JSX, ViewProps, ViewRef } from "nsh";
import { computed, split, View } from "nsh";

import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./input-otp-dom-props";
import { hostProps } from "./input-otp-dom-props";
import { InputOTPContext } from "./input-otp-context";

/* -------------------------------------------------------------------------------------------------
 * InputOTP Group
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `InputOTP.Group`: HeroUI 3.2.7's `InputOTPGroupProps`, a `div`'s
 * intrinsic attributes. The DOM-only ones are accepted and never read (port
 * sheet §1.3).
 */
export interface InputOTPGroupProps
  extends Omit<ViewProps, "class" | "classList" | "style" | "ref" | "testID">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The cells; read once, at its placement. */
  children?: JSX.Element;

  /** Appended after the group's slot classes; later classes win. */
  className?: string;

  /** Style of the group. */
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
 * `InputOTP.Group` / `InputOTPGroup`: a row of cells. It only carries the
 * group's flex classes and paints the caller's children; upstream it is the
 * `div` that `input-otp`'s container distributes the cells in (port sheet §1.3,
 * R-004).
 */
export function InputOTPGroup(props: InputOTPGroupProps): JSX.Element {
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
    "render",
    "slot",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "onClick",
    "onDoubleClick",
    "onMouseDown",
  ] as const);

  // Read once in the body: the root whose cells these are, if any. A standalone
  // group simply has no slot classes, as upstream's `slots?.group`.
  const ctx = InputOTPContext();

  const classes = computed(() => joinClassNames(ctx?.slots.group() ?? "", local.className));

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      // A fixed test identity, not a public prop (port sheet §4b).
      testID="input-otp-group"
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
    >
      {/* The single read of `props.children`, at its placement. */}
      {local.children}
    </View>
  );
}
