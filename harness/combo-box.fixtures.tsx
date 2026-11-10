import { host, mount, signal, Text, View } from "nsh";
import { Dialog } from "nsh/base";
import {
  Button,
  ComboBox,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
} from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only ComboBox fixtures (port sheet 4b). Shared scenes cannot carry the
 * probes, the fixed controlled state or the outside press these cases need, so
 * every entry is a named case selected with `host.params.case`.
 *
 * Markers, following the port sheet's tester contract:
 *   - the row label gets a `*` suffix while the row holds the list's virtual
 *     focus, so `role:option[Dog] >> text:Dog*` identifies the highlighted row
 *     (NSH has no activeElement query; the input keeps the real focus);
 *   - `ListBox.ItemIndicator` renders `✓` for a selected row, so
 *     `role:listbox >> text:✓` counts the selection;
 *   - the input records onFocus / onBlur and the trigger its own, which is how
 *     "focus is back on the input" is read (`toHaveFocus` has no query).
 *
 * `aria-label` on every row keeps the accessible name stable while the marker
 * moves, so `role:option[Two]` still names the same row after focus changes.
 *
 * Cases:
 *   log               Cat / Dog / Panda, Label Favorite Animal (T-001 … T-003, T-039 …)
 *   default-key       the same with defaultValue "cat" (T-005, T-031)
 *   controlled-key    One / Two / Three, value "2", records only (T-044)
 *   default-two       One / Two / Three, defaultValue "2" (T-045, T-047)
 *   manual            One / Two / Three, menuTrigger "manual" (T-022 … T-026, T-029)
 *   multiple-log      multiple, empty, Value (T-048)
 *   multiple-default  multiple, defaultValue {"1","2"}, Value (T-049, T-051)
 *   multiple-controlled  multiple, value {"1","2"}, Value (T-050)
 *   disabled          root isDisabled (T-004, T-055, T-056)
 *   disabled-keys     root disabledKeys {"2"} (T-046)
 *   invalid           Label + Description + FieldError (T-006)
 *   error-message     Label + Description + FieldError "ErrorMessage" (T-038)
 *   label-description Label + placeholder Placeholder + Description (T-013, T-034, T-037)
 *   custom-indicator  Trigger with a Text child (screenshots / R-019)
 *   custom-value      allowsCustomValue (section 2 commits)
 *   filter-contains   Apple / Banana / Blueberry / Grapes / Pineapple (T-059)
 *   filter-custom     defaultFilter matches the prefix only
 *   items             items on the root + function children + Value
 *   default-items     defaultItems on the root + function children
 *   empty             typing to an empty collection closes the popover
 *   tab-handoff       two comboboxes and a Submit button (T-010)
 *   items-40          forty rows and a Continue button (T-012)
 *   outside           the animals plus an outside view above the field (T-030)
 *   modal             a ComboBox inside an open nsh/base Dialog (T-011)
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

type ItemData = { id: string; name: string };

const PETS: ItemData[] = [
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "panda", name: "Panda" },
];

const ITEMS: ItemData[] = [
  { id: "1", name: "One" },
  { id: "2", name: "Two" },
  { id: "3", name: "Three" },
];

const FRUIT: ItemData[] = [
  { id: "Apple", name: "Apple" },
  { id: "Banana", name: "Banana" },
  { id: "Blueberry", name: "Blueberry" },
  { id: "Grapes", name: "Grapes" },
  { id: "Pineapple", name: "Pineapple" },
];

const FORTY: ItemData[] = Array.from({ length: 40 }, (_, index) => ({
  id: `animal-${index}`,
  name: `Animal ${index}`,
}));

