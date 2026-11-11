import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, reduceMotion, split, View } from "nsh";

import { joinClassNames } from "./class-names";
import { InputGroupContext } from "./input-group-context";
import { renderChildren } from "./render-children";

/** The props of `InputGroup.Suffix`, HeroUI's `InputGroupSuffixProps` (a `div`). */
export interface InputGroupSuffixProps {
  /** The icon, text or control after the input. */
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
 * InputGroup.Suffix / InputGroupSuffix: the icon, text or control after the
 * input.
 *
 * Upstream's stylesheet squares the input's right side and drops its right
 * padding while this part exists (`.input-group:has([data-slot="input-group-suffix"])`,
 * R-017) and aligns the affix to the top beside a textarea (R-029), so the part
 * registers itself with the group and the control reads that registration.
 */
export function InputGroupSuffix(props: InputGroupSuffixProps): JSX.Element {
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

  // R-017: report this part for as long as it is mounted.
  cleanup(group.registerSuffix());

  const classes = computed(() =>
    joinClassNames(
      group.slots().suffix(),
      // R-029: `.input-group:has([data-slot="input-group-textarea"])
      // .input-group__suffix` → `@apply items-start` plus `padding-top: .5rem`.
      group.hasTextArea() ? "items-start pt-2" : undefined,
      local.className,
    ),
  );

  // R-030: the same two transitioned properties as the prefix; the list is
  // inline, the timing is the `suffix` slot's class.
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
