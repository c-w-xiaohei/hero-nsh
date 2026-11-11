import type { JSX } from "nsh";

/**
 * The props of `Sheet.Trigger`: HeroUI's `SheetTriggerProps`, a single child
 * element whose `onPress` React Aria merges into the open channel.
 *
 * Stub: NSH cannot inject a handler into a child element, so the implemented
 * part is a provider-only grouping (the root already provides
 * `OverlayTriggerContext`, port sheet §5). It renders no host view.
 */
export interface SheetTriggerProps {
  children: JSX.Element;
}

/** Sheet.Trigger / SheetTrigger: groups the trigger without rendering an element. */
export function SheetTrigger(props: SheetTriggerProps): JSX.Element {
  return props.children;
}
