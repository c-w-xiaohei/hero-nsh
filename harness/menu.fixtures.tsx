import { host, mount, signal, Text, View } from "nsh";
import { Button, Description, Header, Label, Menu } from "@heroui/react";
import type { SelectionValue } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Menu unit (port sheet 4b).
 *
 * HeroUI's own test wraps the Menu in `MenuTrigger` + `Popover`; this unit has
 * neither (they belong to Dropdown), so a button and a conditionally mounted
 * Menu stand in for them, and `onClose` unmounts it. Every case is selected
 * with `host.params.case`:
 *
 *   log                trigger + Menu, three rows, action / selection / close
 *                      probes (T-001, T-002)
 *   escape             the same with autoFocus, action probe (T-003)
 *   section            Section + Header + two rows, action probe (T-004)
 *   single-log         single selection with probes and ✓ markers
 *   multiple-log       multiple selection with probes and ✓ markers
 *   controlled         the parent holds selectedKeys and ignores changes;
 *                      testID="force" replaces the selection from outside
 *   default-selected   single, defaultSelectedKeys = {2}
 *   group-selection    two Sections with their own single selection, to prove
 *                      the Section manager is independent of the Menu
 *   submenu            aria-haspopup / aria-expanded, the SubmenuIndicator and
 *                      a row that prints hasSubmenu / isOpen from render props
 *   danger-indicator   variant="danger" with the checkmark, the dot and the
 *                      submenu chevron
 *   disabled           disabledKeys = {2} plus one row with isDisabled
 *   empty              renderEmptyState
 *   typeahead          One / Two / Three, autoFocus, a `*` marker on the
 *                      focused row; the test supplies the manual clock
 *   items              the `items` prop with a function child
 *   idless             two static items with no id / value / textValue, whose
 *                      keys must still differ (regression X-001)
 *   keyboard-close     autoFocus, selectionMode from `params.mode`, onClose
 *                      and onAction probes only (regression X-002)
 *
 * Rows print `✓` from `Menu.ItemIndicator`'s render prop because the built-in
 * checkmark and dot carry no text and `nsh test` counts text (port sheet 4b).
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function selectionArgs(keys: "all" | Iterable<unknown>): unknown {
  return keys === "all" ? "all" : Array.from(keys);
}

function onSelectionChange(keys: "all" | Iterable<unknown>): void {
  probe("selectionChange")(selectionArgs(keys));
}

function sectionSelectionChange(keys: "all" | Iterable<unknown>): void {
  probe("sectionSelection")(selectionArgs(keys));
}

/* -------------------------------------------------------------------------------------------------
 * Rows
 * -----------------------------------------------------------------------------------------------*/

function Row(props: {
  id: string;
  label: string;
  marker?: string;
  variant?: "default" | "danger";
  disabled?: boolean;
  description?: string;
}) {
  return (
    <Menu.Item
      id={props.id}
      testID={props.marker ?? `item-${props.id}`}
      textValue={props.label}
      variant={props.variant}
      isDisabled={props.disabled}
    >
      <Menu.ItemIndicator>
        {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
      </Menu.ItemIndicator>
      <Label>{props.label}</Label>
      {props.description ? <Description>{props.description}</Description> : null}
    </Menu.Item>
  );
}

const ITEMS: { id: string; label: string }[] = [
  { id: "1", label: "One" },
  { id: "2", label: "Two" },
  { id: "3", label: "Three" },
];

function Rows() {
  return ITEMS.map((item) => <Row id={item.id} label={item.label} />);
}

/* -------------------------------------------------------------------------------------------------
 * A trigger that mounts the menu, the stand-in for MenuTrigger + Popover
 * -----------------------------------------------------------------------------------------------*/

function TriggeredCase(props: { autoFocus?: boolean }) {
  const opened = signal(false);

  return (
    <View class="w-64 items-start gap-2">
      <Button testID="menu-trigger" aria-label="Menu" onPress={() => opened.set(true)}>
        Actions
      </Button>
      <If when={opened()}>
        <Menu
          aria-label="Actions"
          autoFocus={props.autoFocus}
          onAction={probe("onAction")}
          onClose={() => {
            probe("onClose")();
            opened.set(false);
          }}
          onSelectionChange={onSelectionChange}
        >
          <Menu.Item id="new-file" textValue="New file">
            <Label>New file</Label>
          </Menu.Item>
          <Menu.Item id="copy-link" textValue="Copy link">
            <Label>Copy link</Label>
          </Menu.Item>
          <Menu.Item id="delete-file" textValue="Delete file">
            <Label>Delete file</Label>
          </Menu.Item>
        </Menu>
      </If>
    </View>
  );
}

function SectionCase() {
  return (
    <View class="w-64">
      <Menu aria-label="File actions" onAction={probe("onAction")}>
        <Menu.Section>
          <Header>File</Header>
          <Menu.Item id="new-file" textValue="New file">
            <Label>New file</Label>
          </Menu.Item>
          <Menu.Item id="copy-link" textValue="Copy link">
            <Label>Copy link</Label>
          </Menu.Item>
        </Menu.Section>
      </Menu>
    </View>
  );
}

function SelectionCase(props: { mode: "single" | "multiple" }) {
  return (
    <View class="w-64">
      <Menu
        aria-label="Options"
        selectionMode={props.mode}
        onSelectionChange={onSelectionChange}
      >
        <Rows />
      </Menu>
    </View>
  );
}

function ControlledCase() {
  const keys = signal<SelectionValue>(new Set(["1"]));

  return (
    <View class="w-64 items-start gap-2">
      <Menu
        aria-label="Options"
        selectionMode="single"
        selectedKeys={keys()}
        onSelectionChange={onSelectionChange}
      >
        <Rows />
      </Menu>
      <View testID="force" role="button" onPress={() => keys.set(new Set(["3"]))}>
        <Text>Force</Text>
      </View>
    </View>
  );
}

function DefaultSelectedCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" selectionMode="single" defaultSelectedKeys={new Set(["2"])}>
        <Rows />
      </Menu>
    </View>
  );
}

