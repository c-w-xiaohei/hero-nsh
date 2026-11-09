import type { JSX, StyleProp, ViewProps, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./render-children";
import { switchGroupVariants, type SwitchGroupVariants } from "./switch-group.styles";

/* -------------------------------------------------------------------------------------------------
 * Switch Group Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `SwitchGroup.Root` / `SwitchGroup`: HeroUI 3.2.7's
 * `SwitchGroupRootProps`, which is a `div` (with the `E` element generic and
 * `render`) plus `children`, `className` and the one `orientation` dimension,
 * expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, the element generic, `aria-*`,
 * `data-*` and the raw `div` attributes) are accepted so code written against
 * HeroUI keeps compiling; see the port sheet §1 and §8 for what they can and
 * cannot do here. NSH host events (`onPress`, `onMouseEnter`, …) travel through
 * the rest props to the root `View`.
 */
export interface SwitchGroupRootProps extends Omit<ViewProps, "children" | "class" | "style"> {
  /**
   * The content, rendered into the inner `items` wrapper. Optional although
   * HeroUI's type requires it, because an empty group is valid at runtime
   * upstream; bare strings and numbers become `Text` at the placement
   * (research 4.1, 4.6).
   */
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Style of the root view; wins over the variant classes on the keys it sets. */
  style?: StyleProp<ViewStyle>;

  /** Layout orientation. @default "vertical" */
  orientation?: SwitchGroupVariants["orientation"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /**
   * Accepted, no effect: NSH has no DOM render function to replace the root
   * element, and no notion of an intrinsic element type `E` (port sheet §8).
   */
  render?: unknown;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `aria-${string}`]: unknown;

  /** Accepted, no effect; `testID` names a view. */
  [key: `data-${string}`]: unknown;
}

/**
 * `SwitchGroup.Root` / `SwitchGroupRoot`: a plain layout container that stacks
 * switches in a column, or lines them up in a row with `orientation`.
 *
 * Upstream it is two `div`s and nothing else: no context, no state, no events,
 * and the `Switch`es inside never read it. It therefore provides no group role
 * and no keyboard navigation, unlike nsh/base's `ToggleGroup` / `RadioGroup`,
 * which would add both (port sheet §3, B1/B3/B4). Both views are built on the
 * core `View`.
 *
 * The only input is `orientation`, so both products (the root class string and
 * the `items` class string) are derived values. `gap-6` and `flex-col` on the
 * root describe a container with one child and have no observable result; they
 * are kept so the base block matches upstream line for line.
 */
export function SwitchGroupRoot(props: SwitchGroupRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "focusable",
    "orientation",
    "id",
    "nativeID",
    "render",
  ] as const);

  // The one read-only input, as a derived value (port sheet §2). `orientation`
  // changes no state, so a computed keeps it live without a second source of
  // truth.
  const orientation = computed(() => local.orientation ?? "vertical");

  // The root class string: the variant table, then the caller's `className`.
  // HeroUI merges them in the same order through `.base({className})`, and the
  // later class wins on a conflict.
  const rootClass = computed(() =>
    switchGroupVariants({ orientation: orientation(), className: local.className }).base(),
  );

  // The inner wrapper's class string. R-006 / R-007 live on the `items` slot
  // because NSH has no descendant selector to reach it from the root.
  const itemsClass = computed(() =>
    switchGroupVariants({ orientation: orientation() }).items(),
  );

  return (
    <View
      {...rest}
      ref={(node) => (typeof local.ref === "function" ? local.ref(node) : undefined)}
      nativeID={local.id ?? local.nativeID}
      // A `<div>` is not a keyboard focus stop upstream; without this a
      // pressable group would become one (Tab moves between pressables). The
      // caller's own `focusable` wins, as HeroUI forwards `rest` last.
      focusable={local.focusable ?? false}
      class={rootClass()}
      style={local.style}
    >
      {/* The inner wrapper is not exported and takes no caller props
          upstream either, so it only carries the slot's classes. */}
      <View class={itemsClass()}>
        {/* The single read of `children`, at the placement: a read builds new
            native views (research 4.1, 4.6). Nothing else needs them. */}
        {renderChildren(local.children)}
      </View>
    </View>
  );
}
