import {
  DropdownItem,
  type DropdownItemProps,
} from "./dropdown-item";
import {
  DropdownItemIndicator,
  type DropdownItemIndicatorProps,
} from "./dropdown-item-indicator";
import { DropdownMenu, type DropdownMenuProps } from "./dropdown-menu";
import {
  DropdownPopover,
  type DropdownPopoverProps,
} from "./dropdown-popover";
import { DropdownRoot, type DropdownRootProps } from "./dropdown-root";
import { DropdownSection, type DropdownSectionProps } from "./dropdown-section";
import {
  DropdownSubmenuIndicator,
  type DropdownSubmenuIndicatorProps,
} from "./dropdown-submenu-indicator";
import {
  DropdownSubmenuTrigger,
  type DropdownSubmenuTriggerProps,
} from "./dropdown-submenu-trigger";
import { DropdownTrigger, type DropdownTriggerProps } from "./dropdown-trigger";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Dropdown` is HeroUI's compound: the root (`MenuTrigger`) plus the eight
 * parts, each of which is also exported by name and reachable as
 * `Dropdown.Part`.
 */
export const Dropdown = Object.assign(DropdownRoot, {
  Root: DropdownRoot,
  Trigger: DropdownTrigger,
  Popover: DropdownPopover,
  Menu: DropdownMenu,
  Section: DropdownSection,
  Item: DropdownItem,
  ItemIndicator: DropdownItemIndicator,
  SubmenuIndicator: DropdownSubmenuIndicator,
  SubmenuTrigger: DropdownSubmenuTrigger,
});

export type Dropdown<T extends object = object> = {
  Props: DropdownRootProps;
  RootProps: DropdownRootProps;
  TriggerProps: DropdownTriggerProps;
  PopoverProps: DropdownPopoverProps;
  MenuProps: DropdownMenuProps<T>;
  SectionProps: DropdownSectionProps;
  ItemProps: DropdownItemProps<T>;
  ItemIndicatorProps: DropdownItemIndicatorProps;
  SubmenuIndicatorProps: DropdownSubmenuIndicatorProps;
  SubmenuTriggerProps: DropdownSubmenuTriggerProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  DropdownItem,
  DropdownItemIndicator,
  DropdownMenu,
  DropdownPopover,
  DropdownRoot,
  DropdownSection,
  DropdownSubmenuIndicator,
  DropdownSubmenuTrigger,
  DropdownTrigger,
};

export type {
  DropdownItemIndicatorProps,
  DropdownItemProps,
  DropdownMenuProps,
  DropdownPopoverProps,
  DropdownRootProps,
  DropdownRootProps as DropdownProps,
  DropdownSectionProps,
  DropdownSubmenuIndicatorProps,
  DropdownSubmenuTriggerProps,
  DropdownTriggerProps,
};

/* -------------------------------------------------------------------------------------------------
 * Render values and placement, the parts of the public surface callers name
 * -----------------------------------------------------------------------------------------------*/
export type { DropdownPopoverRenderProps } from "./dropdown-popover";
export type { DropdownTriggerRenderProps } from "./dropdown-trigger";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { dropdownVariants } from "./dropdown.styles";

export type { DropdownVariants } from "./dropdown.styles";
