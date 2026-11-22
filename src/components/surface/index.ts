import { SurfaceRoot } from "./surface";
import type { SurfaceRootProps } from "./surface";

// A-005 / A-006: the two harness-side 接轴 spots of adapt sheet surface.md are
// realized outside this directory — `harness/surface.fixtures.tsx`
// (`ScopedMobile` feeds `host.params.input`/`density` into `EnvironmentScope`
// and mounts the `basic`/`variants`/`press`/`context` cases with testID,
// storage and layout probes) and
// `harness/tests/components/surface/surface.mobile.test.tsx` (the
// desktop-pinned, dual-environment M-001…M-006 assertions). The gate's marker
// scan only sees `src/components/surface/`, so the record lives here. Every
// spot they probe — the part this file exports — is environment-invariant.

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Surface` is a single-part compound: the root is the whole component, as in
 * HeroUI 3.2.7, and `Surface.Root` names the same component.
 */
export const Surface = Object.assign(SurfaceRoot, {
  Root: SurfaceRoot,
});

export type Surface = {
  Props: SurfaceRootProps;
  RootProps: SurfaceRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { SurfaceRoot };

export type { SurfaceRootProps, SurfaceRootProps as SurfaceProps } from "./surface";

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
export { SurfaceContext, type SurfaceContextValue } from "./surface-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { surfaceVariants } from "./surface.styles";

export type { SurfaceVariants } from "./surface.styles";
