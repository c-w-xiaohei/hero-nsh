import { signal, Text, View } from "nsh";
import { Tabs } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for Tabs, written with HeroUI's API only (SOP 3.3).
 *
 * Sources are `tabs.stories.tsx`. Each story becomes one entry:
 *
 *   tabs/default                       Default
 *   tabs/overflow                      Overflow
 *   tabs/vertical                      Vertical
 *   tabs/vertical-align                VerticalAlign (align="end", secondary)
 *   tabs/with-disabled-tab             WithDisabledTab
 *   tabs/with-default-selected-tab     WithDefaultSelectedTab
 *   tabs/with-controlled-selection-tab WithControlledSelectionTab
 *   tabs/with-custom-style             WithCustomStyle
 *   tabs/with-separator                WithSeparator
 *   tabs/secondary                     Secondary
 *   tabs/secondary-vertical            SecondaryVertical
 *   tabs/force-mount                   shouldForceMount, taken from Showcase1
 *
 * Three story parts cannot be shared and are left out (port sheet section 5):
 *
 * - `Showcase1` is built from CDN photography, `order-first`, `aspect-*`,
 *   `max-w-max`, `scrollbar-hide` and `*:` child variants; the child variants,
 *   `order-*`, `scroll-*` and `max-w-max` are unknown to NSH's Tailwind, and the
 *   images never load there. Its `shouldForceMount` panels are the only part
 *   that belongs to this component's API, so they become `tabs/force-mount`.
 * - `WithCustomStyle`'s list carries `*:` child variants that set each tab's
 *   height, padding, size and weight; those utilities move onto each `Tab`,
 *   which is the same declaration for every child. The `*:data-[selected=true]:`
 *   colour of the selected tab is dropped: NSH projects selection through
 *   `accessibilityState`, not through a `data-selected` attribute.
 * - `WithControlledSelectionTab` holds React state upstream; here it holds an
 *   `nsh` signal, as the other controlled scenarios do.
 */

function Panels() {
  return (
    <>
      <Tabs.Panel className="pt-4" id="overview">
        <Text>View your project overview and recent activity.</Text>
      </Tabs.Panel>
      <Tabs.Panel className="pt-4" id="analytics">
        <Text>Track your metrics and analyze performance data.</Text>
      </Tabs.Panel>
      <Tabs.Panel className="pt-4" id="reports">
        <Text>Generate and download detailed reports.</Text>
      </Tabs.Panel>
    </>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Default (story Default)
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <View class="w-[600px]">
        <Tabs>
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
              <Tabs.Tab id="reports">
                Reports
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Panels />
        </Tabs>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Overflow (story Overflow): nine tabs in a 400px container, so the chevrons show
 * -----------------------------------------------------------------------------------------------*/

const OVERFLOW_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "reports", label: "Reports" },
  { id: "performance", label: "Performance" },
  { id: "engagement", label: "Engagement" },
  { id: "audience", label: "Audience" },
  { id: "acquisition", label: "Acquisition" },
  { id: "retention", label: "Retention" },
  { id: "settings", label: "Settings" },
];

