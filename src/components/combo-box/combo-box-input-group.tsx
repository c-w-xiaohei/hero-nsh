import type {
  AccessibilityState,
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, split, View } from "nsh";

import { ComboBoxContext } from "./combo-box-context";

export interface ComboBoxInputGroupProps {
  /** The caller's `Input` (and its `ComboBox.Trigger`); read once, at the placement. */
  children?: JSX.Element;

  /** Appended after the input group's own classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** The container view; `measure()` on it is the popover's width source. */
  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  accessibilityState?: AccessibilityState;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * ComboBox.InputGroup / ComboBoxInputGroup: the relative row that holds the
 * caller's `Input` and its `ComboBox.Trigger`, and the popover's anchor.
 *
 * Upstream the group is rendered by the `Trigger` inside it: HeroUI injects the
 * container props into the last child so React Aria's `Group` gets the press
 * semantics (`combo-box.tsx:120-150`). NSH has no handler injection and no
 * group press to keep, so the group renders itself while the DOM shape stays
 * the same — `div > Input, Trigger` (port sheet §1, §3).
 */
export function ComboBoxInputGroup(
  props: ComboBoxInputGroupProps,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "accessibilityState",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const combo = ComboBoxContext();

  if (!combo) {
    return null;
  }

  // R-037: the group is the popover's anchor and its width source, so it
  // registers itself instead of handing a ref out (NSH has no ref plumbing from
  // a parent into a child part).
  let unregister: (() => void) | undefined;

  cleanup(() => unregister?.());

  const handleRef = (node: ViewRef | undefined) => {
    unregister?.();

    if (node) {
      unregister = combo.registerAnchor(node);
    } else {
      unregister = undefined;
    }

    local.ref?.(node as ViewRef);
  };

  const classes = () =>
    [combo.slots().inputGroup(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ");

  return (
    <View
      {...rest}
      ref={handleRef}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      accessibilityState={local.accessibilityState}
      class={classes()}
      style={local.style}
      onLayout={local.onLayout}
    >
      {local.children}
    </View>
  );
}