function GroupSelectionCase() {
  const styles = signal<SelectionValue>(new Set(["bold"]));
  const alignment = signal<SelectionValue>(new Set(["left"]));

  return (
    <View class="w-64">
      <Menu aria-label="Formatting">
        <Menu.Section
          selectedKeys={styles()}
          selectionMode="single"
          onSelectionChange={(keys) => {
            sectionSelectionChange(keys);
            styles.set(keys);
          }}
        >
          <Header>Text Style</Header>
          <Menu.Item id="bold" testID="item-bold" textValue="Bold">
            <Menu.ItemIndicator>
              {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
            </Menu.ItemIndicator>
            <Label>Bold</Label>
          </Menu.Item>
          <Menu.Item id="italic" testID="item-italic" textValue="Italic">
            <Menu.ItemIndicator>
              {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
            </Menu.ItemIndicator>
            <Label>Italic</Label>
          </Menu.Item>
        </Menu.Section>
        <Menu.Section
          selectedKeys={alignment()}
          selectionMode="single"
          onSelectionChange={(keys) => {
            sectionSelectionChange(keys);
            alignment.set(keys);
          }}
        >
          <Header>Text Alignment</Header>
          <Menu.Item id="left" testID="item-left" textValue="Left">
            <Menu.ItemIndicator>
              {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
            </Menu.ItemIndicator>
            <Label>Left</Label>
          </Menu.Item>
          <Menu.Item id="center" testID="item-center" textValue="Center">
            <Menu.ItemIndicator>
              {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
            </Menu.ItemIndicator>
            <Label>Center</Label>
          </Menu.Item>
        </Menu.Section>
      </Menu>
    </View>
  );
}

function SubmenuCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Share">
        <Menu.Item id="copy-link" textValue="Copy link">
          <Label>Copy link</Label>
        </Menu.Item>
        <Menu.Item
          id="share"
          textValue="Share"
          aria-expanded={true}
          aria-haspopup="menu"
        >
          <Label>Share</Label>
          <Menu.Item.SubmenuIndicator />
        </Menu.Item>
        <Menu.Item
          id="mail"
          textValue="Mail"
          aria-expanded={false}
          aria-haspopup="menu"
        >
          <Label>Mail</Label>
          <Menu.Item.SubmenuIndicator />
        </Menu.Item>
        <Menu.Item
          id="probe"
          textValue="Probe"
          aria-label="Probe"
          aria-expanded={true}
          aria-haspopup="menu"
        >
          {(values) => <Text>{`submenu=${values.hasSubmenu()} open=${values.isOpen()}`}</Text>}
        </Menu.Item>
      </Menu>
    </View>
  );
}

function DangerIndicatorCase() {
  return (
    <View class="w-64">
      <Menu
        aria-label="Danger"
        defaultSelectedKeys={new Set(["delete"])}
        selectionMode="single"
      >
        <Menu.Item id="delete" textValue="Delete" variant="danger">
          <Menu.ItemIndicator />
          <Label>Delete</Label>
        </Menu.Item>
        <Menu.Item id="move" textValue="Move" variant="danger">
          <Menu.ItemIndicator type="dot" />
          <Label>Move</Label>
        </Menu.Item>
        <Menu.Item
          id="share"
          textValue="Share"
          variant="danger"
          aria-expanded={false}
          aria-haspopup="menu"
        >
          <Menu.ItemIndicator />
          <Label>Share</Label>
          <Menu.Item.SubmenuIndicator />
        </Menu.Item>
      </Menu>
    </View>
  );
}

function DisabledCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" disabledKeys={["2"]} onAction={probe("onAction")}>
        <Row id="1" label="One" />
        <Row id="2" label="Two" />
        <Row id="3" label="Three" disabled />
      </Menu>
    </View>
  );
}

function EmptyCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" renderEmptyState={() => <Text>No actions</Text>} />
    </View>
  );
}

const DYNAMIC_ITEMS = [
  { id: "item-a", name: "Alpha" },
  { id: "item-b", name: "Beta" },
];

function ItemsCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Items" items={DYNAMIC_ITEMS} onAction={probe("onAction")}>
        {(item) => (
          <Menu.Item id={item.id} textValue={item.name} aria-label={item.name}>
            <Label>{item.name}</Label>
          </Menu.Item>
        )}
      </Menu>
    </View>
  );
}

const TYPEAHEAD_ITEMS = [
  { id: "1", label: "One" },
  { id: "2", label: "Two" },
  { id: "3", label: "Three" },
];

function TypeaheadCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" autoFocus>
        {TYPEAHEAD_ITEMS.map((item) => (
          <Menu.Item id={item.id} textValue={item.label} aria-label={item.label}>
            {(values) => <Text>{`${item.label}${values.isFocused() ? "*" : ""}`}</Text>}
          </Menu.Item>
        ))}
      </Menu>
    </View>
  );
}

/*
 * Regression X-001: two static items without an id, a value object or an index
 * must still get two different collection keys. Both rows print their own
 * selection marker under its own testID, so a shared key shows up as both rows
 * selected at once.
 */
function IdlessCase() {
  return (
    <View class="w-64">
      <Menu aria-label="Options" selectionMode="single">
        <Menu.Item testID="item-alpha" aria-label="Alpha">
          <Menu.ItemIndicator>
            {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
          </Menu.ItemIndicator>
          <Label>Alpha</Label>
        </Menu.Item>
        <Menu.Item testID="item-beta" aria-label="Beta">
          <Menu.ItemIndicator>
            {(values) => <Text>{values.isSelected() ? "✓" : ""}</Text>}
          </Menu.ItemIndicator>
          <Label>Beta</Label>
        </Menu.Item>
      </Menu>
    </View>
  );
}

/*
 * Regression X-002: the menu stays mounted after activation, so `onClose` is
 * counted instead of observed through an unmount, and `onAction` proves the key
 * did activate a row.
 */
function KeyboardCloseCase(props: { mode: "single" | "multiple" }) {
  return (
    <View class="w-64">
      <Menu
        aria-label="Close"
        autoFocus
        selectionMode={props.mode}
        onAction={probe("onAction")}
        onClose={probe("onClose")}
      >
        <Row id="1" label="One" />
        <Row id="2" label="Two" />
      </Menu>
    </View>
  );
}

function Case() {
  const name = String(host.params.case ?? "log");

  if (name === "log") {
    return <TriggeredCase />;
  }

  if (name === "escape") {
    return <TriggeredCase autoFocus />;
  }

  if (name === "section") {
    return <SectionCase />;
  }

  if (name === "single-log") {
    return <SelectionCase mode="single" />;
  }

  if (name === "multiple-log") {
    return <SelectionCase mode="multiple" />;
  }

  if (name === "controlled") {
    return <ControlledCase />;
  }

  if (name === "default-selected") {
    return <DefaultSelectedCase />;
  }

  if (name === "group-selection") {
    return <GroupSelectionCase />;
  }

  if (name === "submenu") {
    return <SubmenuCase />;
  }

  if (name === "danger-indicator") {
    return <DangerIndicatorCase />;
  }

  if (name === "disabled") {
    return <DisabledCase />;
  }

  if (name === "typeahead") {
    return <TypeaheadCase />;
  }

  if (name === "items") {
    return <ItemsCase />;
  }

  if (name === "idless") {
    return <IdlessCase />;
  }

  if (name === "keyboard-close") {
    return <KeyboardCloseCase mode={host.params.mode === "multiple" ? "multiple" : "single"} />;
  }

  if (name === "empty") {
    return <EmptyCase />;
  }

  return <TriggeredCase />;
}

mount(Case);
