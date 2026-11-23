import { effect, host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  createListState,
  createRowRegistry,
  Description,
  EnvironmentScope,
  Label,
  ListBox,
  ListOwnerContext,
  PressableFeedback,
  PressableFeedbackContext,
  toListItemData,
  listItemDataGetters,
} from "@heroui/react";
import type {
  ListOwner,
  ListOwnerListControls,
  ListState,
  PressableFeedbackContextValue,
  SelectionValue,
} from "@heroui/react";
import { ListBoxContext } from "../src/components/list-box/list-box-context";
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
 *   dynamic-items        live items reordered / shrunk / grown (X-001)
 *   dynamic-children     a static child added after mount (X-001)
 *   empty-fill           an initially empty items list filled (X-001)
 *   dynamic-replace      an item replaced under its key, and at a position (X-006)
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

function Row(props: { id: string; label: string; disabled?: boolean; className?: string }) {
  return (
    <ListBox.Item
      id={props.id}
      textValue={props.label}
      aria-label={props.label}
      isDisabled={props.disabled}
      className={props.className}
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
  escapeKeyBehavior?: "clearSelection" | "none";
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
        escapeKeyBehavior={props.escapeKeyBehavior}
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

/* -------------------------------------------------------------------------------------------------
 * Follow-up cases: page keys, modified keys, focus ring, press-up label,
 * dynamic collections and the empty state
 * -----------------------------------------------------------------------------------------------*/

const PAGED: ItemData[] = [
  { id: "1", name: "One", valueText: "One", disabled: false },
  { id: "2", name: "Two", valueText: "Two", disabled: false },
  { id: "3", name: "Three", valueText: "Three", disabled: false },
  { id: "4", name: "Four", valueText: "Four", disabled: false },
  { id: "5", name: "Five", valueText: "Five", disabled: false },
  { id: "6", name: "Six", valueText: "Six", disabled: false },
  { id: "7", name: "Seven", valueText: "Seven", disabled: false },
  { id: "8", name: "Eight", valueText: "Eight", disabled: false },
  { id: "9", name: "Nine", valueText: "Nine", disabled: false },
  { id: "10", name: "Ten", valueText: "Ten", disabled: false },
];

/** Ten 40 pt rows in a 160 pt box: one page is four rows. */
function PagedList() {
  return (
    <View class="h-40 w-64">
      <ListBox aria-label="Options" className="h-40 w-full" selectionMode="single">
        {PAGED.map((item) => (
          <Row id={item.id} label={item.name} className="h-10" />
        ))}
      </ListBox>
    </View>
  );
}

const SECTION_ROWS: string[][] = [
  ["A1", "A2", "A3", "A4", "A5"],
  ["B1", "B2", "B3", "B4", "B5"],
  ["C1", "C2", "C3", "C4", "C5"],
];

/** Three sections without ids, five 40 pt rows each, in a 160 pt box. */
function KeylessSections() {
  return (
    <View class="h-40 w-64">
      <ListBox
        aria-label="Options"
        className="h-40 w-full"
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      >
        {SECTION_ROWS.map((rows) => (
          <ListBox.Section aria-label={rows[0]}>
            {rows.map((label) => (
              <Row id={label.toLowerCase()} label={label} className="h-10" />
            ))}
          </ListBox.Section>
        ))}
      </ListBox>
    </View>
  );
}

function ModifiedList() {
  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="multiple"
        onSelectionChange={onSelectionChange}
      >
        <Row id="1" label="One" />
        <Row id="2" label="Two" />
        <Row id="3" label="Three" />
        <Row id="4" label="Four" />
      </ListBox>
    </View>
  );
}

function FocusRingRow(props: { id: string; label: string }) {
  return (
    <ListBox.Item id={props.id} textValue={props.label} aria-label={props.label}>
      {(values) => (
        <Label>
          {`${props.label}${values.isFocused() ? "*" : ""}${values.isFocusVisible() ? "!" : ""}`}
        </Label>
      )}
    </ListBox.Item>
  );
}

function FocusRingList() {
  return (
    <View class="w-64">
      <ListBox aria-label="Options" selectionMode="single">
        <FocusRingRow id="1" label="One" />
        <FocusRingRow id="2" label="Two" />
      </ListBox>
    </View>
  );
}

function PressUpLabelList() {
  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="single"
        shouldSelectOnPressUp
        onSelectionChange={onSelectionChange}
      >
        <Row id="1" label="One" />
        <Row id="2" label="Two" />
      </ListBox>
    </View>
  );
}

