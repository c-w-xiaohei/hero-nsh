import { SpinnerRoot } from "./spinner";
import type { SpinnerRootProps } from "./spinner";

// A-006 / A-007: the two harness-side 接轴 spots of adapt sheet spinner.md are
// realized outside this directory — `harness/spinner.fixtures.tsx`
// (`ScopedMobile` feeds `host.params.input`/`density` into `EnvironmentScope`
// and mounts the `layout`/`gradient`/`sizes`/`label` cases with `onLayout`
// probes written to `app.storage()`) and
// `harness/tests/components/spinner/spinner.mobile.test.tsx` (the
// desktop-pinned, dual-environment M-001…M-007 assertions). The gate's marker
// scan only sees `src/components/spinner/`, so the record lives here. Every
// spot they probe — `Spinner`/`SpinnerRoot`, the parts this file exports — is
// environment-invariant: spinner is a read-only display indicator and accepts
// no env axis.

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Spinner` is a single-part compound: the root is the whole component, as in
 * HeroUI 3.2.7, and `Spinner.Root` names the same component.
 */
export const Spinner = Object.assign(SpinnerRoot, {
  Root: SpinnerRoot,
});

export type Spinner = {
  Props: SpinnerRootProps;
  RootProps: SpinnerRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { SpinnerRoot };

export type { SpinnerRootProps, SpinnerRootProps as SpinnerProps } from "./spinner";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { spinnerVariants } from "./spinner.styles";

export type { SpinnerVariants } from "./spinner.styles";
