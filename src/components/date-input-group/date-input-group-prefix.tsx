import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, split, View } from "nsh";

import {
  DateInputGroupAffixContext,
  DateInputGroupContext,
} from "./date-input-group-context";
import { renderChildren } from "./render-children";

/** The props of `DateInputGroup.Prefix`, HeroUI's `DateInputGroupPrefixProps`. */
export interface DateInputGroupPrefixProps {
  /** The icon or text before the segments. */
  children?: JSX.Element;

  /** Appended after the slot classes. */
  className?: string;

  /** The affix's style. */
  style?: StyleProp<ViewStyle>;

  /** An identifier for UI tests. */
  testID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** The affix's ref, forwarded as a callback only. */
  ref?: (node: ViewRef) => void;

  /** The affix was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** Any other DOM / global attribute HeroUI accepts; no effect here (D18). */
  [key: string]: unknown;
}

/**
 * DateInputGroup.Prefix / DateInputGroupPrefix: the icon or text before the
 * segments.
 *
 * Upstream's stylesheet pads the Input when this part exists
 * (`.date-input-group:has([data-slot="date-input-group-prefix"])`, R-010), so
 * the part registers itself with the group and the Input reads that
 * registration. When a DatePicker or DateRangePicker provides the affix
 * context, it also becomes a pointer target (R-025).
 */
export function DateInputGroupPrefix(props: DateInputGroupPrefixProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "testID",
    "id",
    "nativeID",
    "render",
    "ref",
    "onLayout",
  ] as const);

  const group = DateInputGroupContext();
  const interactiveAffixes = DateInputGroupAffixContext();

  // R-010: report this part for as long as it is mounted.
  cleanup(group.registerPrefix());

  const classes = () => {
    const slot = group.slots().prefix();
    // R-025: `pointer-events-none` becomes `auto` inside a picker, where the
    // prefix may hold a pressable part of its own.
    const pointer = interactiveAffixes()
      ? slot.replace("pointer-events-none", "pointer-events-auto")
      : slot;
    const own = local.className ?? "";

    return [pointer, own].filter((part) => part.length > 0).join(" ");
  };

  return (
    <View
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      class={classes()}
      style={local.style}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children)}
    </View>
  );
}