/** A single key, or a list of keys, as JSON, so the probe payload stays readable. */
function normalizeSelection(value: unknown, multiple: boolean): unknown {
  if (value === null || value === undefined) {
    return null;
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
    <ListBox.Item id={props.item.id} textValue={props.item.name} aria-label={props.item.name}>
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
 * A ComboBox case
 * -----------------------------------------------------------------------------------------------*/

type ComboProps = {
  items: ItemData[];
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  defaultKey?: string;
  valueKey?: string;
  defaultKeys?: string[];
  values?: string[];
  disabledKeys?: string[];
  menuTrigger?: "focus" | "input" | "manual";
  allowsCustomValue?: boolean;
  allowsEmpty?: boolean;
  defaultFilter?: (text: string, inputValue: string) => boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  customIndicator?: boolean;
  showValue?: boolean;
  itemsProp?: boolean;
  defaultItems?: boolean;
  outside?: boolean;
};

function Combo(props: ComboProps) {
  return (
    <View class="w-[256px] items-start gap-2">
      {/* Above the field, so the press target stays outside the popover rectangle. */}
      {props.outside ? (
        <View testID="outside" role="button" onPress={() => undefined}>
          <Text>Outside</Text>
        </View>
      ) : null}
      <ComboBox
        className="w-[256px]"
        selectionMode={props.multiple ? "multiple" : "single"}
        isDisabled={props.disabled}
        isInvalid={props.invalid}
        disabledKeys={props.disabledKeys}
        menuTrigger={props.menuTrigger}
        allowsCustomValue={props.allowsCustomValue}
        allowsEmptyCollection={props.allowsEmpty}
        defaultFilter={props.defaultFilter}
        items={props.itemsProp ? props.items : undefined}
        defaultItems={props.defaultItems ? props.items : undefined}
        defaultValue={props.multiple ? props.defaultKeys : props.defaultKey}
        value={props.multiple ? props.values : props.valueKey}
        inputValue={props.inputValue}
        onInputChange={(value: string) => {
          probe("inputChange")(value);
          props.onInputChange?.(value);
        }}
        onChange={(value: unknown) => probe("change")(normalizeSelection(value, props.multiple === true))}
        onOpenChange={(...args: unknown[]) => probe("openChange")(...args)}
      >
        <Label>{props.label ?? "Favorite Animal"}</Label>
        <ComboBox.InputGroup>
          <Input
            testID="combo-box-input"
            placeholder={props.placeholder ?? "Search animals..."}
            onFocus={probe("inputFocus")}
            onBlur={probe("inputBlur")}
          />
          <ComboBox.Trigger
            testID="combo-box-trigger"
            onFocus={probe("triggerFocus")}
            onBlur={probe("triggerBlur")}
          >
            {props.customIndicator ? <Text>⇅</Text> : undefined}
          </ComboBox.Trigger>
        </ComboBox.InputGroup>
        {props.showValue ? <ComboBox.Value placeholder="No animals selected" /> : null}
        <ComboBox.Popover>
          <ListBox>
            {props.itemsProp || props.defaultItems
              ? (item: ItemData) => <Row item={item} />
              : props.items.map((item) => <Row item={item} />)}
          </ListBox>
        </ComboBox.Popover>
        {props.description ? <Description>{props.description}</Description> : null}
        {props.error ? <FieldError>{props.error}</FieldError> : null}
      </ComboBox>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases that place more than one ComboBox
 * -----------------------------------------------------------------------------------------------*/

function TabHandoffCase() {
  return (
    <View class="w-64 items-start gap-4 p-4">
      <ComboBox className="w-[256px]">
        <Label>First Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {PETS.map((item) => (
              <Row item={item} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>

      <ComboBox className="w-[256px]" onChange={(value: unknown) => probe("change")(normalizeSelection(value, false))}>
        <Label>Second Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." onFocus={probe("secondInputFocus")} />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {PETS.map((item) => (
              <Row item={item} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>

      <Button onFocus={probe("submitFocus")}>Submit</Button>
    </View>
  );
}

function FortyCase() {
  return (
    <View class="w-64 items-start gap-4 p-4">
      <Combo items={FORTY} placeholder="Search animals..." />
      <Button onFocus={probe("submitFocus")}>Continue</Button>
    </View>
  );
}

function ModalCase() {
  const opened = signal(false);

  return (
    <View class="items-start gap-2 p-4">
      <Button onPress={() => opened.set(true)}>Open form</Button>
      <Dialog
        open={opened()}
        onOpenChange={(event: { open: boolean }) => {
          if (!event.open) {
            opened.set(false);
          }
        }}
      >
        <View class="items-start gap-2 p-4">
          <Text>Choose an animal</Text>
          <Combo items={PETS} />
          <Button onPress={() => opened.set(false)}>Done</Button>
        </View>
      </Dialog>
    </View>
  );
}

function FilterCustomCase() {
  const prefix = (text: string, inputValue: string) => {
    if (!inputValue) {
      return true;
    }

    return text.toLowerCase().startsWith(inputValue.toLowerCase());
  };

  return <Combo defaultFilter={prefix} items={PETS} placeholder="Search animals..." />;
}

function AsyncInputCase() {
  const text = signal("");

  return (
    <View class="w-[256px] items-start gap-2">
      <Combo
        allowsEmpty
        inputValue={text()}
        items={PETS}
        onInputChange={(value) => text.set(value)}
        placeholder="Type to search..."
      />
      <Text>{`input: ${text()}`}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Case selector
 * -----------------------------------------------------------------------------------------------*/

function Case() {
  const name = String(host.params.case ?? "log");

  if (name === "default-key") {
    return <Combo defaultKey="cat" items={PETS} />;
  }

  if (name === "controlled-key") {
    return <Combo items={ITEMS} label="Label" valueKey="2" />;
  }

  if (name === "default-two") {
    return <Combo defaultKey="2" items={ITEMS} label="Label" placeholder="Placeholder" />;
  }

  if (name === "manual") {
    return <Combo items={ITEMS} label="Label" menuTrigger="manual" placeholder="Placeholder" />;
  }

  if (name === "multiple-log") {
    return (
      <Combo items={ITEMS} label="Label" multiple placeholder="Placeholder" showValue />
    );
  }

  if (name === "multiple-default") {
    return (
      <Combo
        defaultKeys={["1", "2"]}
        items={ITEMS}
        label="Label"
        multiple
        placeholder="Placeholder"
        showValue
      />
    );
  }

  if (name === "multiple-controlled") {
    return (
      <Combo
        items={ITEMS}
        label="Label"
        multiple
        placeholder="Placeholder"
        showValue
        values={["1", "2"]}
      />
    );
  }

  if (name === "disabled") {
    return <Combo disabled items={PETS} />;
  }

  if (name === "disabled-keys") {
    return <Combo disabledKeys={["2"]} items={ITEMS} label="Label" placeholder="Placeholder" />;
  }

  if (name === "invalid") {
    return (
      <Combo
        description="Description"
        error="Please choose an animal"
        invalid
        items={PETS}
      />
    );
  }

  if (name === "error-message") {
    return (
      <Combo
        description="Description"
        error="ErrorMessage"
        invalid
        items={ITEMS}
        label="Label"
        placeholder="Placeholder"
      />
    );
  }

  if (name === "label-description") {
    return (
      <Combo
        description="Description"
        items={ITEMS}
        label="Label"
        placeholder="Placeholder"
      />
    );
  }

  if (name === "custom-indicator") {
    return <Combo customIndicator items={PETS} />;
  }

  if (name === "custom-value") {
    return <Combo allowsCustomValue items={PETS} />;
  }

  if (name === "filter-contains") {
    return <Combo items={FRUIT} placeholder="Search fruit..." />;
  }

  if (name === "filter-custom") {
    return <FilterCustomCase />;
  }

  if (name === "items") {
    return <Combo items={ITEMS} itemsProp label="Label" placeholder="Placeholder" showValue />;
  }

  if (name === "default-items") {
    return (
      <Combo defaultItems items={ITEMS} label="Label" placeholder="Placeholder" showValue />
    );
  }

  if (name === "empty") {
    return <Combo items={PETS} />;
  }

  if (name === "async-input") {
    return <AsyncInputCase />;
  }

  if (name === "tab-handoff") {
    return <TabHandoffCase />;
  }

  if (name === "items-40") {
    return <FortyCase />;
  }

  if (name === "outside") {
    return <Combo items={PETS} outside />;
  }

  if (name === "modal") {
    return <ModalCase />;
  }

  return <Combo items={PETS} />;
}

mount(Case);
