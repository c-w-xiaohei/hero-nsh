import { host, mount, signal, Text, View } from "nsh";
import { Description, Label, ListBox } from "@heroui/react";
import type { SelectionValue } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the ListBox unit (port sheet 4b).
 *
 * A shared scenario cannot carry the probes or the external state the Kobalte
 * cases need, so every case below is selected with `host.params.case`:
 *
 *   log                  single selection, focus marker `Name*` and `✓` marker,
 *                        selection / action / focus probes (T-005, T-006,
 *                        T-013, T-021, T-022)
 *   log-wrap             the same with shouldFocusWrap (T-006)
 *   log-users            the HeroUI users (Bob / Fred / Martha) for T-002
 *   controlled           selectedKeys held outside, onSelectionChange records
 *                        only; testID="force" changes it from outside (T-011)
 *   default-selected     defaultSelectedKeys = {2} (T-010)
 *   multiple-log         multiple selection with probes (T-015)
 *   multiple-default     multiple, defaultSelectedKeys = {1, 2} (T-016, T-018)
 *   multiple-controlled  multiple, selectedKeys = {1, 2} held fixed (T-017)
 *   empty-allowed        single, default {2}, disallowEmptySelection false (T-020)
 *   disabled             single, disabledKeys = {2} (T-014 first half)
 *   disabled-selection   the same with disabledBehavior="selection" (T-014 second half)
 *   multiple-disabled    multiple, default {1, 2}, disabledKeys = {3} (T-019)
 *   typeahead            three rows and nothing else (T-021, T-022)
 *   items-section        grouped Root items + Section items, field mapping (T-007)
 *   items-section-fn     grouped, the render function computes the text (T-008)
 *   items-string         string items, render function mapping (T-009)
 *   aria-label-item      one item named by aria-label (T-023)
 *   label-description    Label and Description inside an item (T-024)
 *   section-action       selectionMode none + Section + root onAction (T-003)
 *   indicator-selected   controlled {2} with a custom ✓ indicator (T-027)
 *
 * The `disabled` parameter of the dynamic cases (`mapped` by default, `none`
 * when it is "none") makes the second instance of T-007 … T-009: the same data
 * with `isDisabled` always false so the mapped keys can be pressed.
 *
 * A row whose children is a function returns an array of two views: the label
 * block and the indicator. The marker reads the item's render props inside a
 * JSX child expression, so it follows focus and selection instead of freezing
 * at mount.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

type ItemData = { id: string; name: string; valueText: string; disabled: boolean };

const ITEMS: ItemData[] = [
  { id: "1", name: "One", valueText: "One", disabled: false },
  { id: "2", name: "Two", valueText: "Two", disabled: false },
  { id: "3", name: "Three", valueText: "Three", disabled: false },
];

const GROUPED: {
  id: string;
  name: string;
  items: ItemData[];
}[] = [
  {
    id: "section-1",
    name: "Section 1",
    items: [
      { id: "1", name: "One", valueText: "One", disabled: false },
      { id: "2", name: "Two", valueText: "Two", disabled: true },
      { id: "3", name: "Three", valueText: "Three", disabled: false },
    ],
  },
];

const USERS: ItemData[] = [
  { id: "bob", name: "Bob", valueText: "Bob", disabled: false },
  { id: "fred", name: "Fred", valueText: "Fred", disabled: false },
  { id: "martha", name: "Martha", valueText: "Martha", disabled: false },
];

function selectionArgs(keys: "all" | Iterable<unknown>): unknown {
  return keys === "all" ? "all" : Array.from(keys);
}

function onSelectionChange(keys: "all" | Iterable<unknown>): void {
  probe("selectionChange")(selectionArgs(keys));
}

/* -------------------------------------------------------------------------------------------------
 * Rows
 * -----------------------------------------------------------------------------------------------*/

function Row(props: { id: string; label: string; disabled?: boolean }) {
  return (
    <ListBox.Item
      id={props.id}
      textValue={props.label}
      aria-label={props.label}
      isDisabled={props.disabled}
    >
      {(values) => [
        <View class="flex flex-col">
          {/* aria-label keeps the accessible name stable while the marker
              follows focus, so `role:option[One]` still names the row. */}
          <Label>{values.isFocused() ? `${props.label}*` : props.label}</Label>
        </View>,
        <ListBox.ItemIndicator>
          {(indicator) => <Text>{indicator.isSelected() ? "✓" : ""}</Text>}
        </ListBox.ItemIndicator>,
      ]}
    </ListBox.Item>
  );
}

function Rows(props: { data?: ItemData[] }) {
  const data = props.data ?? ITEMS;

  return data.map((item) => <Row id={item.id} label={item.name} disabled={item.disabled} />);
}

function PlainList(props: {
  mode: "none" | "single" | "multiple";
  data?: ItemData[];
  disabledKeys?: string[];
  disabledBehavior?: "all" | "selection";
  defaultSelectedKeys?: SelectionValue;
  selectedKeys?: SelectionValue;
  disallowEmptySelection?: boolean;
  wrap?: boolean;
  action?: boolean;
}) {
  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode={props.mode}
        disabledKeys={props.disabledKeys}
        disabledBehavior={props.disabledBehavior}
        defaultSelectedKeys={props.defaultSelectedKeys}
        selectedKeys={props.selectedKeys}
        disallowEmptySelection={props.disallowEmptySelection}
        shouldFocusWrap={props.wrap}
        onSelectionChange={onSelectionChange}
        onAction={props.action ? probe("onAction") : undefined}
        onFocus={probe("focus")}
      >
        <Rows data={props.data} />
      </ListBox>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases
 * -----------------------------------------------------------------------------------------------*/

function ControlledList() {
  const keys = signal<SelectionValue>(new Set(["2"]));

  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="single"
        selectedKeys={keys()}
        onSelectionChange={onSelectionChange}
      >
        <Rows />
      </ListBox>
      <View testID="force" role="button" onPress={() => keys.set(new Set(["1"]))}>
        <Text>Force</Text>
      </View>
    </View>
  );
}

