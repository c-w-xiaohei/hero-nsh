import {
  MenuItemSubmenuIndicator,
  type MenuItemSubmenuIndicatorProps,
} from "../menu/menu-item";

/* -------------------------------------------------------------------------------------------------
 * Submenu indicator
 * -----------------------------------------------------------------------------------------------*/

/** The props of `Dropdown.SubmenuIndicator`: `MenuItemSubmenuIndicator`'s. */
export interface DropdownSubmenuIndicatorProps extends MenuItemSubmenuIndicatorProps {}

/**
 * Dropdown.SubmenuIndicator / DropdownSubmenuIndicator: HeroUI's part is a bare
 * `MenuItemSubmenuIndicator` wrapper; Menu renders it only for a row that
 * opens a submenu.
 */
export function DropdownSubmenuIndicator(props: DropdownSubmenuIndicatorProps) {
  return <MenuItemSubmenuIndicator {...props} />;
}
