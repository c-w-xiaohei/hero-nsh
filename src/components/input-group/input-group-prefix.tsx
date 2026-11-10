import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, reduceMotion, split, View } from "nsh";

import { joinClassNames } from "./class-names";
import { InputGroupContext } from "./input-group-context";
import { renderChildren } from "./render-children";

/** The props of `InputGroup.Prefix`, HeroUI's `InputGroupPrefixProps` (a `div`). */
export interface InputGroupPrefixProps {
  /** The icon or text before the control. */
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

  /** The affix was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** The affix's ref, forwarded as a callback only. */
  ref?: (node: ViewRef) => void;

  /** Any other DOM / global attribute HeroUI accepts; no effect here (D18). */
  [key: string]: unknown;
}

/**
 * InputGroup.Prefix / InputGroupPrefix: the icon, text or control before the
 * input.
 *
 * Upstream's stylesheet squares the input's left side and drops its left
 * padding while this part exists (`.input-group:has([data-slot="input-group-prefix"])`,
 * R-016) and aligns the affix to the top beside a textarea (R-024), so the part
 * registers itself with the group and the control reads that registration.
 */
export function InputGroupPrefix(props: InputGroupPrefixProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "testID",
    "id",
    "nativeID",
    "onLayout",
    "render",
    "ref",
  ] as const);

  const group = InputGroupContext();

  // R-016: report this part for as long as it is mounted.
  cleanup(group.registerPrefix());

  const classes = computed(() =>
    joinClassNames(
      group.slots().prefix(),
      // R-024: `.input-group:has([data-slot="input-group-textarea"])
      // .input-group__prefix` → `@apply items-start` plus `padding-top: .5rem`.
      group.hasTextArea() ? "items-start pt-2" : undefined,
      local.className,
    ),
  );

  // R-025: `transition: background-color 150ms var(--ease-smooth), border-color
  // 150ms var(--ease-smooth)`. One owner per property: the list is inline, the
  // timing is the `prefix` slot's class.
  const style = computed<StyleProp<ViewStyle>>(() => [
    { transitionProperty: reduceMotion() ? "none" : "background-color, border-color" },
    local.style,
  ]);

  return (
    <View
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      class={classes()}
      style={style()}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children)}
    </View>
  );
}
