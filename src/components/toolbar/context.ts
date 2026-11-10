import type { Accessor } from "nsh";
import { context } from "nsh";

/**
 * The axis a toolbar runs along, upstream's `ToolbarVariants["orientation"]`.
 * Written out here (instead of imported from the styles file) so the context
 * file has no dependency on `tailwind-variants`.
 */
export type ToolbarAxisAlignment = "horizontal" | "vertical";

/**
 * One control that takes part in the toolbar's arrow-key chain.
 *
 * React Aria's `useToolbar` reads the focused element and enumerates the
 * focusable descendants of the toolbar at key time (`focusManager.focusNext` /
 * `focusPrevious`, port sheet §5). NSH has neither `onKeyDown` on a view nor a
 * way to walk children, so each control registers itself instead: the toolbar
 * keeps the list in registration order, which is the order the controls were
 * written in (research 4.2).
 */
export interface ToolbarItem {
  /** Whether the arrows may land on it now: disabled and `excludeFromTabOrder` controls are skipped. */
  focusable: Accessor<boolean>;

  /** Whether it holds the keyboard focus now; the toolbar's arrow scope is live while any item does. */
  focused: Accessor<boolean>;

  /** Moves the keyboard focus onto the control's view. */
  focus: () => void;
}

/**
 * What `Toolbar.Root` tells the controls inside it.
 *
 * HeroUI reaches the members through React Aria's own contexts:
 * `ToggleButtonGroupContext` carries the orientation down to a nested group,
 * and `useToolbar`'s own context marks a nested toolbar so it drops to
 * `role="group"` and leaves the keys to the outer one. Seen from a control,
 * both come down to "which toolbar am I in, on which axis, and where do I sign
 * up". That is this value.
 *
 * Internal only: not part of the public entry (`src/index.ts`), so the public
 * API stays identical to HeroUI's. Button, ToggleButton, ToggleButtonGroup and
 * ButtonGroup import it by path (port sheet §5).
 */
export interface ToolbarContextValue {
  /** The toolbar's axis; a nested group defaults to it (upstream `ToggleButtonGroupContext`). */
  orientation: Accessor<ToolbarAxisAlignment>;

  /** Joins the toolbar's registry; the returned function leaves it, handed to `cleanup`. */
  registerItem: (item: ToolbarItem) => () => void;
}

/** `null` outside a toolbar, so a control written anywhere else changes nothing. */
export const ToolbarContext = context<ToolbarContextValue | null>(null);
