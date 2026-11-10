import {
  MenuItemIndicator,
  type MenuItemIndicatorProps,
} from "../menu/menu-item";

/* -------------------------------------------------------------------------------------------------
 * Item indicator
 * -----------------------------------------------------------------------------------------------*/

/** The props of `Dropdown.ItemIndicator`: `MenuItemIndicator`'s. */
export interface DropdownItemIndicatorProps extends MenuItemIndicatorProps {}

/**
 * Dropdown.ItemIndicator / DropdownItemIndicator: HeroUI's part is a bare
 * `MenuItemIndicator` wrapper, so the check / dot rendering stays Menu's.
 */
export function DropdownItemIndicator(props: DropdownItemIndicatorProps) {
  return <MenuItemIndicator {...props} />;
}
