// A-008 / A-009: the two harness-side 接轴 spots of adapt sheet list-box.md
// are realized outside this directory — `harness/list-box.fixtures.tsx`
// (the `b-item`/`b-action` cases with the events/layout/hover/CtxProbe
// seam probes, `narrow`/`disabled`/`overlay` params, and the `Scoped`
// wrapper feeding `host.params.scope`/`density` into `EnvironmentScope`)
// and `harness/tests/components/list-box/list-box.mobile.test.tsx` +
// `list-box.mobile.headless.test.tsx` (the desktop-pinned, dual-environment
// M-001…M-011 assertions, plus the `platform:"ios"` host-derivation half).
// The gate's marker scan only sees `src/components/list-box/`, so the
// record lives here. The seam they probe is the press-feedback chain in
// `list-box-item.tsx` (A-002…A-004) and the `input`/`density` axes in
// `list-box.styles.ts` (A-001).
import {
  ListBoxItemIndicator,
  ListBoxItemRoot,
  type ListBoxItemIndicatorProps,
  type ListBoxItemRenderProps,
  type ListBoxItemRootProps,
} from "./list-box-item";
import {
  ListBoxRoot,
  type ListBoxRenderProps,
  type ListBoxRootProps,
} from "./list-box-root";
import {
  ListBoxSectionRoot,
  type ListBoxSectionRootProps,
} from "./list-box-section";

/* -------------------------------------------------------------------------------------------------
 * Compound components
 * -----------------------------------------------------------------------------------------------*/
export const ListBox = Object.assign(ListBoxRoot, {
  Root: ListBoxRoot,
  Item: ListBoxItemRoot,
  ItemIndicator: ListBoxItemIndicator,
  Section: ListBoxSectionRoot,
});

export type ListBox<T = unknown> = {
  Props: ListBoxRootProps<T>;
  RootProps: ListBoxRootProps<T>;
  ItemProps: ListBoxItemRootProps;
  SectionProps: ListBoxSectionRootProps;
};

export const ListBoxItem = Object.assign(ListBoxItemRoot, {
  Root: ListBoxItemRoot,
  Indicator: ListBoxItemIndicator,
});

export type ListBoxItem = {
  Props: ListBoxItemRootProps;
  RootProps: ListBoxItemRootProps;
  IndicatorProps: ListBoxItemIndicatorProps;
};

/** Section is its own root upstream: there is no `Object.assign` here. */
export const ListBoxSection = ListBoxSectionRoot;

export type ListBoxSection = {
  Props: ListBoxSectionRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export { ListBoxRoot, ListBoxItemRoot, ListBoxItemIndicator, ListBoxSectionRoot };

export type {
  ListBoxRenderProps,
  ListBoxRootProps,
  ListBoxRootProps as ListBoxProps,
  ListBoxItemRenderProps,
  ListBoxItemRootProps,
  ListBoxItemRootProps as ListBoxItemProps,
  ListBoxItemIndicatorProps,
  ListBoxSectionRootProps,
  ListBoxSectionRootProps as ListBoxSectionProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export {
  listboxVariants,
  listboxItemVariants,
  listboxSectionVariants,
} from "./list-box.styles";

export type {
  ListBoxVariants,
  ListBoxItemVariants,
  ListBoxSectionVariants,
} from "./list-box.styles";
