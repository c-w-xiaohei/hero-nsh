import { host, mount, Text, View } from "nsh";
import { Tabs } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Tabs unit (port sheet 4b).
 *
 * A shared scenario cannot carry the probes the cases read back, so every case
 * is selected with `host.params.case`:
 *
 *   heroui                  the HeroUI unit fixture: overview / analytics /
 *                           reports, the third one disabled (T-005, T-006,
 *                           T-007)
 *   kobalte-plain           the Kobalte fixture: the same three tabs, nothing
 *                           disabled, first one selected (T-010, T-016, T-023)
 *   kobalte-vertical        the same, orientation="vertical" (T-012)
 *   kobalte-manual          keyboardActivation="manual" with
 *                           defaultSelectedKey="overview" (T-015)
 *   kobalte-default-analytics
 *                           defaultSelectedKey="analytics" (T-017)
 *   kobalte-disabled-group  isDisabled on the root, so the whole group is
 *                           disabled (T-018)
 *   kobalte-disabled-middle the second tab is disabled (T-019, T-020)
 *   kobalte-all-disabled    every tab disabled (T-021)
 *
 * `nsh/test` has no `document.activeElement`, so each tab records a focus event
 * and a pressable `after` station sits behind the group: Tab that leaves the
 * last tab lands there, which makes "focus went elsewhere" observable instead
 * of being an absent event. `onSelectionChange` payloads are recorded the same
 * way (see `harness/tests/testers/tabs.ts`).
 *
 * Everything here uses HeroUI's API; the extra station is a plain pressable
 * view, not part of the component.
 */

const TAB_IDS = ["overview", "analytics", "reports"] as const;

const TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  analytics: "Analytics",
  reports: "Reports",
};

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit fixture
 * -----------------------------------------------------------------------------------------------*/

function HeroTabs() {
  return (
    <View class="w-[480px]">
      <Tabs onSelectionChange={(key: string | number) => probe("selectionChange")(key)}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Options">
            <Tabs.Tab id="overview">
              Overview
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="analytics">
              Analytics
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab isDisabled id="reports">
              Reports
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="overview">
          <Text>Overview panel</Text>
        </Tabs.Panel>
        <Tabs.Panel id="analytics">
          <Text>Analytics panel</Text>
        </Tabs.Panel>
        <Tabs.Panel id="reports">
          <Text>Reports panel</Text>
        </Tabs.Panel>
      </Tabs>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Kobalte fixtures
 * -----------------------------------------------------------------------------------------------*/

function KobalteTabs(props: {
  orientation?: "horizontal" | "vertical";
  keyboardActivation?: "automatic" | "manual";
  defaultSelectedKey?: string;
  disabledTabs?: string[];
  isDisabled?: boolean;
}) {
  return (
    <View class="w-[480px]">
      <Tabs
        orientation={props.orientation}
        keyboardActivation={props.keyboardActivation}
        defaultSelectedKey={props.defaultSelectedKey}
        isDisabled={props.isDisabled}
        onSelectionChange={(key: string | number) => probe("selectionChange")(key)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Options">
            {TAB_IDS.map((id) => (
              <Tabs.Tab
                id={id}
                isDisabled={props.disabledTabs?.includes(id)}
                onFocus={() => probe("focus")(id)}
              >
                {TAB_LABELS[id]}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {TAB_IDS.map((id) => (
          <Tabs.Panel id={id}>
            <Text>{`${TAB_LABELS[id]} panel`}</Text>
          </Tabs.Panel>
        ))}
      </Tabs>
      <View
        role="button"
        testID="after"
        onPress={() => undefined}
        onFocus={() => probe("focus")("after")}
      >
        <Text>After</Text>
      </View>
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "heroui");

  if (name === "kobalte-plain") {
    return <KobalteTabs />;
  }

  if (name === "kobalte-vertical") {
    return <KobalteTabs orientation="vertical" />;
  }

  if (name === "kobalte-manual") {
    return <KobalteTabs keyboardActivation="manual" defaultSelectedKey="overview" />;
  }

  if (name === "kobalte-default-analytics") {
    return <KobalteTabs defaultSelectedKey="analytics" />;
  }

  if (name === "kobalte-disabled-group") {
    return <KobalteTabs isDisabled />;
  }

  if (name === "kobalte-disabled-middle") {
    return <KobalteTabs disabledTabs={["analytics"]} />;
  }

  if (name === "kobalte-all-disabled") {
    return <KobalteTabs disabledTabs={[...TAB_IDS]} />;
  }

  return <HeroTabs />;
}

mount(Fixture);
