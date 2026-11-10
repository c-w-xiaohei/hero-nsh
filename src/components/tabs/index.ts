import { Tab, type TabProps } from "./tab";
import { TabIndicator, type TabIndicatorProps } from "./tab-indicator";
import { TabList, type TabListProps } from "./tab-list";
import { TabListContainer, type TabListContainerProps } from "./tabs-list-container";
import { TabPanel, type TabPanelProps } from "./tab-panel";
import { TabSeparator, type TabSeparatorProps } from "./tab-separator";
import { TabsRoot, type TabsRootProps } from "./tabs-root";

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
