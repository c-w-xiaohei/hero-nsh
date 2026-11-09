import { HeaderRoot } from "./header";
import type { HeaderRootProps } from "./header";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Header` is the root itself, exactly as HeroUI 3.2.7 exports it
 * (`export const Header = HeaderRoot`, `index.ts:8`). Upstream has no
 * `Header.Root`, so none is added here: adding one would break the 1:1 shape.
 */
export const Header = HeaderRoot;

export type Header = {
  Props: HeaderRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { HeaderRoot };

export type { HeaderRootProps, HeaderRootProps as HeaderProps } from "./header";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { headerVariants } from "./header.styles";