function DynamicItems() {
  const rows = signal<ItemData[]>([...ITEMS]);

  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="single"
        items={rows()}
        onSelectionChange={onSelectionChange}
      >
        {(item) => (
          <ListBox.Item id={item.id} textValue={item.name} aria-label={item.name}>
            <Label>{item.name}</Label>
          </ListBox.Item>
        )}
      </ListBox>
      <View
        testID="reorder"
        role="button"
        onPress={() => rows.set([...rows()].reverse())}
      >
        <Text>reorder</Text>
      </View>
      <View
        testID="remove"
        role="button"
        onPress={() => rows.set(rows().filter((item) => item.id !== "2"))}
      >
        <Text>remove</Text>
      </View>
      <View
        testID="prepend"
        role="button"
        onPress={() =>
          rows.set([
            { id: "z", name: "Zed", valueText: "Zed", disabled: false },
            ...rows(),
          ])
        }
      >
        <Text>prepend</Text>
      </View>
    </View>
  );
}

function DynamicChildren() {
  const added = signal(false);

  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="single"
        onSelectionChange={onSelectionChange}
      >
        <ListBox.Item id="1" textValue="One">
          <Label>One</Label>
        </ListBox.Item>
        <ListBox.Item id="2" textValue="Two">
          <Label>Two</Label>
        </ListBox.Item>
        <If when={added()}>
          <ListBox.Item id="3" textValue="Three">
            <Label>Three</Label>
          </ListBox.Item>
        </If>
      </ListBox>
      <View testID="add" role="button" onPress={() => added.set(true)}>
        <Text>add</Text>
      </View>
    </View>
  );
}

function EmptyFill() {
  const rows = signal<ItemData[]>([]);

  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="single"
        items={rows()}
        renderEmptyState={() => <Text>Empty list</Text>}
        onSelectionChange={onSelectionChange}
      >
        {(item) => (
          <ListBox.Item id={item.id} textValue={item.name} aria-label={item.name}>
            <Label>{item.name}</Label>
          </ListBox.Item>
        )}
      </ListBox>
      <View
        testID="fill"
        role="button"
        onPress={() => rows.set([ITEMS[0], ITEMS[1]])}
      >
        <Text>fill</Text>
      </View>
    </View>
  );
}

type PlainItem = { name: string };

/**
 * X-006: two live collections whose data is replaced under an existing key.
 * The keyed list renames id "1" (same id, new object); the keyless list
 * replaces the object at position 0, whose key is its index.
 */
