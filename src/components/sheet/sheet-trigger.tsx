import type { JSX } from "nsh";

/**
 * The props of `Sheet.Trigger`: HeroUI's `SheetTriggerProps`, a single child
 * element whose `onPress` React Aria merges into the open channel.
 *
 * The public type is unchanged from HeroUI: one child element. The `onPress`
 * member upstream merges is not restated here, because NSH has no way to inject
 * a handler into a child's element (port sheet §1.1 row "Trigger props").
 */
export interface SheetTriggerProps {
  children: JSX.Element;
}

/**
 * Sheet.Trigger / SheetTrigger: groups the trigger without rendering an element.
 *
 * Upstream returns `children` untouched too: the press channel is React Aria's
 * `PressResponder` around the root. NSH's counterpart is the
 * `OverlayTriggerContext` the Root provides, which the child `Button` consumes
 * itself (port sheet §3, §5), so this part stays the same no-host grouping: no
 * wrapper view (it would change the layout), no second read of the children,
 * and nothing to merge.
 */
export function SheetTrigger(props: SheetTriggerProps): JSX.Element {
  return props.children;
}
