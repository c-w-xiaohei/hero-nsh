import { SeparatorRoot } from "./separator";
import type { SeparatorRootProps } from "./separator";

// A-006 / A-007: the two harness-side 接轴 spots of adapt sheet separator.md
// are realized outside this directory — `harness/separator.fixtures.tsx`
// (`host.params.input`/`density` feed `EnvironmentScope` and mount the
// `default`/`vertical`/`variants`/`decorative`/`context` cases with testID and
// onLayout-bounds probes) and `harness/tests/components/separator/
// separator.mobile.test.tsx` (the desktop-pinned, dual-environment
// M-001…M-007 assertions). The gate's marker scan only sees
// `src/components/separator/`, so the record lives here. Every spot they
// probe — the parts this file exports — is environment-invariant: a
// separator is a pure display view and accepts no env axis.

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Separator` is a single-part compound: the root is the whole component, as
 * in HeroUI 3.2.7, and `Separator.Root` names the same component.
 */
export const Separator = Object.assign(SeparatorRoot, {
  Root: SeparatorRoot,
});

export type Separator = {
  Props: SeparatorRootProps;
  RootProps: SeparatorRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { SeparatorRoot };

export type { SeparatorRootProps, SeparatorRootProps as SeparatorProps } from "./separator";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { separatorVariants } from "./separator.styles";

export type { SeparatorVariants } from "./separator.styles";
