import { host, mount, signal, Text, View } from "nsh";
import { Description, FieldError, Label, ListBox, Select } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Select fixtures (port sheet 4b). Shared scenes cannot carry the
 * probes or the fixed controlled state these cases need, so every entry is a
 * named case selected with `host.params.case`.
 *
 * Markers, following the port sheet's tester contract:
 *   - the row label gets a `*` suffix while the row holds the list's focus, so
 *     `role:option[Two] >> text:Two*` identifies the highlighted row (the
 *     list root is the focus station; NSH has no activeElement query);
 *   - `ListBox.ItemIndicator` renders `✓` for a selected row, so
 *     `role:listbox >> text:✓` counts the selection;
 *   - the trigger records onFocus / onBlur, which is how "focus is back on the
 *     trigger" is read (`toHaveFocus` has no query).
 *
 * `aria-label` on every row keeps the accessible name stable while the marker
 * moves, so `role:option[Two]` still names the same row after focus changes.
 *
 * Cases (states = Florida / California / Texas; items = One / Two / Three):
 *   states              single, Label State, no default, official callbacks
 *   states-items        the same through `items` on ListBox (T-002)
 *   states-plain        alias callbacks (onChange), no ClearButton, no default
 *   states-plain-selected  alias, no ClearButton, default California (T-016)
 *   states-clear        alias, ClearButton, default California
 *   states-clear-empty  alias, ClearButton, empty (T-010)
 *   states-custom-icon  ClearButton with a Text child (T-013)
 *   states-default      default California, no ClearButton (T-021 … T-025)
 *   states-controlled   `value="texas"` alias, records only (T-004)
 *   states-disabled     root isDisabled, default California, ClearButton (T-005, T-011)
 *   states-trigger-disabled  Trigger isDisabled, default California, ClearButton (T-012)
 *   states-invalid      Label + Description + FieldError, isInvalid (T-006)
 *   items               single, Label Label, placeholder Placeholder (T-029 …)
 *   items-open          isOpen held true (T-045, T-050)
 *   items-default-open  defaultOpen (T-046, T-051)
 *   items-default-two   defaultSelectedKey "2" (T-066, T-069)
 *   items-disallow-empty  default "2" + disallowEmptySelection (T-069)
 *   items-controlled    selectedKey "2" held (T-064)
 *   items-controlled-clear  a parent-owned "2" that ignores selection changes but
 *                       honors the clear (T-065)
 *   items-disabled-keys root disabledKeys ["2"] (T-067)
 *   items-multiple      multiple, empty (T-071, T-074)
 *   items-multiple-default  multiple, default {"1","2"} (T-072, T-075)
 *   items-multiple-controlled  multiple, selectedKeys {"1","2"} (T-073)
 *   items-four          One … Four (T-068, T-076 … T-078)
 *   items-disabled      root isDisabled (T-082, T-083)
 *   items-aria-label    aria-label="foo", no visible Label (T-054)
 *   items-description   Label + Description (T-057)
 *   items-invalid       Label + FieldError, isInvalid (T-058)
 *   items-outside       items plus a pressable `outside` view (T-048)
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

type ItemData = { id: string; name: string };

const STATES: ItemData[] = [
  { id: "florida", name: "Florida" },
  { id: "california", name: "California" },
  { id: "texas", name: "Texas" },
];

const ITEMS: ItemData[] = [
  { id: "1", name: "One" },
  { id: "2", name: "Two" },
  { id: "3", name: "Three" },
];

const ITEMS_FOUR: ItemData[] = [
  { id: "1", name: "One" },
  { id: "2", name: "Two" },
  { id: "3", name: "Three" },
  { id: "4", name: "Four" },
];

/** A single selection key, the `"all"` sentinel or a list of keys, as JSON. */
function normalizeSelection(value: unknown, multiple: boolean): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (value === "all") {
    return "all";
  }

  if (multiple) {
    return Array.isArray(value)
      ? value.map(String)
      : Array.from(value as Iterable<unknown>).map(String);
  }

  return String(value);
}

/* -------------------------------------------------------------------------------------------------
 * Rows
 * -----------------------------------------------------------------------------------------------*/

