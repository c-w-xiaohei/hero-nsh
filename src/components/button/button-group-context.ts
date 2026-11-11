import { context, type Accessor } from "nsh";

import type { ButtonGroupOrientation } from "./button-group.styles";
import type { ButtonSize, ButtonVariant } from "./button.styles";

/** The slots `buttonGroupVariants` produces, as the parts call them. */
export interface ButtonGroupSlots {
  base(): string;
  separator(): string;
}

/** What a Button hands its group so the group can report focus within itself. */
export interface ButtonGroupItem {
  focused: Accessor<boolean>;
  focusVisible: Accessor<boolean>;
}

/**
 * What a ButtonGroup provides to every Button under it. Unlike HeroUI, which
 * marks only direct children with `BUTTON_GROUP_CHILD`, NSH cannot inspect or
 * clone child elements, so the context reaches the whole subtree. See the known
 * differences in the port sheet.
 */
export interface ButtonGroupContextValue {
  slots: Accessor<ButtonGroupSlots>;
  orientation: Accessor<ButtonGroupOrientation>;
  size: Accessor<ButtonSize | undefined>;
  variant: Accessor<ButtonVariant | undefined>;
  isDisabled: Accessor<boolean | undefined>;
  fullWidth: Accessor<boolean | undefined>;
  isInvalid: Accessor<boolean | undefined>;
  isHovered: Accessor<boolean>;
  isFocusWithin: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  /** Registers a Button; the returned function unregisters it. */
  registerItem: (item: ButtonGroupItem) => () => void;
  /**
   * Where a registered Button sits in the group. Upstream reaches this with
   * `:first-child` / `:last-child`; NSH cannot select by position, so the
   * group answers from its own registration order.
   */
  positionOf: (item: ButtonGroupItem) => Accessor<ButtonGroupPosition>;
}

export type ButtonGroupPosition = "only" | "first" | "middle" | "last";

/** Kept for API parity: HeroUI marks its direct children with this prop name. */
export const BUTTON_GROUP_CHILD = "__button_group_child";

export const ButtonGroupContext = context<ButtonGroupContextValue | null>(null);