function MultipleControlledList() {
  const keys = signal<SelectionValue>(new Set(["1", "2"]));

  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="multiple"
        selectedKeys={keys()}
        onSelectionChange={onSelectionChange}
      >
        <Rows />
      </ListBox>
    </View>
  );
}

function ItemsSection(props: { disabled: boolean; computed: boolean }) {
  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="single"
        items={GROUPED}
        onSelectionChange={onSelectionChange}
      >
        {(group) => (
          <ListBox.Section aria-label={group.name} items={group.items}>
            {(item) => (
              <ListBox.Item
                id={item.id}
                textValue={item.valueText}
                aria-label={item.valueText}
                isDisabled={props.disabled ? item.disabled : false}
              >
                <Label>
                  {props.computed ? `${item.id} — ${item.name}` : item.name}
                </Label>
              </ListBox.Item>
            )}
          </ListBox.Section>
        )}
      </ListBox>
    </View>
  );
}

function ItemsString(props: { disabled: boolean }) {
  const strings = ["One", "Two", "Three"];

  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="single"
        items={strings}
        onSelectionChange={onSelectionChange}
      >
        {(item) => (
          <ListBox.Item
            id={item}
            textValue={item}
            aria-label={item}
            isDisabled={props.disabled ? item === "Two" : false}
          >
            <Label>{item}</Label>
          </ListBox.Item>
        )}
      </ListBox>
    </View>
  );
}

function AriaLabelItem() {
  return (
    <View class="w-64">
      <ListBox aria-label="Options" selectionMode="single">
        <ListBox.Item id="1" textValue="One" aria-label="Item">
          <Label>One</Label>
        </ListBox.Item>
      </ListBox>
    </View>
  );
}

function LabelDescription() {
  return (
    <View class="w-64">
      <ListBox aria-label="Options" selectionMode="single">
        <ListBox.Item id="1" textValue="One">
          <View class="flex flex-col">
            <Label>Label</Label>
            <Description>Description</Description>
          </View>
        </ListBox.Item>
      </ListBox>
    </View>
  );
}

function SectionAction() {
  return (
    <View class="w-64">
      <ListBox
        aria-label="File actions"
        selectionMode="none"
        onAction={probe("onAction")}
      >
        <ListBox.Section aria-label="Actions">
          <ListBox.Item id="new-file" textValue="New file">
            <Label>New file</Label>
          </ListBox.Item>
          <ListBox.Item id="copy-link" textValue="Copy link">
            <Label>Copy link</Label>
          </ListBox.Item>
        </ListBox.Section>
      </ListBox>
    </View>
  );
}

function IndicatorSelected() {
  return (
    <View class="w-64">
      <ListBox aria-label="Options" selectionMode="single" selectedKeys={new Set(["2"])}>
        <ListBox.Item id="1" textValue="One">
          <Label>One</Label>
          <ListBox.ItemIndicator>
            {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
          </ListBox.ItemIndicator>
        </ListBox.Item>
        <ListBox.Item id="2" textValue="Two">
          <Label>Two</Label>
          <ListBox.ItemIndicator>
            {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
          </ListBox.ItemIndicator>
        </ListBox.Item>
      </ListBox>
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "log");
  const disabledMapping = String(host.params.disabled ?? "mapped") !== "none";

  if (name === "log") {
    return <PlainList mode="single" />;
  }

  if (name === "log-wrap") {
    return <PlainList mode="single" wrap />;
  }

  if (name === "log-users") {
    return <PlainList mode="single" data={USERS} />;
  }

  if (name === "controlled") {
    return <ControlledList />;
  }

  if (name === "default-selected") {
    return <PlainList mode="single" defaultSelectedKeys={new Set(["2"])} />;
  }

  if (name === "multiple-log") {
    return <PlainList mode="multiple" />;
  }

  if (name === "multiple-default") {
    return <PlainList mode="multiple" defaultSelectedKeys={new Set(["1", "2"])} />;
  }

  if (name === "multiple-controlled") {
    return <MultipleControlledList />;
  }

  if (name === "empty-allowed") {
    return (
      <PlainList
        mode="single"
        defaultSelectedKeys={new Set(["2"])}
        disallowEmptySelection={false}
      />
    );
  }

  if (name === "disabled") {
    return <PlainList mode="single" disabledKeys={["2"]} />;
  }

  if (name === "disabled-selection") {
    return (
      <PlainList mode="single" disabledBehavior="selection" disabledKeys={["2"]} />
    );
  }

  if (name === "multiple-disabled") {
    return (
      <PlainList
        mode="multiple"
        defaultSelectedKeys={new Set(["1", "2"])}
        disabledKeys={["3"]}
      />
    );
  }

  if (name === "typeahead") {
    return <PlainList mode="single" />;
  }

  if (name === "items-section") {
    return <ItemsSection disabled={disabledMapping} computed={false} />;
  }

  if (name === "items-section-fn") {
    return <ItemsSection disabled={disabledMapping} computed />;
  }

  if (name === "items-string") {
    return <ItemsString disabled={disabledMapping} />;
  }

  if (name === "aria-label-item") {
    return <AriaLabelItem />;
  }

  if (name === "label-description") {
    return <LabelDescription />;
  }

  if (name === "section-action") {
    return <SectionAction />;
  }

  if (name === "indicator-selected") {
    return <IndicatorSelected />;
  }

  return <PlainList mode="single" />;
}

mount(Fixture);
