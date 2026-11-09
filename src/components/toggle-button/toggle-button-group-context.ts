import { context, type Accessor } from "nsh";

import type { ListState } from "../../primitives";
import type { ToggleButtonGroupOrientation } from "./toggle-button-group.styles";
import type { ToggleButtonSize } from "./toggle-button.styles";

/** The slots `toggleButtonGroupVariants` produces, as the parts call them. */
export interface ToggleButtonGroupSlots {
  base(): string;
  separator(): string;
}

/** `selectionMode` of a group; HeroUI's `single` / `multiple`. */
export type ToggleButtonGroupSelectionMode = "single" | "multiple";

/**
 * What one ToggleButton hands its group so the group can move the keyboard
 * focus along its own registry (research 4.2). A member without an `id` still
 * registers: RAC's toolbar moves through every button of the group, while only
 * the members with an `id` take part in the group selection.
 */
export interface ToggleButtonGroupItem {
  /** The member's selection key (`String(id)`), or `undefined` without an `id`. */
  selectionKey: string | undefined;

  /** Whether the member cannot be focused or pressed. */
  disabled: Accessor<boolean>;

  /** Whether the member holds the keyboard focus right now. */
  focused: Accessor<boolean>;

  /** Moves the keyboard focus to the member's view. */
  focus: () => void;
}

/**
 * What a ToggleButtonGroup provides to every ToggleButton under it.
 *
 * HeroUI's context carries `{ slots, size, isDisabled }` and leaves the rest to
 * React Aria's internal state. NSH cannot read an internal RAC tree, so the
 * group also publishes `orientation`, `isDetached`, `fullWidth`, `selectionMode`
 * and the registry: a member needs them to compute its in-group classes,
 * choose the right selection mode and join the arrow-key order (port sheet
 * §1.2 and §8).
 */
export interface ToggleButtonGroupContextValue {
  slots: Accessor<ToggleButtonGroupSlots>;
  orientation: Accessor<ToggleButtonGroupOrientation>;
  size: Accessor<ToggleButtonSize | undefined>;
  isDisabled: Accessor<boolean | undefined>;
  isDetached: Accessor<boolean>;
  fullWidth: Accessor<boolean>;
  selectionMode: Accessor<ToggleButtonGroupSelectionMode>;
  /** The list state (`createListState`): collection plus selection manager. */
  state: ListState;
  /** Registers a member; the returned function unregisters it. */
  registerItem: (item: ToggleButtonGroupItem) => () => void;
}

/** Kept for API parity: HeroUI marks its direct children with this prop name. */
export const TOGGLE_BUTTON_GROUP_CHILD = "__toggle_button_group_child";

export const ToggleButtonGroupContext =
  context<ToggleButtonGroupContextValue | null>(null);
