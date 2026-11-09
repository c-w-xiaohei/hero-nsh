import {
  MenuItemIndicator,
  MenuItemRoot,
  MenuItemSubmenuIndicator,
  type MenuItemIndicatorProps,
  type MenuItemRenderProps,
  type MenuItemRootProps,
  type MenuItemSubmenuIndicatorProps,
} from "./menu-item";
import {
  MenuRoot,
  type MenuRenderProps,
  type MenuRootProps,
} from "./menu-root";
import {
  MenuSectionRoot,
  type MenuSectionRootProps,
} from "./menu-section";

/* -------------------------------------------------------------------------------------------------
 * Compound components
 * -----------------------------------------------------------------------------------------------*/
export const MenuItem = Object.assign(MenuItemRoot, {
  Root: MenuItemRoot,
  Indicator: MenuItemIndicator,
  SubmenuIndicator: MenuItemSubmenuIndicator,
});

export type MenuItem = {
  Props: MenuItemRootProps;
  RootProps: MenuItemRootProps;
  IndicatorProps: MenuItemIndicatorProps;
  SubmenuIndicatorProps: MenuItemSubmenuIndicatorProps;
};

/** Section is its own root upstream: there is no `Object.assign` here. */
export const MenuSection = MenuSectionRoot;

export type MenuSection = {
  Props: MenuSectionRootProps;
};

export const Menu = Object.assign(MenuRoot, {
  Root: MenuRoot,
  Item: MenuItem,
  ItemIndicator: MenuItemIndicator,
  Section: MenuSection,
});

export type Menu<T extends object = object> = {
  Props: MenuRootProps<T>;
  RootProps: MenuRootProps<T>;
  ItemProps: MenuItemRootProps;
  SectionProps: MenuSectionRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  MenuRoot,
  MenuItemRoot,
  MenuItemIndicator,
  MenuItemSubmenuIndicator,
  MenuSectionRoot,
};

export type {
  MenuRenderProps,
  MenuRootProps,
  MenuRootProps as MenuProps,
  MenuItemRenderProps,
  MenuItemRootProps,
  MenuItemRootProps as MenuItemProps,
  MenuItemIndicatorProps,
  MenuItemSubmenuIndicatorProps,
  MenuSectionRootProps,
  MenuSectionRootProps as MenuSectionProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { menuVariants, menuItemVariants, menuSectionVariants } from "./menu.styles";

export type {
  MenuVariants,
  MenuItemVariants,
  MenuSectionVariants,
} from "./menu.styles";
