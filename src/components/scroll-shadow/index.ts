import { ScrollShadowRoot } from "./scroll-shadow";
import type { ScrollShadowRootProps } from "./scroll-shadow";

/*
 * Mobile adapt unit markers (adapt-sheets/scroll-shadow.md §2). The gate's
 * scan sees only `src/components/scroll-shadow/`, so the record of where each
 * 落点 lands lives here:
 * A-001 / A-002 (①样式, 保留): `scroll-shadow.styles.ts` keeps the single
 *   `relative` literal — no `input`/`density` axis has a cell to fill; the
 *   measuring layer's `static`/`h-0 w-0` classes in `scroll-shadow.tsx` are
 *   layout contracts, not spacing.
 * A-003 (②行为, 仲裁): marked inline at the `Scroll` host in
 *   `scroll-shadow.tsx` — the existing scroll path stays untouched so the
 *   sheet-handoff D seam can arbitrate it; no new gesture owner is added.
 * A-004 (③呈现, 保留): an inline scroll block has no panel/sheet seam.
 * A-005 / A-006 (harness 接轴): `harness/scroll-shadow.fixtures.tsx` gained
 *   the `host.params.case` dispatch + `ScopedMobile` `EnvironmentScope`
 *   wrapper; `harness/tests/components/scroll-shadow/scroll-shadow.mobile.test.tsx`
 *   carries the pinned dual-environment M-001…M-008 assertions.
 * A-007 (导出面, 保留): the export surface below is unchanged — no prop or
 *   export added or removed; `src/index.ts:16` already re-exports it.
 * A-008 (F 波及, 判定不纳入): no mount-registration collection exists — the
 *   content is rendered in full through `renderChildren`, so the F change
 *   does not reach this component.
 */

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ScrollShadow` is a single-part compound: the root is the whole component, as
 * in HeroUI 3.2.7, and `ScrollShadow.Root` names the same component.
 */
export const ScrollShadow = Object.assign(ScrollShadowRoot, {
  Root: ScrollShadowRoot,
});

export type ScrollShadow = {
  Props: ScrollShadowRootProps;
  RootProps: ScrollShadowRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named component
 * -----------------------------------------------------------------------------------------------*/
export { ScrollShadowRoot };

export type {
  ScrollShadowRootProps,
  ScrollShadowRootProps as ScrollShadowProps,
  ScrollShadowVisibility,
} from "./scroll-shadow";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { scrollShadowVariants } from "./scroll-shadow.styles";

export type { ScrollShadowVariants } from "./scroll-shadow.styles";
