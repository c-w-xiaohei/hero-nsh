import { Tab, type TabProps } from "./tab";
import { TabIndicator, type TabIndicatorProps } from "./tab-indicator";
import { TabList, type TabListProps } from "./tab-list";
import { TabListContainer, type TabListContainerProps } from "./tabs-list-container";
import { TabPanel, type TabPanelProps } from "./tab-panel";
import { TabSeparator, type TabSeparatorProps } from "./tab-separator";
import { TabsRoot, type TabsRootProps } from "./tabs-root";

// Sheet spots whose seam sits outside `src/components/tabs/` — recorded here so
// the A-xxx marker scan sees them (the kbd/typography index convention):
// A-005 — F-tier registry/state: judged not-applicable (`tabs-root.tsx`,
//   `tab.tsx` registration kept verbatim).
// A-006 — no swipe pager: panels carry no gesture path (`createPan` never
//   enters this unit).
// A-007 — Indicator/Separator/Panel/List stay decorative/layout carriers:
//   no `input` axis, no hit-area growth, list keymap untouched.
// A-008 — assertion carrier on the harness side: `harness/tabs.fixtures.tsx`
//   (`ScopedMobile` → `EnvironmentScope` + `mobile` case with events/layout/
//   ctx probes) and `harness/tests/components/tabs/tabs.mobile.*.test.tsx`
//   realize the seam; nothing lands in this directory.
// A-009 — this file's export surface is kept verbatim (no added exports).

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Tabs` is HeroUI's compound: the root plus the six parts, each reachable as
 * `Tabs.Part` and also exported by name.
 */
export const Tabs = Object.assign(TabsRoot, {
  Root: TabsRoot,
  ListContainer: TabListContainer,
  List: TabList,
  Tab,
  Indicator: TabIndicator,
  Separator: TabSeparator,
  Panel: TabPanel,
});

export type Tabs = {
  Props: TabsRootProps;
  RootProps: TabsRootProps;
  ListContainer: TabListContainerProps;
  ListContainerProps: TabListContainerProps;
  ListProps: TabListProps;
  TabProps: TabProps;
  IndicatorProps: TabIndicatorProps;
  SeparatorProps: TabSeparatorProps;
  PanelProps: TabPanelProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  TabsRoot,
  TabListContainer,
  TabList,
  Tab,
  TabIndicator,
  TabSeparator,
  TabPanel,
};

export type {
  TabsRootProps,
  TabsRootProps as TabsProps,
  TabListContainerProps,
  TabListProps,
  TabProps,
  TabIndicatorProps,
  TabSeparatorProps,
  TabPanelProps,
};

export type { TabsRootRenderProps } from "./tabs-root";

export type { TabRenderProps } from "./tab";

export type {
  TabsAlign,
  TabsKeyboardActivation,
  TabsOrientation,
  TabsVariant,
} from "./tabs-context";

export type { TabsKey } from "./tabs-key";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { tabsVariants } from "./tabs.styles";

export type { TabsVariants } from "./tabs.styles";