function Overflow() {
  return (
    <Stage>
      <View class="w-[400px]">
        <Tabs>
          <Tabs.ListContainer>
            <Tabs.List aria-label="Overflow options">
              {OVERFLOW_ITEMS.map((item) => (
                <Tabs.Tab id={item.id}>
                  {item.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
          {OVERFLOW_ITEMS.map((item) => (
            <Tabs.Panel className="pt-4" id={item.id}>
              <Text>{`${item.label} panel content.`}</Text>
            </Tabs.Panel>
          ))}
        </Tabs>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Vertical (stories Vertical and VerticalAlign)
 * -----------------------------------------------------------------------------------------------*/

const VERTICAL_ITEMS = [
  {
    id: "account",
    label: "Account",
    heading: "Account Settings",
    content: "Manage your account information and preferences.",
  },
  {
    id: "security",
    label: "Security",
    heading: "Security Settings",
    content: "Configure two-factor authentication and password settings.",
  },
  {
    id: "notifications",
    label: "Notifications",
    heading: "Notification Preferences",
    content: "Choose how and when you want to receive notifications.",
  },
  {
    id: "billing",
    label: "Billing",
    heading: "Billing Information",
    content: "View and manage your subscription and payment methods.",
  },
];

function Vertical(props: {
  orientation?: "horizontal" | "vertical";
  align?: "start" | "center" | "end";
  variant?: "primary" | "secondary";
}) {
  return (
    <Stage>
      <View class="w-[600px]">
        <Tabs
          orientation={props.orientation ?? "vertical"}
          align={props.align}
          variant={props.variant}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Vertical tabs">
              {VERTICAL_ITEMS.map((item) => (
                <Tabs.Tab id={item.id}>
                  {item.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
          {VERTICAL_ITEMS.map((item) => (
            <Tabs.Panel className="px-4" id={item.id}>
              <Text class="mb-2 font-semibold">{item.heading}</Text>
              <Text class="text-sm text-muted">{item.content}</Text>
            </Tabs.Panel>
          ))}
        </Tabs>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDisabledTab (story WithDisabledTab)
 * -----------------------------------------------------------------------------------------------*/

function WithDisabledTab() {
  return (
    <Stage>
      <View class="w-[600px]">
        <Tabs>
          <Tabs.ListContainer>
            <Tabs.List aria-label="Tabs with disabled">
              <Tabs.Tab id="active">
                Active
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab isDisabled id="disabled">
                Disabled
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="available">
                Available
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel className="pt-4" id="active">
            <Text>This tab is active and can be selected.</Text>
          </Tabs.Panel>
          <Tabs.Panel className="pt-4" id="disabled">
            <Text>This content cannot be accessed.</Text>
          </Tabs.Panel>
          <Tabs.Panel className="pt-4" id="available">
            <Text>This tab is also available for selection.</Text>
          </Tabs.Panel>
        </Tabs>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDefaultSelectedTab (story WithDefaultSelectedTab)
 * -----------------------------------------------------------------------------------------------*/

function WithDefaultSelectedTab() {
  return (
    <Stage>
      <View class="w-[600px]">
        <Tabs defaultSelectedKey="default">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Tabs with default options">
              <Tabs.Tab id="active">
                Active
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="default">
                Default
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="available">
                Available
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel className="pt-4" id="active">
            <Text>This tab is active and can be selected.</Text>
          </Tabs.Panel>
          <Tabs.Panel className="pt-4" id="default">
            <Text>This tab is the default selection.</Text>
          </Tabs.Panel>
          <Tabs.Panel className="pt-4" id="available">
            <Text>This tab is available for selection as well.</Text>
          </Tabs.Panel>
        </Tabs>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithControlledSelectionTab (story WithControlledSelectionTab)
 * -----------------------------------------------------------------------------------------------*/

function WithControlledSelectionTab() {
  const selected = signal<string | number>("controlled");

  return (
    <Stage>
      <View class="w-[600px]">
        <Text class="my-2">{`Selected: ${selected()}`}</Text>
        <Tabs selectedKey={selected()} onSelectionChange={(key: string | number) => selected.set(key)}>
          <Tabs.ListContainer>
            <Tabs.List aria-label="Tabs with controlled options">
              <Tabs.Tab id="active">
                Active
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="controlled">
                Controlled
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="available">
                Available
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel className="pt-4" id="active">
            <Text>This tab is active and can be selected.</Text>
          </Tabs.Panel>
          <Tabs.Panel className="pt-4" id="controlled">
            <Text>This tab is the controlled selection.</Text>
          </Tabs.Panel>
          <Tabs.Panel className="pt-4" id="available">
            <Text>This tab is available for selection as well.</Text>
          </Tabs.Panel>
        </Tabs>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithCustomStyle (story WithCustomStyle)
 * -----------------------------------------------------------------------------------------------*/

const CUSTOM_STYLE_ITEMS = [
  { id: "daily", label: "Daily", panel: "Daily activity" },
  { id: "weekly", label: "Weekly", panel: "Weekly activity" },
  { id: "bi-weekly", label: "Bi-Weekly", panel: "Bi-weekly activity" },
  { id: "monthly", label: "Monthly", panel: "Monthly activity" },
];

function WithCustomStyle() {
  return (
    <Stage>
      <View class="w-[380px]">
        <Tabs>
          <Tabs.ListContainer>
            <Tabs.List aria-label="Options" className="w-fit">
              {CUSTOM_STYLE_ITEMS.map((item) => (
                <Tabs.Tab className="h-6 w-fit px-3 text-sm font-normal" id={item.id}>
                  {item.label}
                  <Tabs.Indicator className="bg-accent" />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
          {CUSTOM_STYLE_ITEMS.map((item) => (
            <Tabs.Panel className="pt-4" id={item.id}>
              <Text>{item.panel}</Text>
            </Tabs.Panel>
          ))}
        </Tabs>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSeparator (story WithSeparator)
 * -----------------------------------------------------------------------------------------------*/

function WithSeparator() {
  return (
    <Stage>
      <View class="w-[600px]">
        <Tabs>
          <Tabs.ListContainer>
            <Tabs.List aria-label="Options">
              <Tabs.Tab id="overview">
                Overview
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="analytics">
                <Tabs.Separator />
                Analytics
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="reports">
                <Tabs.Separator />
                Reports
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Panels />
        </Tabs>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Secondary and SecondaryVertical (stories Secondary, SecondaryVertical)
 * -----------------------------------------------------------------------------------------------*/

function Secondary() {
  return (
    <Stage>
      <View class="w-[600px]">
        <Tabs variant="secondary">
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
              <Tabs.Tab id="reports">
                Reports
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Panels />
        </Tabs>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ForceMount (shouldForceMount, from story Showcase1)
 * -----------------------------------------------------------------------------------------------*/

function ForceMount() {
  return (
    <Stage>
      <View class="w-[600px]">
        <Tabs defaultSelectedKey="overview">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Force mounted panels">
              <Tabs.Tab id="overview">
                Overview
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="analytics">
                Analytics
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="reports">
                Reports
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel shouldForceMount className="pt-4" id="overview">
            <Text>Overview panel, mounted while not selected.</Text>
          </Tabs.Panel>
          <Tabs.Panel shouldForceMount className="pt-4" id="analytics">
            <Text>Analytics panel, mounted while not selected.</Text>
          </Tabs.Panel>
          <Tabs.Panel shouldForceMount className="pt-4" id="reports">
            <Text>Reports panel, mounted while not selected.</Text>
          </Tabs.Panel>
        </Tabs>
      </View>
    </Stage>
  );
}

export const tabsScenarios: Record<string, Component> = {
  "tabs/default": Default,
  "tabs/overflow": Overflow,
  "tabs/vertical": () => <Vertical />,
  "tabs/vertical-align": () => <Vertical align="end" variant="secondary" />,
  "tabs/with-disabled-tab": WithDisabledTab,
  "tabs/with-default-selected-tab": WithDefaultSelectedTab,
  "tabs/with-controlled-selection-tab": WithControlledSelectionTab,
  "tabs/with-custom-style": WithCustomStyle,
  "tabs/with-separator": WithSeparator,
  "tabs/secondary": Secondary,
  "tabs/secondary-vertical": () => <Vertical variant="secondary" />,
  "tabs/force-mount": ForceMount,
};
