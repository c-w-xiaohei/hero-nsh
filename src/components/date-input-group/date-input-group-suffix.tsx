import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, split, View } from "nsh";

import {
  DateInputGroupAffixContext,
  DateInputGroupContext,
} from "./date-input-group-context";
import { renderChildren } from "./render-children";

/** The props of `DateInputGroup.Suffix`, HeroUI's `DateInputGroupSuffixProps`. */
export interface DateInputGroupSuffixProps {
  /** The icon, text or picker trigger after the segments. */
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
 * DateInputGroup.Suffix / DateInputGroupSuffix: the icon, text or picker
 * trigger after the segments.
 *
 * It registers with the group for R-011's inner padding, and takes pointer
 * events inside a picker (R-026). A DatePicker trigger placed here also
 * registers its own focus with the group, which suppresses the group ring
 * (R-006) — that registration belongs to the picker unit.
 */
export function DateInputGroupSuffix(props: DateInputGroupSuffixProps): JSX.Element {
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

  // R-011: report this part for as long as it is mounted.
  cleanup(group.registerSuffix());

  const classes = () => {
    const slot = group.slots().suffix();
    // R-026: `pointer-events-none` becomes `auto` inside a picker.
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
