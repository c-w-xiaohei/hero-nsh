import { host, mount, signal, Text, View } from "nsh";
import { Disclosure, DisclosureGroup, useDisclosureGroupNavigation } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Disclosure / DisclosureGroup fixtures (port sheet 4b), not shared
 * scenarios.
 *
 * `nsh/test` cannot read `aria-expanded`, `data-expanded`, `data-slot` or a DOM
 * className, so every case here makes the upstream fact observable instead of
 * hidden: a fixed `testID` names a root, a probe writes a callback's payload to
 * Storage, and the panel's clipped body text is what "expanded" means.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the case:
 *   default          uncontrolled, root `testID="disclosure"`, trigger focus /
 *                    blur / press probes, `onExpandedChange` probe (T-001,
 *                    T-002, T-003, T-007)
 *   default-expanded uncontrolled with `defaultExpanded` (T-004, T-031)
 *   controlled       `isExpanded` held at false by a signal nothing writes back
 *                    (T-005)
 *   controlled-open  `isExpanded` held at true (T-032)
 *   disabled         `isDisabled` (T-006)
 *   group            two items (Preview / Download), nothing expanded (T-008,
 *                    T-010)
 *   group-multiple   `allowsMultipleExpanded`, nothing expanded (T-011)
 *   group-disabled   group `isDisabled` (T-013)
 *   group-controlled `expandedKeys` held at {preview} (T-012)
 *   group-single-two-defaults  single mode with defaultExpandedKeys of both
 *                    items, so the state must collapse to the first (X-002)
 *   group-controlled-two  single mode with controlled `expandedKeys` of both,
 *                    which must collapse the same way (X-002)
 *   group-state      multiple mode whose root `className` function captures the
 *                    render-props state; `Set both keys` calls its
 *                    `setExpandedKeys` (X-001)
 *   group-render-children  disabled group with children as a one-argument
 *                    render function reading `values.isDisabled()` (X-003)
 *   group-three      three items (one / two / three), nothing expanded
 *                    (T-040, T-042, T-045, T-048)
 *   group-three-expanded         three items, default {one} (T-033, T-034,
 *                                T-043, T-044)
 *   group-three-controlled       three items, expandedKeys held at {one}
 *                                (T-035)
 *   group-three-multiple         three items, multiple (T-045, T-048)
 *   group-three-multiple-expanded three items, multiple, default {one}
 *                                (T-046, T-047)
 *   tab-order        the three items followed by an `After` button, every
 *                    trigger reporting focus (T-039)
 *   nav              the `useDisclosureGroupNavigation` harness; host.params
 *                    `items` ("default" or "none"), `expanded` (comma list),
 *                    `multiple` (boolean) (T-014 … T-017, T-019 … T-028)
 *   nav-missing-items the harness called without `itemIds` (T-018)
 */

const BODY = "Hidden content revealed on expand.";

const ITEM_IDS = ["preview", "download", "share"];

/* Spreads the new set into the probe arguments, so Storage holds the keys in
 * iteration order: an empty set records no argument at all ("cleared"). */
function recordExpanded(keys: Iterable<string | number>): void {
  probe("onExpandedChange")(...Array.from(keys));
}

/* -------------------------------------------------------------------------------------------------
 * Disclosure cases
 * -----------------------------------------------------------------------------------------------*/

