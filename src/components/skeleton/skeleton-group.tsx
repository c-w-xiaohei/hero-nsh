import { split, View } from "nsh";
import type { JSX, StyleProp, ViewRef, ViewStyle } from "nsh";

import { SkeletonRoot, type SkeletonRootProps } from "./skeleton";
import {
  SkeletonGroupContext,
  type SkeletonGroupContextValue,
} from "./skeleton-group-context";

/**
 * The props of `SkeletonGroup` / `SkeletonGroupRoot`: upstream's
 * `SkeletonGroupRootProps` (`skeleton-group.types.ts:7-18`) — every
 * `SkeletonRootProps` minus `style` (the container's own style channel), plus
 * `isSkeletonOnly` and the container's `style`/`className`. `children` is the
 * item set, not an inherited prop.
 */
export interface SkeletonGroupRootProps
  extends Omit<SkeletonRootProps, "style" | "children" | "ref"> {
  /** The skeleton items (and, while not `isSkeletonOnly`, any other content). */
  children?: JSX.Element;

  /**
   * When true, the whole group renders nothing while `isLoading` is false —
   * upstream's "prevent layout issues when skeleton contains wrapper
   * elements". @default false
   */
  isSkeletonOnly?: boolean;

  /** Style of the group's container view. */
  style?: StyleProp<ViewStyle>;

  /** The container's view. */
  ref?: (node: ViewRef) => void;
}

/**
 * SkeletonGroup / SkeletonGroupRoot: the context provider plus a container
 * `View` (`skeleton-group.tsx:23-54`). While `isSkeletonOnly` and `isLoading`
 * is false it returns `null` — the context provider is inside the gate, so a
 * gated-off group provides nothing at all.
 */
export function SkeletonGroupRoot(props: SkeletonGroupRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "isSkeletonOnly",
    "ref",
  ] as const);

  // `rest` is the upstream `...restProps`: every skeleton prop the item set
  // inherits (`isLoading`, `variant`, `animationType`, `animation`, plus the
  // view props). The context carries the four the group contract names; the
  // remaining props reach the items through the same accessor path.
  const contextValue: SkeletonGroupContextValue = {
    isLoading: () => rest.isLoading,
    animationType: () => rest.animationType,
    variant: () => rest.variant,
    animation: () => rest.animation,
  };

  // `isSkeletonOnly && !isLoading` → `null`, reactively: an `<If>` keeps the
  // gate live so a group whose `isLoading` flips mounts its subtree then
  // (`skeleton-group.tsx:43-45`; M-024).
  const show = () =>
    !(
      (local.isSkeletonOnly ?? false) &&
      !(rest.isLoading ?? true)
    );

  return (
    <If when={show()}>
      <SkeletonGroupContext.Provider value={contextValue}>
        <View
          ref={(node) => local.ref?.(node)}
          testID={props.testID}
          class={local.className}
          style={local.style}
        >
          {local.children}
        </View>
      </SkeletonGroupContext.Provider>
    </If>
  );
}

/** The props of `SkeletonGroup.Item`: the skeleton's own, group's as defaults. */
export interface SkeletonGroupItemProps extends SkeletonRootProps {}

/**
 * SkeletonGroup.Item / SkeletonGroupItem: one `SkeletonRoot` whose props
 * default to the group's context and whose explicit props win
 * (`skeleton-group.tsx:58-67` — `{...context, ...props}`).
 */
export function SkeletonGroupItem(props: SkeletonGroupItemProps): JSX.Element {
  const group = SkeletonGroupContext();

  return (
    <SkeletonRoot
      {...props}
      isLoading={props.isLoading ?? group?.isLoading()}
      animationType={props.animationType ?? group?.animationType()}
      variant={props.variant ?? group?.variant()}
      animation={props.animation ?? group?.animation()}
    />
  );
}
