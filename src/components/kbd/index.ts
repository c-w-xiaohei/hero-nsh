import { KbdAbbr } from "./kbd-abbr";
import type { KbdAbbrProps } from "./kbd-abbr";
import { KbdContent } from "./kbd-content";
import type { KbdContentProps } from "./kbd-content";
import { KbdRoot } from "./kbd-root";
import type { KbdRootProps } from "./kbd-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Kbd` is a single-root, three-part compound as in HeroUI 3.2.7: the root is
 * the whole component and also reachable as `Kbd.Root`; `Kbd.Abbr` and
 * `Kbd.Content` are real parts that resolve their slot from the root's
 * context.
 */
export const Kbd = Object.assign(KbdRoot, {
  Root: KbdRoot,
  Abbr: KbdAbbr,
  Content: KbdContent,
});

export type Kbd = {
  Props: KbdRootProps;
  RootProps: KbdRootProps;
  AbbrProps: KbdAbbrProps;
  ContentProps: KbdContentProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { KbdRoot, KbdAbbr, KbdContent };

export type { KbdRootProps, KbdRootProps as KbdProps } from "./kbd-root";
export type { KbdAbbrProps } from "./kbd-abbr";
export type { KbdContentProps } from "./kbd-content";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { kbdVariants } from "./kbd.styles";

export type { KbdVariants } from "./kbd.styles";

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/
export { kbdKeysMap, kbdKeysLabelMap } from "./kbd.constants";

export type { KbdKey } from "./kbd.constants";