function Row(props: { item: ItemData }) {
  return (
    <ListBox.Item
      id={props.item.id}
      textValue={props.item.name}
      aria-label={props.item.name}
    >
      {(values) => [
        <Text>{values.isFocused() ? `${props.item.name}*` : props.item.name}</Text>,
        <ListBox.ItemIndicator>
          {(indicator) => <Text>{indicator.isSelected() ? "✓" : ""}</Text>}
        </ListBox.ItemIndicator>,
      ]}
    </ListBox.Item>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Case
 * -----------------------------------------------------------------------------------------------*/

type CaseProps = {
  data: ItemData[];
  placeholder: string;
  label?: string;
  ariaLabel?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  clear?: boolean;
  customIcon?: boolean;
  multiple?: boolean;
  defaultKey?: string;
  defaultKeys?: string[];
  valueKey?: string;
  selectedKey?: string | null;
  selectedKeys?: string[];
  disabled?: boolean;
  triggerDisabled?: boolean;
  disabledKeys?: string[];
  disallowEmpty?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  itemsProp?: boolean;
  alias?: boolean;
  outside?: boolean;
  /** Called with the raw selection payload, after the probe, for write-back cases. */
  onSelection?: (value: unknown) => void;
};

function Case(props: CaseProps) {
  const recordSelection = (value: unknown) => {
    probe("selectionChange")(normalizeSelection(value, props.multiple === true));
    props.onSelection?.(value);
  };

  return (
    <View class="w-64 items-start gap-2">
      <Select
        // A ClearButton makes the trigger's centre land inside its 24pt hit
        // area when the root shrink-wraps, so the root takes the width
        // HeroUI's own WithClearButton story sets (`w-[256px]`).
        className={props.clear ? "w-[256px]" : undefined}
        placeholder={props.placeholder}
        aria-label={props.ariaLabel}
        selectionMode={props.multiple ? "multiple" : "single"}
        isDisabled={props.disabled}
        isInvalid={props.invalid}
        disabledKeys={props.disabledKeys}
        disallowEmptySelection={props.disallowEmpty}
        defaultOpen={props.defaultOpen}
        isOpen={props.open}
        defaultSelectedKey={props.multiple ? undefined : props.defaultKey}
        defaultSelectedKeys={props.multiple ? props.defaultKeys : undefined}
        selectedKey={
          props.multiple || props.alias ? undefined : props.selectedKey
        }
        selectedKeys={props.multiple ? props.selectedKeys : undefined}
        value={props.alias && !props.multiple ? props.valueKey : undefined}
        onSelectionChange={props.alias ? undefined : recordSelection}
        onChange={props.alias ? recordSelection : undefined}
        onClear={probe("clear")}
        onOpenChange={probe("openChange")}
      >
        {props.label ? <Label>{props.label}</Label> : null}
        <Select.Trigger
          testID="select-trigger"
          isDisabled={props.triggerDisabled}
          onFocus={probe("triggerFocus")}
          onBlur={probe("triggerBlur")}
        >
          <Select.Value />
          {props.clear ? (
            <Select.ClearButton testID="select-clear-button">
              {props.customIcon ? <Text>×</Text> : undefined}
            </Select.ClearButton>
          ) : null}
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox onFocus={probe("listFocus")} items={props.itemsProp ? props.data : undefined}>
            {props.itemsProp
              ? (item: ItemData) => <Row item={item} />
              : props.data.map((item) => <Row item={item} />)}
          </ListBox>
        </Select.Popover>
        {props.description ? <Description>{props.description}</Description> : null}
        {props.error ? <FieldError>{props.error}</FieldError> : null}
      </Select>
      {props.outside ? (
        <View testID="outside" role="button" onPress={() => undefined}>
          <Text>Outside</Text>
        </View>
      ) : null}
    </View>
  );
}

function ControlledClear() {
  const selected = signal<string | null>("2");

  return (
    <Case
      data={ITEMS}
      placeholder="Placeholder"
      label="Label"
      clear
      selectedKey={selected()}
      onSelection={(value) => {
        // The parent owns the value: it ignores the selection change but
        // honors the clear, which is what Kobalte's external button does.
        if (value === null) {
          selected.set(null);
        }
      }}
    />
  );
}

const STATES_CASE: CaseProps = { data: STATES, placeholder: "Select one" };
const ITEMS_CASE: CaseProps = { data: ITEMS, placeholder: "Placeholder" };
const ITEMS_FOUR_CASE: CaseProps = { data: ITEMS_FOUR, placeholder: "Placeholder" };

function Fixture() {
  const name = String(host.params.case ?? "states");

  if (name === "states") {
    return <Case {...STATES_CASE} label="State" />;
  }

  if (name === "states-items") {
    return <Case {...STATES_CASE} label="State" alias itemsProp />;
  }

  if (name === "states-plain") {
    return <Case {...STATES_CASE} label="State" alias />;
  }

  if (name === "states-plain-selected") {
    return <Case {...STATES_CASE} defaultKey="california" label="State" alias />;
  }

  if (name === "states-clear") {
    return (
      <Case
        {...STATES_CASE}
        clear
        defaultKey="california"
        label="State"
        alias
      />
    );
  }

  if (name === "states-clear-empty") {
    return <Case {...STATES_CASE} clear label="State" alias />;
  }

  if (name === "states-custom-icon") {
    return (
      <Case
        {...STATES_CASE}
        clear
        customIcon
        defaultKey="california"
        label="State"
      />
    );
  }

  if (name === "states-default") {
    return <Case {...STATES_CASE} defaultKey="california" label="State" />;
  }

  if (name === "states-controlled") {
    return (
      <Case {...STATES_CASE} label="State" alias valueKey="texas" />
    );
  }

  if (name === "states-disabled") {
    return (
      <Case
        {...STATES_CASE}
        clear
        defaultKey="california"
        disabled
        label="State"
        alias
      />
    );
  }

  if (name === "states-trigger-disabled") {
    return (
      <Case
        {...STATES_CASE}
        clear
        defaultKey="california"
        label="State"
        triggerDisabled
        alias
      />
    );
  }

  if (name === "states-invalid") {
    return (
      <Case
        {...STATES_CASE}
        description="Description"
        error="Please choose a state"
        invalid
        label="State"
      />
    );
  }

  if (name === "items") {
    return <Case {...ITEMS_CASE} label="Label" />;
  }

  if (name === "items-open") {
    return <Case {...ITEMS_CASE} label="Label" open />;
  }

  if (name === "items-default-open") {
    return <Case {...ITEMS_CASE} defaultOpen label="Label" />;
  }

  if (name === "items-default-two") {
    return <Case {...ITEMS_CASE} defaultKey="2" label="Label" />;
  }

  if (name === "items-disallow-empty") {
    return <Case {...ITEMS_CASE} defaultKey="2" disallowEmpty label="Label" />;
  }

  if (name === "items-controlled") {
    return <Case {...ITEMS_CASE} label="Label" selectedKey="2" />;
  }

  if (name === "items-controlled-clear") {
    return <ControlledClear />;
  }

  if (name === "items-disabled-keys") {
    return <Case {...ITEMS_CASE} disabledKeys={["2"]} label="Label" />;
  }

  if (name === "items-multiple") {
    return <Case {...ITEMS_CASE} label="Label" multiple />;
  }

  if (name === "items-multiple-default") {
    return (
      <Case
        {...ITEMS_CASE}
        defaultKeys={["1", "2"]}
        label="Label"
        multiple
      />
    );
  }

  if (name === "items-multiple-controlled") {
    return (
      <Case
        {...ITEMS_CASE}
        label="Label"
        multiple
        selectedKeys={["1", "2"]}
      />
    );
  }

  if (name === "items-four") {
    return <Case {...ITEMS_FOUR_CASE} label="Label" />;
  }

  if (name === "items-disabled") {
    return <Case {...ITEMS_CASE} disabled label="Label" />;
  }

  if (name === "items-aria-label") {
    return <Case {...ITEMS_CASE} ariaLabel="foo" />;
  }

  if (name === "items-description") {
    return <Case {...ITEMS_CASE} description="Description" label="Label" />;
  }

  if (name === "items-invalid") {
    return (
      <Case {...ITEMS_CASE} error="ErrorMessage" invalid label="Label" />
    );
  }

  if (name === "items-outside") {
    return <Case {...ITEMS_CASE} label="Label" outside />;
  }

  return <Case {...STATES_CASE} label="State" />;
}

mount(Fixture);
