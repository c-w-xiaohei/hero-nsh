import { signal, Text, View } from "nsh";
import {
  Button,
  Chip,
  Description,
  FieldError,
  Header,
  Label,
  ListBox,
  Separator,
  Select,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for Select, written with HeroUI's API only (SOP 3.3).
 *
 * Sources:
 *   select/default                  Default
 *   select/variants                 Variants
 *   select/full-width               FullWidth
 *   select/description              WithDescription
 *   select/multiple                 MultipleSelect
 *   select/sections                 WithSections
 *   select/disabled                 WithDisabledOptions (disabledKeys on the root)
 *   select/disabled-states          Disabled (root isDisabled, triggered and multiple)
 *   select/clear-button             WithClearButton
 *   select/custom-indicator         CustomIndicator
 *   select/required                 Required, without Form (another unit)
 *   select/invalid                  isInvalid + Description + FieldError, for the
 *                                   invalid field screenshots of port sheet T-006
 *   select/custom-value.split       CustomValue
 *   select/custom-value-multiple.split  CustomValueMultiple
 *   select/controlled               Controlled
 *   select/controlled-multiple      ControlledMultiple
 *   select/controlled-open          ControlledOpenState
 *
 * Split scenarios (SOP 3.3.3): the Value render prop takes booleans upstream
 * and accessors here (D17), so `custom-value*` call `isPlaceholder()` and
 * `defaultChildren()`. `state.selectedItems` is the flat facade from port sheet
 * section 1 (an array, not an accessor).
 *
 * Placeholders for units that have not landed in this worktree: Avatar is not
 * in src/components yet, so the user rows draw a plain round View with the
 * initial, and the custom value shows that same stand-in. Form belongs to
 * another unit, so `required` keeps only the field itself.
 */

const STATES = [
  { id: "florida", name: "Florida" },
  { id: "delaware", name: "Delaware" },
  { id: "california", name: "California" },
  { id: "texas", name: "Texas" },
  { id: "new-york", name: "New York" },
  { id: "washington", name: "Washington" },
];

const COUNTRIES = [
  { id: "argentina", name: "Argentina" },
  { id: "venezuela", name: "Venezuela" },
  { id: "japan", name: "Japan" },
  { id: "france", name: "France" },
  { id: "italy", name: "Italy" },
  { id: "spain", name: "Spain" },
  { id: "thailand", name: "Thailand" },
  { id: "new-zealand", name: "New Zealand" },
  { id: "iceland", name: "Iceland" },
];

function AvatarPlaceholder(props: { initial: string }) {
  return (
    <View class="size-4 items-center justify-center rounded-full bg-default">
      <Text class="text-xs text-default-foreground">{props.initial}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Default (story Default)
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <Select className="w-[256px]" placeholder="Select one">
        <Label>State</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STATES.map((state) => (
              <ListBox.Item id={state.id} textValue={state.name}>
                {state.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Variants (story Variants)
 * -----------------------------------------------------------------------------------------------*/

function Variants() {
  return (
    <Stage>
      <Select className="w-[256px]" placeholder="Select one" variant="primary">
        <Label>Primary variant</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="option1" textValue="Option 1">
              Option 1
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="option2" textValue="Option 2">
              Option 2
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
      <Select className="w-[256px]" placeholder="Select one" variant="secondary">
        <Label>Secondary variant</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="option1" textValue="Option 1">
              Option 1
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="option2" textValue="Option 2">
              Option 2
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * FullWidth (story FullWidth)
 * -----------------------------------------------------------------------------------------------*/

function FullWidth() {
  return (
    <Stage>
      <Select className="w-[400px]" fullWidth placeholder="Select one">
        <Label>State</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="florida" textValue="Florida">
              Florida
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="delaware" textValue="Delaware">
              Delaware
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="california" textValue="California">
              California
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDescription (story WithDescription)
 * -----------------------------------------------------------------------------------------------*/

function WithDescription() {
  return (
    <Stage>
      <Select className="w-[256px]" placeholder="Select one">
        <Label>State</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STATES.map((state) => (
              <ListBox.Item id={state.id} textValue={state.name}>
                {state.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        <Description>Select your state of residence</Description>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * MultipleSelect (story MultipleSelect)
 * -----------------------------------------------------------------------------------------------*/

function Multiple() {
  return (
    <Stage>
      <Select
        className="w-[256px]"
        placeholder="Select countries"
        selectionMode="multiple"
      >
        <Label>Countries to Visit</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox selectionMode="multiple">
            {COUNTRIES.map((country) => (
              <ListBox.Item id={country.id} textValue={country.name}>
                {country.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSections (story WithSections)
 * -----------------------------------------------------------------------------------------------*/

function Sections() {
  return (
    <Stage>
      <Select className="w-[256px]" placeholder="Select a country">
        <Label>Country</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Section>
              <Header>North America</Header>
              <ListBox.Item id="usa" textValue="United States">
                United States
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="canada" textValue="Canada">
                Canada
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="mexico" textValue="Mexico">
                Mexico
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox.Section>
            <Separator isDecorative />
            <ListBox.Section>
              <Header>Europe</Header>
              <ListBox.Item id="uk" textValue="United Kingdom">
                United Kingdom
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="france" textValue="France">
                France
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="germany" textValue="Germany">
                Germany
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="spain" textValue="Spain">
                Spain
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="italy" textValue="Italy">
                Italy
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox.Section>
            <Separator isDecorative />
            <ListBox.Section>
              <Header>Asia</Header>
              <ListBox.Item id="japan" textValue="Japan">
                Japan
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="china" textValue="China">
                China
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="india" textValue="India">
                India
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="south-korea" textValue="South Korea">
                South Korea
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox.Section>
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDisabledOptions (story WithDisabledOptions): disabledKeys on the root
 * -----------------------------------------------------------------------------------------------*/

const ANIMALS = [
  { id: "dog", name: "Dog" },
  { id: "cat", name: "Cat" },
  { id: "bird", name: "Bird" },
  { id: "kangaroo", name: "Kangaroo" },
  { id: "elephant", name: "Elephant" },
  { id: "tiger", name: "Tiger" },
];

function Disabled() {
  return (
    <Stage>
      <Select
        className="w-[256px]"
        disabledKeys={["cat", "kangaroo"]}
        placeholder="Select an animal"
      >
        <Label>Animal</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <ListBox.Item id={animal.id} textValue={animal.name}>
                {animal.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Disabled (story Disabled): root isDisabled, single and multiple
 * -----------------------------------------------------------------------------------------------*/

function DisabledStates() {
  return (
    <Stage>
      <Select
        className="w-[256px]"
        defaultValue="california"
        isDisabled
        placeholder="Select one"
      >
        <Label>State</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="florida" textValue="Florida">
              Florida
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="california" textValue="California">
              California
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="texas" textValue="Texas">
              Texas
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
      <Select
        className="w-[256px]"
        defaultValue={["argentina", "japan", "france"]}
        isDisabled
        placeholder="Select countries"
        selectionMode="multiple"
      >
        <Label>Countries to Visit</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {COUNTRIES.map((country) => (
              <ListBox.Item id={country.id} textValue={country.name}>
                {country.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithClearButton (story WithClearButton)
 * -----------------------------------------------------------------------------------------------*/

function ClearButton() {
  return (
    <Stage>
      <Select className="w-[256px]" defaultValue="california" placeholder="Select one">
        <Label>State</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.ClearButton />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STATES.map((state) => (
              <ListBox.Item id={state.id} textValue={state.name}>
                {state.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CustomIndicator (story CustomIndicator)
 * -----------------------------------------------------------------------------------------------*/

function CustomIndicator() {
  return (
    <Stage>
      <Select className="w-[256px]" placeholder="Select one">
        <Label>State</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator className="size-3">
            <Text>⇅</Text>
          </Select.Indicator>
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STATES.map((state) => (
              <ListBox.Item id={state.id} textValue={state.name}>
                {state.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Required (story Required, without Form)
 * -----------------------------------------------------------------------------------------------*/

function Required() {
  return (
    <Stage>
      <Select className="w-[256px]" isRequired name="state" placeholder="Select one">
        <Label>State</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STATES.map((state) => (
              <ListBox.Item id={state.id} textValue={state.name}>
                {state.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        <FieldError />
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Invalid (serves the invalid field screenshots of port sheet T-006)
 * -----------------------------------------------------------------------------------------------*/

function Invalid() {
  return (
    <Stage>
      <Select className="w-[256px]" isInvalid placeholder="Select one">
        <Label>State</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STATES.map((state) => (
              <ListBox.Item id={state.id} textValue={state.name}>
                {state.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        <Description>Select your state of residence</Description>
        <FieldError>Please choose a state</FieldError>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CustomValue (story CustomValue), split: the Value render prop
 * -----------------------------------------------------------------------------------------------*/

const USERS = [
  { id: "1", name: "Bob", email: "bob@heroui.com", initial: "B" },
  { id: "2", name: "Fred", email: "fred@heroui.com", initial: "F" },
  { id: "3", name: "Martha", email: "martha@heroui.com", initial: "M" },
  { id: "4", name: "John", email: "john@heroui.com", initial: "J" },
  { id: "5", name: "Jane", email: "jane@heroui.com", initial: "J" },
];

function CustomValueSplit() {
  return (
    <Stage>
      <Select className="w-[256px]" placeholder="Select a user">
        <Label>User</Label>
        <Select.Trigger>
          <Select.Value>
            {({ defaultChildren, isPlaceholder, state }) => {
              if (isPlaceholder() || state.selectedItems.length === 0) {
                return defaultChildren();
              }

              const selectedItems = state.selectedItems;

              if (selectedItems.length > 1) {
                return <Text>{`${selectedItems.length} users selected`}</Text>;
              }

              const selectedItem = USERS.find((user) => user.id === selectedItems[0].key);

              if (!selectedItem) {
                return defaultChildren();
              }

              return (
                <View class="flex items-center gap-2">
                  <AvatarPlaceholder initial={selectedItem.initial} />
                  <Text>{selectedItem.name}</Text>
                </View>
              );
            }}
          </Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {USERS.map((user) => (
              <ListBox.Item id={user.id} textValue={user.name}>
                <AvatarPlaceholder initial={user.initial} />
                <View class="flex flex-col">
                  <Label>{user.name}</Label>
                  <Description>{user.email}</Description>
                </View>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CustomValueMultiple (story CustomValueMultiple), split: the Value render prop
 * -----------------------------------------------------------------------------------------------*/

function CustomValueMultipleSplit() {
  return (
    <Stage>
      <Select
        className="w-[256px]"
        defaultValue={["1", "2"]}
        placeholder="Select your teammates"
        selectionMode="multiple"
      >
        <Label>Users</Label>
        <Select.Trigger>
          <Select.Value className="flex flex-wrap gap-2">
            {({ defaultChildren, isPlaceholder, state }) => {
              if (isPlaceholder() || state.selectedItems.length === 0) {
                return defaultChildren();
              }

              return state.selectedItems.map((selectedItem) => {
                const user = USERS.find((entry) => entry.id === selectedItem.key);

                if (!user) {
                  return <Text>{selectedItem.key}</Text>;
                }

                return (
                  <Chip variant="soft">
                    <AvatarPlaceholder initial={user.initial} />
                    <Chip.Label>{user.name}</Chip.Label>
                  </Chip>
                );
              });
            }}
          </Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {USERS.map((user) => (
              <ListBox.Item id={user.id} textValue={user.name}>
                <AvatarPlaceholder initial={user.initial} />
                <View class="flex flex-col">
                  <Label>{user.name}</Label>
                  <Description>{user.email}</Description>
                </View>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Controlled (story Controlled)
 * -----------------------------------------------------------------------------------------------*/

function Controlled() {
  const state = signal<string | null>("california");

  return (
    <Stage>
      <Select
        className="w-[256px]"
        placeholder="Select a state"
        value={state()}
        onChange={(value: unknown) => state.set(value === null ? null : String(value))}
      >
        <Label>State (controlled)</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STATES.map((state_) => (
              <ListBox.Item id={state_.id} textValue={state_.name}>
                {state_.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ControlledMultiple (story ControlledMultiple)
 * -----------------------------------------------------------------------------------------------*/

function ControlledMultiple() {
  const selected = signal<string[]>(["california", "texas"]);

  return (
    <Stage>
      <Select
        className="w-[256px]"
        placeholder="Select states"
        selectionMode="multiple"
        value={selected()}
        onChange={(value: unknown) => selected.set(Array.from(value as Iterable<unknown>).map(String))}
      >
        <Label>States (controlled multiple)</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox selectionMode="multiple">
            {STATES.map((state) => (
              <ListBox.Item id={state.id} textValue={state.name}>
                {state.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ControlledOpenState (story ControlledOpenState)
 * -----------------------------------------------------------------------------------------------*/

function ControlledOpen() {
  const open = signal(false);

  return (
    <Stage>
      <Select
        className="w-[256px]"
        isOpen={open()}
        placeholder="Select one"
        onOpenChange={(isOpen: boolean) => open.set(isOpen)}
      >
        <Label>State</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {STATES.map((state) => (
              <ListBox.Item id={state.id} textValue={state.name}>
                {state.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <Button onPress={() => open.set(!open())}>
        {open() ? "Close" : "Open"} Select
      </Button>
    </Stage>
  );
}

export const selectScenarios: Record<string, Component> = {
  "select/default": Default,
  "select/variants": Variants,
  "select/full-width": FullWidth,
  "select/description": WithDescription,
  "select/multiple": Multiple,
  "select/sections": Sections,
  "select/disabled": Disabled,
  "select/disabled-states": DisabledStates,
  "select/clear-button": ClearButton,
  "select/custom-indicator": CustomIndicator,
  "select/required": Required,
  "select/invalid": Invalid,
  "select/custom-value.split": CustomValueSplit,
  "select/custom-value-multiple.split": CustomValueMultipleSplit,
  "select/controlled": Controlled,
  "select/controlled-multiple": ControlledMultiple,
  "select/controlled-open": ControlledOpen,
};