function DisclosureCase(props: {
  defaultExpanded?: boolean;
  controlled?: boolean;
  controlledValue?: boolean;
  disabled?: boolean;
}) {
  const held = signal(props.controlledValue ?? false);

  return (
    <Stage>
      <Disclosure
        testID="disclosure"
        defaultExpanded={props.defaultExpanded}
        isDisabled={props.disabled}
        isExpanded={props.controlled ? held() : undefined}
        onExpandedChange={probe("onExpandedChange")}
      >
        <Disclosure.Heading>
          <Disclosure.Trigger
            onFocus={() => probe("focus")("trigger")}
            onBlur={() => probe("blur")("trigger")}
            onPress={() => probe("press")("trigger")}
          >
            Toggle content
            <Disclosure.Indicator />
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>{BODY}</Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Group cases
 * -----------------------------------------------------------------------------------------------*/

type Item = { id: string; title: string; content: string };

const TWO_ITEMS: Item[] = [
  { id: "preview", title: "Preview", content: "Preview content" },
  { id: "download", title: "Download", content: "Download content" },
];

const THREE_ITEMS: Item[] = [
  { id: "one", title: "Trigger one", content: "Content one" },
  { id: "two", title: "Trigger two", content: "Content two" },
  { id: "three", title: "Trigger three", content: "Content three" },
];

function GroupItem(props: { item: Item }) {
  return (
    <Disclosure id={props.item.id}>
      <Disclosure.Heading>
        <Disclosure.Trigger onFocus={() => probe("focus")(props.item.id)}>
          {props.item.title}
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>{props.item.content}</Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

function GroupCase(props: {
  items: Item[];
  defaultExpanded?: string[];
  expanded?: string[];
  multiple?: boolean;
  disabled?: boolean;
  after?: boolean;
}) {
  const defaultKeys = new Set(props.defaultExpanded ?? []);
  const controlledKeys = new Set(props.expanded ?? []);

  return (
    <Stage>
      <DisclosureGroup
        testID="disclosure-group"
        defaultExpandedKeys={props.expanded ? undefined : defaultKeys}
        expandedKeys={props.expanded ? controlledKeys : undefined}
        allowsMultipleExpanded={props.multiple}
        isDisabled={props.disabled}
        onExpandedChange={recordExpanded}
      >
        {props.items.map((item) => (
          <GroupItem item={item} />
        ))}
      </DisclosureGroup>
      {props.after ? (
        <View
          role="button"
          focusable
          onFocus={() => probe("focus")("after")}
          onBlur={() => probe("blur")("after")}
        >
          <Text>After</Text>
        </View>
      ) : null}
    </Stage>
  );
}

/* X-001: the group's render-props state must carry `setExpandedKeys` (React
 * Stately's DisclosureGroupState). The className function is where HeroUI's
 * render props hand that state to a caller; the button then applies a new set,
 * exactly as an app would. */
function StateApiCase() {
  let applyBoth: ((keys: Set<string | number>) => void) | undefined;

  return (
    <Stage>
      <View role="button" onPress={() => applyBoth?.(new Set(["preview", "download"]))}>
        <Text>Set both keys</Text>
      </View>
      <DisclosureGroup
        testID="disclosure-group"
        allowsMultipleExpanded
        className={(values) => {
          applyBoth = (keys) => values.state.setExpandedKeys(keys);
          return "";
        }}
      >
        {TWO_ITEMS.map((item) => (
          <GroupItem item={item} />
        ))}
      </DisclosureGroup>
    </Stage>
  );
}

/* X-003: children may be a one-argument render function receiving the group's
 * render values; `isDisabled` is an accessor per D17. The items stay inside the
 * function so the provider must wrap the resolved children. */
function RenderChildrenCase() {
  return (
    <Stage>
      <DisclosureGroup testID="disclosure-group" isDisabled>
        {(values) => (
          <View class="flex flex-col items-start">
            <Text testID="children-render-props">
              {values.isDisabled() ? "group is disabled" : "group is enabled"}
            </Text>
            {TWO_ITEMS.map((item) => (
              <GroupItem item={item} />
            ))}
          </View>
        )}
      </DisclosureGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * useDisclosureGroupNavigation harness
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
  const expandedSet = new Set<string | number>(expandedParam ? expandedParam.split(",") : []);
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

/* The upstream case omits `itemIds`; the public type keeps it required, so the
 * fixture hands a props object without it through a cast, exactly the runtime
 * shape the hook has to tolerate. */
function MissingItemsCase() {
  const nav = useDisclosureGroupNavigation({
    expandedKeys: () => new Set<string | number>(),
    onExpandedChange: recordExpanded,
  } as unknown as Parameters<typeof useDisclosureGroupNavigation>[0]);

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
  const name = String(host.params.case ?? "default");

  if (name === "default") return <DisclosureCase />;
  if (name === "default-expanded") return <DisclosureCase defaultExpanded />;
  if (name === "controlled") return <DisclosureCase controlled controlledValue={false} />;
  if (name === "controlled-open") return <DisclosureCase controlled controlledValue />;
  if (name === "disabled") return <DisclosureCase disabled />;
  if (name === "group") return <GroupCase items={TWO_ITEMS} />;
  if (name === "group-multiple") return <GroupCase items={TWO_ITEMS} multiple />;
  if (name === "group-disabled") return <GroupCase items={TWO_ITEMS} disabled />;
  if (name === "group-controlled") return <GroupCase items={TWO_ITEMS} expanded={["preview"]} />;
  if (name === "group-single-two-defaults") {
    return <GroupCase items={TWO_ITEMS} defaultExpanded={["preview", "download"]} />;
  }
  if (name === "group-controlled-two") {
    return <GroupCase items={TWO_ITEMS} expanded={["preview", "download"]} />;
  }
  if (name === "group-state") return <StateApiCase />;
  if (name === "group-render-children") return <RenderChildrenCase />;
  if (name === "group-three") return <GroupCase items={THREE_ITEMS} />;
  if (name === "group-three-expanded") {
    return <GroupCase items={THREE_ITEMS} defaultExpanded={["one"]} />;
  }
  if (name === "group-three-controlled") {
    return <GroupCase items={THREE_ITEMS} expanded={["one"]} />;
  }
  if (name === "group-three-multiple") return <GroupCase items={THREE_ITEMS} multiple />;
  if (name === "group-three-multiple-expanded") {
    return <GroupCase items={THREE_ITEMS} multiple defaultExpanded={["one"]} />;
  }
  if (name === "tab-order") return <GroupCase items={THREE_ITEMS} after />;
  if (name === "nav") return <NavCase />;
  if (name === "nav-missing-items") return <MissingItemsCase />;

  return <Text>{`unknown case: ${name}`}</Text>;
}

mount(Fixture);
