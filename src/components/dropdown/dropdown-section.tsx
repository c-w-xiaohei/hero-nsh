import {
  MenuSectionRoot,
  type MenuSectionRootProps,
} from "../menu/menu-section";

/* -------------------------------------------------------------------------------------------------
 * Section
 * -----------------------------------------------------------------------------------------------*/

/** The props of `Dropdown.Section` / `DropdownSection`: `MenuSectionRoot`'s. */
export interface DropdownSectionProps extends MenuSectionRootProps {}

/**
 * Dropdown.Section / DropdownSection: HeroUI's `Dropdown.Section` is a bare
 * `MenuSectionRoot` wrapper with no dropdown-specific class, so this part adds
 * nothing either.
 */
export function DropdownSection(props: DropdownSectionProps) {
  return <MenuSectionRoot {...props} />;
}
