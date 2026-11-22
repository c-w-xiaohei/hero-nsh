import { KbdAbbr } from "./kbd-abbr";
import type { KbdAbbrProps } from "./kbd-abbr";
import { KbdContent } from "./kbd-content";
import type { KbdContentProps } from "./kbd-content";
import { KbdRoot } from "./kbd-root";
import type { KbdRootProps } from "./kbd-root";

// A-006 / A-007: the two harness-side 接轴 spots of adapt sheet kbd.md are
// realized outside this directory — `harness/kbd.fixtures.tsx` (`ScopedMobile`
// feeds `host.params.input`/`density` into `EnvironmentScope` and mounts the
// `basic`/`keys`/`variants`/`inline`/`bare-text`/`title` cases with layout and
// spanStyle probes) and `harness/tests/components/kbd/kbd.mobile.test.tsx`
// (the desktop-pinned, dual-environment M-001…M-007 assertions). The gate's
// marker scan only sees `src/components/kbd/`, so the record lives here.
// Every spot they probe — the parts this file exports — is environment-
// invariant: kbd is a pure display compound and accepts no env axis.

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
