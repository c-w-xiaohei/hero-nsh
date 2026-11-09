import type { JSX } from "nsh";

import { createOverlayTrigger } from "../../primitives/create-overlay-trigger";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import type { PopoverContextValue } from "./popover-context";
import { PopoverContext } from "./popover-context";
import { popoverVariants } from "./popover.styles";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Popover.Root`: HeroUI 3.2.7's `PopoverRootProps`, which is
 * `DialogTrigger`'s props. DialogTrigger is not a `forwardRef` component
 * upstream, so Root takes no `ref`, `className`, `style` or DOM props, and it
 * renders no host view here either: only the context the parts read.
 */
export interface PopoverRootProps {
  /** The trigger part(s) and `Popover.Content`. Read once, inside the provider. */
  children: JSX.Element;

  /** The open state in controlled mode. */
  isOpen?: boolean;

  /** The initial open state in uncontrolled mode (default `false`). */
  defaultOpen?: boolean;

  /** Called whenever the open state changes (trigger, Escape, outside press). */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Popover.Root / PopoverRoot: HeroUI's `DialogTrigger`. It renders no view of
 * its own — adding a wrapper would change the layout and the press chain — and
 * provides the shared open state and trigger registration to the parts.
 */
export function PopoverRoot(props: PopoverRootProps) {
  const trigger = createOverlayTrigger({
    isOpen: () => props.isOpen,
    defaultOpen: () => props.defaultOpen,
    onOpenChange: props.onOpenChange,
  });

  // React Aria's `DialogTrigger` names itself in the Popover context
  // (`react-aria-components/src/Dialog.tsx`: `trigger: 'DialogTrigger'`), which
  // is where the render values get their default from; a standalone Content has
  // no root and reports `null`.
  const contextValue: PopoverContextValue = {
    slots: popoverVariants(),
    trigger: "DialogTrigger",
  };

  // `_common` exception: a component that provides a context reads
  // `props.children` once, inside the provider, at the placement. A computed
  // here would be evaluated outside it and the parts would lose the context.
  return (
    <OverlayTriggerContext.Provider value={trigger.context}>
      <PopoverContext.Provider value={contextValue}>{props.children}</PopoverContext.Provider>
    </OverlayTriggerContext.Provider>
  );
}
