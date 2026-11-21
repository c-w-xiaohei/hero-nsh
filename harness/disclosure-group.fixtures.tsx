import { host, mount, Text, View } from "nsh";
import {
  Disclosure,
  DisclosureGroup,
  EnvironmentScope,
  useDisclosureGroupNavigation,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only DisclosureGroup fixtures for the mobile layer
 * (adapt-sheets/disclosure-group.md §4 M-001…M-008), kept next to
 * harness/nsh.json for the same reason disclosure.fixtures.tsx is: NSH takes
 * the entry's own directory as the app root.
 *
 * The cases are the group's own slice of the disclosure.fixtures.tsx shapes,
 * trimmed to what the mobile assertions drive, plus `group-gap` (a plain
 * spacer between the items — the group's bare surface) and an `onLayout`
 * probe on the group root (M-007's width comparison).
 *
 * host.params.case picks the case:
 *   group                      two items (Preview / Download), nothing
 *                              expanded (M-001, M-007)
 *   group-gap                  the same group with a `id:group-gap` spacer
 *                              between the items (M-002, M-003)
 *   group-disabled             group `isDisabled` (M-005)
 *   group-single-two-defaults  single mode, defaultExpandedKeys of both
 *                              items, normalized to the first (M-008)
 *   nav                        the `useDisclosureGroupNavigation` harness;
 *                              host.params `items` ("default" or "none"),
 *                              `expanded` (comma list), `multiple`
 *                              (boolean) (M-006)
 *
 * host.params.scope picks the `EnvironmentScope` wrapper ("" = host default,
 * "touch" = `input="touch"`), same convention as pressable.fixtures.tsx.
 */

const ITEM_IDS = ["preview", "download", "share"];

const TWO_ITEMS = [
  { id: "preview", title: "Preview", content: "Preview content" },
  { id: "download", title: "Download", content: "Download content" },
];

type Item = (typeof TWO_ITEMS)[number];

/* Spreads the new set into the probe arguments, so Storage holds the keys in
 * iteration order: an empty set records a call with no arguments ("cleared"). */
function recordExpanded(keys: Iterable<string | number>): void {
  probe("onExpandedChange")(...Array.from(keys));
}

function GroupItem(props: { item: Item }) {
  return (
    <Disclosure id={props.item.id}>
      <Disclosure.Heading>
        <Disclosure.Trigger>{props.item.title}</Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>{props.item.content}</Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

function GroupCase(props: {
  defaultExpanded?: string[];
  disabled?: boolean;
  gap?: boolean;
}) {
  const reportLayout = probe("layout");
  const defaultKeys = new Set<string | number>(props.defaultExpanded ?? []);

  return (
    <Stage>
      <DisclosureGroup
        testID="disclosure-group"
        defaultExpandedKeys={defaultKeys}
        isDisabled={props.disabled}
        onExpandedChange={recordExpanded}
        onLayout={(event) =>
          reportLayout({
            width: event.bounds.size.width,
            height: event.bounds.size.height,
          })
        }
      >
        <GroupItem item={TWO_ITEMS[0]} />
        {props.gap === true ? (
          /* The group's bare surface between the items: fixture chrome, not a
           * component part — it hears no presses, so `app.press("id:group-gap")`
           * can only reach the group's own (absent) press surface. */
          <View testID="group-gap" class="h-6 w-full" />
        ) : null}
        <GroupItem item={TWO_ITEMS[1]} />
      </DisclosureGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * useDisclosureGroupNavigation harness (same shape as disclosure.fixtures.tsx)
 * -----------------------------------------------------------------------------------------------*/

type Navigation = ReturnType<typeof useDisclosureGroupNavigation>;

function NavigationFrame(props: { nav: Navigation }) {
  return (
    <View class="flex flex-col items-start gap-2">
      <Text testID="current-index">{String(props.nav.currentIndex())}</Text>
      <View
        role="button"
        disabled={props.nav.isPrevDisabled()}
        onPress={() => props.nav.onPrevious()}
      >
        <Text>Previous</Text>
      </View>
      <View
        role="button"
        disabled={props.nav.isNextDisabled()}
        onPress={() => props.nav.onNext()}
      >
        <Text>Next</Text>
      </View>
      {/* Always enabled so the hook's own bounds guards can be exercised. */}
      <View role="button" onPress={() => props.nav.onPrevious()}>
        <Text>Force previous</Text>
      </View>
      <View role="button" onPress={() => props.nav.onNext()}>
        <Text>Force next</Text>
      </View>
    </View>
  );
}

function NavCase() {
  const itemsParam = String(host.params.items ?? "default");
  const itemIds = itemsParam === "none" ? [] : ITEM_IDS;
  const expandedParam = String(host.params.expanded ?? "");
  const expandedSet = new Set<string | number>(
    expandedParam ? expandedParam.split(",") : [],
  );
  const multiple = host.params.multiple === true;

  const nav = useDisclosureGroupNavigation({
    expandedKeys: () => expandedSet,
    itemIds: () => itemIds,
    onExpandedChange: recordExpanded,
    allowsMultipleExpanded: multiple,
  });

  return (
    <Stage>
      <NavigationFrame nav={nav} />
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Entry
 * -----------------------------------------------------------------------------------------------*/

function Fixture() {
  const name = String(host.params.case ?? "group");

  if (name === "group") return <GroupCase />;
  if (name === "group-gap") return <GroupCase gap />;
  if (name === "group-disabled") return <GroupCase disabled />;
  if (name === "group-single-two-defaults") {
    return <GroupCase defaultExpanded={["preview", "download"]} />;
  }
  if (name === "nav") return <NavCase />;

  return <Text>{`unknown case: ${name}`}</Text>;
}

function ScopedFixture() {
  const scope = String(host.params.scope ?? "");

  return scope === "touch" ? (
    <EnvironmentScope input="touch">
      <Fixture />
    </EnvironmentScope>
  ) : (
    <Fixture />
  );
}

mount(ScopedFixture);