function DynamicReplace() {
  const keyed = signal<ItemData[]>([ITEMS[0], ITEMS[1]]);
  const plain = signal<readonly PlainItem[]>([{ name: "A" }, { name: "B" }]);

  return (
    <View class="w-64">
      <ListBox
        aria-label="Keyed"
        selectionMode="single"
        items={keyed()}
        onSelectionChange={onSelectionChange}
      >
        {(item) => (
          <ListBox.Item id={item.id} textValue={item.name} aria-label={item.name}>
            <Label>{item.name}</Label>
          </ListBox.Item>
        )}
      </ListBox>
      <View
        testID="rename"
        role="button"
        onPress={() =>
          keyed.set([{ ...keyed()[0], name: "Uno", valueText: "Uno" }, keyed()[1]])
        }
      >
        <Text>rename</Text>
      </View>
      <ListBox
        aria-label="Positional"
        selectionMode="single"
        items={plain()}
        onSelectionChange={onSelectionChange}
      >
        {(item) => (
          <ListBox.Item textValue={item.name} aria-label={item.name}>
            <Label>{item.name}</Label>
          </ListBox.Item>
        )}
      </ListBox>
      <View
        testID="replace"
        role="button"
        onPress={() => plain.set([{ name: "C" }, plain()[1]])}
      >
        <Text>replace</Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * f-collection: the seam's own cases (sheet §2 A-009)
 *
 * `OwnerShim` plays a Select-like owner: it provides `ListOwnerContext`,
 * captures the `ListState`/`ListOwnerListControls` the ListBox registers, and
 * exposes `testID` buttons that drive the same controls a virtual-focus field
 * would (`handleKeyDown` navigation, `focusKey`, `activateFocused`,
 * `findItem`, `itemCount`, collection reads). It is the only headless-safe
 * way to reach the keyboard paths — a headless run cannot give the root view
 * focus, and the assertions test the seam, not view focus.
 *
 * `RegistryProbe` mounts inside a row, reads `rowRegistry` from the list
 * context and probes `has(param.probekey)` — the mounted-presence half of the
 * M-003 negative assertion.
 * -----------------------------------------------------------------------------------------------*/

function param(name: string): string {
  return String(host.params[name] ?? "");
}

/** `find-<key>`, `focus-<key>`, … testIDs cannot hold `:`/`#`; sanitize once. */
function safe(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function OwnerShim(props: {
  children: () => JSX.Element;
  mode: "none" | "single" | "multiple";
  disabledKeys?: string[];
  withFilter?: boolean;
  onToggle: () => void;
}) {
  const filter = signal<string | undefined>(undefined);

  let listState: ListState | undefined;
  let listControls: ListOwnerListControls | undefined;

  const owner: ListOwner = {
    selectionMode: () => props.mode,
    selectedKeys: () => undefined,
    defaultSelectedKeys: () => undefined,
    onSelectionChange,
    allowDuplicateSelectionEvents: () => false,
    disallowEmptySelection: () => false,
    disabledKeys: () => props.disabledKeys,
    shouldFocusOnHover: () => false,
    shouldSelectOnPressUp: () => false,
    escape: () => {},
    closeOnSelection: () => false,
    close: () => {},
    isActive: () => true,
    registerList: (state, controls) => {
      listState = state;
      listControls = controls;
      return () => {};
    },
    filterText: props.withFilter ? () => filter() : undefined,
  };

  const sendKey = (key: string) => {
    if (key === "focus") {
      const keyParam = param("probekey");
      listControls?.focusKey(keyParam);
      probe("focusKey")(keyParam);
      return;
    }

    if (key === "activate") {
      listControls?.activateFocused?.();
      probe("activate")("done");
      return;
    }

    if (key === "find") {
      const keyParam = param("probekey");
      const item = listControls?.findItem(keyParam);
      probe("findItem")({
        key: item?.key ?? null,
        textValue: item?.textValue() ?? null,
        hasChildren: item?.children != null,
      });
      return;
    }

    if (key === "node") {
      const keyParam = param("probekey");
      const node = listState?.collection().getItem(keyParam);
      probe("node")(
        node
          ? {
              type: node.type,
              key: node.key,
              textValue: node.textValue,
              disabled: node.disabled,
            }
          : null,
      );
      return;
    }

    if (key === "keys") {
      probe("keys")([...(listState?.collection().getKeys() ?? [])]);
      return;
    }

    if (key === "itemcount") {
      probe("itemCount")(listControls?.itemCount?.() ?? -1);
      return;
    }

    if (key === "focused") {
      probe("focusedKey")(listControls?.focusedKey() ?? null);
      return;
    }

    if (key === "toggle") {
      props.onToggle();
      probe("toggle")(param("toggle"));
      return;
    }

    if (key === "filter") {
      const next = filter() === undefined ? param("filter") : undefined;
      filter.set(next);
      probe("filterSet")(next ?? null);
      return;
    }

    listControls?.handleKeyDown?.({ key });
  };

  const buttons = [
    "keys",
    "focused",
    "activate",
    "itemcount",
    "toggle",
    "filter",
    "nav-down",
    "nav-up",
    "nav-pageup",
    "nav-pagedown",
    "nav-t",
    "nav-d",
    "nav-a",
    "nav-c",
    "nav-x",
  ];

  return (
    <ListOwnerContext.Provider value={owner}>
      <View class="w-64">
        {props.children()}
        {buttons.map((id) => (
          <View
            role="button"
            testID={id}
            onPress={() => sendKey(id.startsWith("nav-") ? id.slice(4) : id)}
          >
            <Text>{id}</Text>
          </View>
        ))}
        {param("probekey") !== "" && (
          <View
            role="button"
            testID={`find-${safe(param("probekey"))}`}
            onPress={() => sendKey("find")}
          >
            <Text>find</Text>
          </View>
        )}
        {param("probekey") !== "" && (
          <View
            role="button"
            testID={`node-${safe(param("probekey"))}`}
            onPress={() => sendKey("node")}
          >
            <Text>node</Text>
          </View>
        )}
        {param("probekey") !== "" && (
          <View
            role="button"
            testID={`focus-${safe(param("probekey"))}`}
            onPress={() => sendKey("focus")}
          >
            <Text>focus</Text>
          </View>
        )}
      </View>
    </ListOwnerContext.Provider>
  );
}

/** Mounted-presence probe: `probe("hasRow")` records `rowRegistry.has`. */
function RegistryProbe() {
  const list = ListBoxContext();

  if (!list) {
    return null;
  }

  return (
    <View
      role="button"
      testID="hasrow"
      class="h-2 w-2"
      onPress={() => probe("hasRow")(list.rowRegistry.has(param("probekey")))}
    />
  );
}

const MOBILE_ITEMS = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Bravo" },
  { id: "3", name: "Charlie" },
  { id: "4", name: "Delta" },
  { id: "5", name: "Echo" },
];

function MobileItemsList(props: { mode: "single" | "multiple" }) {
  const hidden = signal<string[]>(
    param("hide") === "" ? [] : [param("hide")],
  );

  return (
    <OwnerShim
      mode={props.mode}
      onToggle={() => hidden.set(hidden().length ? [] : [param("toggle")])}
    >
      {() => (
        <ListBox
          aria-label="Options"
          selectionMode={props.mode}
          items={MOBILE_ITEMS}
          onSelectionChange={onSelectionChange}
        >
          {(item, index) => (
            <If when={!hidden().includes(item.id)}>
              {() => (
                <ListBox.Item
                  id={item.id}
                  textValue={item.name}
                  aria-label={item.name}
                >
                  {index === 0
                    ? [<Label>{item.name}</Label>, <RegistryProbe />]
                    : [<Label>{item.name}</Label>]}
                </ListBox.Item>
              )}
            </If>
          )}
        </ListBox>
      )}
    </OwnerShim>
  );
}

function MobileOverrideList() {
  const hidden = signal<string[]>(
    param("hide") === "" ? [] : [param("hide")],
  );
  const DATA = [
    { id: "x" },
    { id: "y", name: "Wye" },
  ];

  return (
    <OwnerShim
      mode="single"
      onToggle={() => hidden.set(hidden().length ? [] : [param("toggle")])}
    >
      {() => (
        <ListBox
          aria-label="Options"
          selectionMode="single"
          items={DATA}
          onSelectionChange={onSelectionChange}
        >
          {(item, index) => (
            <If when={!hidden().includes(item.id)}>
              {() => (
                <ListBox.Item
                  id={item.id}
                  textValue={item.id === "x" ? "Xray" : undefined}
                  aria-label={item.id === "x" ? "Xray" : item.name}
                >
                  {index === 0
                    ? [<Label>{item.id === "x" ? "Xray" : item.name}</Label>, <RegistryProbe />]
                    : [<Label>{item.id === "x" ? "Xray" : item.name}</Label>]}
                </ListBox.Item>
              )}
            </If>
          )}
        </ListBox>
      )}
    </OwnerShim>
  );
}

function MobileOrphanList() {
  const DATA = [
    { id: "1", name: "One" },
    { id: "2", name: "Two" },
  ];

  return (
    <OwnerShim mode="multiple" onToggle={() => {}}>
      {() => (
        <ListBox
          aria-label="Options"
          selectionMode="multiple"
          items={DATA}
          onSelectionChange={onSelectionChange}
        >
          {(item) => (
            <ListBox.Item
              id={item.id === "1" ? "orphan" : item.id}
              textValue={item.name}
              aria-label={item.name}
            >
              <Label>{item.name}</Label>
            </ListBox.Item>
          )}
        </ListBox>
      )}
    </OwnerShim>
  );
}

function MobileNoKeyList() {
  const DATA = [{ name: "Plain A" }, { name: "Plain B" }];

  return (
    <OwnerShim mode="single" onToggle={() => {}}>
      {() => (
        <ListBox
          aria-label="Options"
          selectionMode="single"
          items={DATA}
          onSelectionChange={onSelectionChange}
        >
          {(item) => (
            <ListBox.Item textValue={item.name} aria-label={item.name}>
              <Label>{item.name}</Label>
            </ListBox.Item>
          )}
        </ListBox>
      )}
    </OwnerShim>
  );
}

function MobileSectionList() {
  const DATA = [
    {
      name: "Fruits",
      items: [
        { id: "a", name: "Apple" },
        { id: "b", name: "Banana" },
      ],
    },
    {
      name: "Veggies",
      items: [
        { id: "c", name: "Carrot" },
        { id: "d", name: "Daikon" },
      ],
    },
  ];

  return (
    <OwnerShim mode="single" onToggle={() => {}}>
      {() => (
        <ListBox
          aria-label="Options"
          selectionMode="single"
          items={DATA}
          onSelectionChange={onSelectionChange}
        >
          {(group) => (
            <ListBox.Section aria-label={group.name} items={group.items}>
              {(item) => (
                <ListBox.Item
                  id={item.id}
                  textValue={item.name}
                  aria-label={item.name}
                >
                  <Label>{item.name}</Label>
                </ListBox.Item>
              )}
            </ListBox.Section>
          )}
        </ListBox>
      )}
    </OwnerShim>
  );
}

function MobileDisabledList() {
  const DATA = [
    { id: "1", name: "One", disabled: false },
    { id: "2", name: "Two", disabled: false },
    { id: "3", name: "Three", disabled: false },
  ];

  return (
    <OwnerShim
      mode="single"
      disabledKeys={["2"]}
      onToggle={() => {}}
    >
      {() => (
        <ListBox
          aria-label="Options"
          selectionMode="single"
          items={DATA}
          onSelectionChange={onSelectionChange}
        >
          {(item) => (
            <ListBox.Item
              id={item.id}
              textValue={item.name}
              aria-label={item.name}
              isDisabled={item.id === "1"}
            >
              <Label>{item.name}</Label>
            </ListBox.Item>
          )}
        </ListBox>
      )}
    </OwnerShim>
  );
}

function MobileFilterList() {
  return (
    <OwnerShim
      mode="single"
      withFilter
      onToggle={() => {}}
    >
      {() => (
        <ListBox
          aria-label="Options"
          selectionMode="single"
          items={MOBILE_ITEMS}
          onSelectionChange={onSelectionChange}
        >
          {(item) => (
            <ListBox.Item id={item.id} textValue={item.name} aria-label={item.name}>
              <Label>{item.name}</Label>
            </ListBox.Item>
          )}
        </ListBox>
      )}
    </OwnerShim>
  );
}

function MobilePagedList() {
  return (
    <OwnerShim mode="single" onToggle={() => {}}>
      {() => (
        <View class="h-40 w-64">
          <ListBox
            aria-label="Options"
            className="h-40 w-full"
            selectionMode="single"
            items={PAGED}
            onSelectionChange={onSelectionChange}
          >
            {(item, index) => (
              <If when={index < 3}>
                <ListBox.Item
                  id={item.id}
                  textValue={item.name}
                  aria-label={item.name}
                  className="h-10"
                >
                  <Label>{item.name}</Label>
                </ListBox.Item>
              </If>
            )}
          </ListBox>
        </View>
      )}
    </OwnerShim>
  );
}

/** M-013: `toListItemData` normalization and the getters a state consumes. */
function FDataProbe() {
  const results = [
    { id: "x" },
    { key: "k" },
    "plain",
    { textValue: "OnlyText" },
    { name: "ByName", items: [{ id: "in" }] },
    { children: [{ id: "c1" }] },
    undefined,
    { label: "Lab" },
    { id: "d1", isDisabled: true },
    { id: "d2", disabled: true },
  ].map((datum, index) => {
    const n = toListItemData(datum, index);
    return {
      key: n.key,
      textValue: n.textValue,
      disabled: n.disabled,
      children: n.children?.length ?? null,
    };
  });
  probe("data")(results);

  const g = listItemDataGetters();
  const state = createListState({
    dataSource: () => [
      { id: "s1", name: "Sec", items: [{ id: "i1", name: "Inner" }] },
      { id: "i2", name: "Outer", disabled: true },
      "prim",
    ],
    getKey: () => g.getKey,
    getTextValue: () => g.getTextValue,
    getDisabled: () => g.getDisabled,
    getSectionChildren: () => g.getSectionChildren,
  });
  probe("getters")(
    [...state.collection()].map((n) => ({
      type: n.type,
      key: n.key,
      textValue: n.textValue,
      disabled: n.disabled,
    })),
  );
  probe("import")({ data: true });

  return <Text>f-data</Text>;
}

/** M-014: `createRowRegistry` register/get/has/overwrite/unregister. */
function FRegistryProbe() {
  const registry = createRowRegistry<{ key: string; mark: number }>();
  const first = { key: "a", mark: 1 };
  const unregisterFirst = registry.register(first);
  const unregisterB = registry.register({ key: "b", mark: 2 });
  registry.register({ key: "a", mark: 3 });
  unregisterFirst();
  const keysBefore = registry.keys().join(",");
  const mark = registry.get("a")?.mark ?? -1;
  unregisterB();
  probe("registry")({
    size: registry.size(),
    keys: keysBefore,
    keysAfter: registry.keys().join(","),
    mark,
    hasA: registry.has("a"),
    hasB: registry.has("b"),
  });
  probe("import")({ registry: true });

  return <Text>f-registry</Text>;
}

function FCollectionFixture() {
  const which = param("which");

  return which === "registry" ? <FRegistryProbe /> : <FDataProbe />;
}

/* -------------------------------------------------------------------------------------------------
 * mobile B(项) cases: the press-feedback seam assertions (sheet §2 A-008)
 *
 * `b-item` mounts one items-driven single-select list whose row carries the
 * `events` sequence probe (down/up/press), the `layout` bounds probe (root
 * and row), the hover probes (`onHoverStart`/`onHoverEnd`/`onHoverChange`/
 * `onMouseEnter`/`onMouseLeave` under `hover=1`) and a `CtxProbe` child that
 * samples `PressableFeedbackContext` — `ctx-env`/`ctx-state`/`ctx-pressed`/
 * `ctx-channels`, the accordion/control-field convention.
 *
 * host.params: `scope` ("" = the host default pointer environment, "touch"
 * through `EnvironmentScope`), `density` ("compact" mounts
 * `EnvironmentScope density="compact"`), `narrow="1"` (a 24 pt wide row so
 * the seam computes a non-empty hitSlop — the `min-h-11` cell already lifts
 * the height under touch), `disabled="1"`, `hover="1"` (the row's hover
 * probes plus the render-prop `hov` marker), `overlay="highlight"` (a
 * caller-composed `<PressableFeedback.Highlight/>` inside the row — the
 * M-006 composition exit).
 * `b-action` is the `selectionMode="none"` baseline: `onAction` is the only
 * activation output.
 * -----------------------------------------------------------------------------------------------*/

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box: parent-relative origin and size, for geometry probes. */
function boxProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/** The live `PressableFeedbackContext` the `ctx-sample` button reads. */
let rowCtx: PressableFeedbackContextValue | null = null;

function CtxProbe() {
  const ctx = PressableFeedbackContext();
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");

  effect(() => {
    rowCtx = ctx;
  });

  effect(() => {
    reportEnv({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
    });
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        reportState({
          seamPressed: ctx.isPressed(),
          pressed,
          scale,
          origin: ctx.pressOrigin(),
          hitSlop: ctx.hitSlop() ?? null,
          bounds: ctx.bounds(),
          enabled: ctx.enabled(),
          allDisabled: ctx.isAllAnimationsDisabled(),
        });
      });
    });
  };

  effect(() => {
    const seam = ctx.isPressed();
    reportPressed({ seam });
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  return <Text>{ctx.isPressed() ? "seam-pressed" : "seam-idle"}</Text>;
}

/* On-demand channel read for the negative half: a gated press never raises
 * the seam's `isPressed` edge, so `ctx-state` alone cannot prove the channels
 * stayed at rest — `ctx-sample` samples them after the press instead. */
function sampleChannels() {
  const reportChannels = probe("ctx-channels");
  const c = rowCtx;
  if (c === null) {
    return;
  }
  void c.pressed.getValue().then((pressed) => {
    void c.scale.getValue().then((scale) => {
      reportChannels({
        seamPressed: c.isPressed(),
        pressed,
        scale,
        origin: c.pressOrigin(),
        hitSlop: c.hitSlop() ?? null,
        enabled: c.enabled(),
      });
    });
  });
}

function BItemCase() {
  const narrow = param("narrow") === "1";
  const disabled = param("disabled") === "1";
  const hover = param("hover") === "1";
  const overlay = param("overlay");

  return (
    <View class="w-64">
      <ListBox
        aria-label="Options"
        selectionMode="single"
        items={MOBILE_ITEMS.slice(0, 3)}
        onSelectionChange={onSelectionChange}
        onLayout={boxProbe("root")}
      >
        {(item) => (
          <ListBox.Item
            id={item.id}
            textValue={item.name}
            aria-label={item.name}
            isDisabled={disabled}
            style={narrow ? { width: 24 } : undefined}
            onPressDown={() => probe("events")("down")}
            onPressUp={() => probe("events")("up")}
            onPress={() => probe("events")("press")}
            onLayout={boxProbe(`row-${item.id}`)}
            onHoverStart={hover ? () => probe("hover")("start") : undefined}
            onHoverEnd={hover ? () => probe("hover")("end") : undefined}
            onHoverChange={
              hover ? (h) => probe("hover")({ kind: "change", value: h }) : undefined
            }
            onMouseEnter={hover ? () => probe("hover")("enter") : undefined}
            onMouseLeave={hover ? () => probe("hover")("leave") : undefined}
          >
            {(values) => [
              <View class="flex flex-row" onLayout={boxProbe(`pad-${item.id}`)}>
                <Label>{item.name}</Label>
                {hover ? (
                  <Text>{values.isHovered() ? "hov" : ""}</Text>
                ) : null}
              </View>,
              overlay === "highlight" ? (
                <PressableFeedback.Highlight testID="overlay" />
              ) : null,
              <CtxProbe />,
            ]}
          </ListBox.Item>
        )}
      </ListBox>
      <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
        <Text>ctx-sample</Text>
      </View>
    </View>
  );
}

function BActionCase() {
  return (
    <View class="w-64">
      <ListBox
        aria-label="File actions"
        selectionMode="none"
        items={MOBILE_ITEMS.slice(0, 2)}
        onAction={probe("onAction")}
        onSelectionChange={onSelectionChange}
      >
        {(item) => (
          <ListBox.Item id={item.id} textValue={item.name} aria-label={item.name}>
            <Label>{item.name}</Label>
          </ListBox.Item>
        )}
      </ListBox>
    </View>
  );
}

/* The default environment is the desktop-parity half; `scope="touch"` is the
 * injected mobile half and `density="compact"` the density preset (sheet
 * A-008/M-007). It wraps `Fixture` at the Root — `props.children` captures
 * its creation scope, so an `EnvironmentScope` built mid-tree inside
 * `Fixture` could not reach the cases (the disclosure/accordion convention). */
function Scoped(props: { children?: JSX.Element }) {
  const scope = param("scope");
  const density = param("density");

  return scope === "touch" || density === "compact" ? (
    <EnvironmentScope
      input={scope === "touch" ? "touch" : undefined}
      density={density === "compact" ? "compact" : undefined}
    >
      {props.children}
    </EnvironmentScope>
  ) : (
    <>{props.children}</>
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
      <PlainList
        mode="single"
        disabledBehavior="selection"
        disabledKeys={["2"]}
        action
      />
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

  if (name === "focus-ring") {
    return <FocusRingList />;
  }

  if (name === "press-up-label") {
    return <PressUpLabelList />;
  }

  if (name === "escape") {
    return (
      <PlainList
        mode="single"
        defaultSelectedKeys={new Set(["2"])}
        escapeKeyBehavior="clearSelection"
      />
    );
  }

  if (name === "escape-none") {
    return (
      <PlainList
        mode="single"
        defaultSelectedKeys={new Set(["2"])}
        escapeKeyBehavior="none"
      />
    );
  }

  if (name === "paged") {
    return <PagedList />;
  }

  if (name === "keyless-sections") {
    return <KeylessSections />;
  }

  if (name === "modified") {
    return <ModifiedList />;
  }

  if (name === "dynamic-items") {
    return <DynamicItems />;
  }

  if (name === "dynamic-children") {
    return <DynamicChildren />;
  }

  if (name === "empty-fill") {
    return <EmptyFill />;
  }

  if (name === "dynamic-replace") {
    return <DynamicReplace />;
  }

  /* f-collection cases (sheet §2 A-009) and the B(项) `b-*` cases: every
   * mobile-layer case lives here so `Scoped` at the Root wraps them all —
   * `scope=touch` injects the touch environment, `density=compact` the
   * preset; the seams read it identically. */
  const mobile = (() => {
    if (name === "m-items") {
      return <MobileItemsList mode="single" />;
    }

    if (name === "m-multi") {
      return <MobileItemsList mode="multiple" />;
    }

    if (name === "m-override") {
      return <MobileOverrideList />;
    }

    if (name === "m-orphan") {
      return <MobileOrphanList />;
    }

    if (name === "m-nokey") {
      return <MobileNoKeyList />;
    }

    if (name === "m-section") {
      return <MobileSectionList />;
    }

    if (name === "m-disabled") {
      return <MobileDisabledList />;
    }

    if (name === "m-filter") {
      return <MobileFilterList />;
    }

    if (name === "m-paged") {
      return <MobilePagedList />;
    }

    if (name === "f-collection") {
      return <FCollectionFixture />;
    }

    if (name === "b-item") {
      return <BItemCase />;
    }

    if (name === "b-action") {
      return <BActionCase />;
    }

    return undefined;
  })();

  if (mobile !== undefined) {
    return mobile;
  }

  return <PlainList mode="single" />;
}

function Root() {
  return (
    <Scoped>
      <Fixture />
    </Scoped>
  );
}

mount(Root);
