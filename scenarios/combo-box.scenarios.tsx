import { signal, Text, View } from "nsh";
import {
  Chip,
  ComboBox,
  Description,
  FieldError,
  Header,
  Input,
  Label,
  ListBox,
  Separator,
  Spinner,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for ComboBox, written with HeroUI's API only (SOP 3.3).
 *
 * Sources:
 *   combo-box/default              Default
 *   combo-box/full-width           FullWidth
 *   combo-box/default-selected-key DefaultSelectedKey
 *   combo-box/description          WithDescription
 *   combo-box/sections             WithSections
 *   combo-box/disabled-options     WithDisabledOptions (disabledKeys on the root)
 *   combo-box/custom-indicator     CustomIndicator
 *   combo-box/required             Required, without Form (another unit)
 *   combo-box/custom-value         CustomValue
 *   combo-box/controlled           Controlled (deprecated selectedKey alias)
 *   combo-box/controlled-input     ControlledInputValue
 *   combo-box/async                AsynchronousLoading, fixed items + local Spinner
 *   combo-box/custom-filter        CustomFiltering
 *   combo-box/allows-custom-value  AllowsCustomValue
 *   combo-box/disabled             Disabled
 *   combo-box/menu-trigger         MenuTrigger (focus / input / manual)
 *   combo-box/multiple             MultipleSelection
 *   combo-box/multiple-controlled  MultipleSelectionControlled
 *   combo-box/multiple-tags.split  MultipleSelectionWithTags
 *
 * Split scenario (SOP 3.3.3): the `ComboBox.Value` render prop takes booleans and
 * an array upstream and accessors here (D17), so `multiple-tags.split` reads
 * `isPlaceholder()` and `selectedItems()` inside reactive tree constructs
 * (`<If>`, `<Each>`): the function body runs once, untracked, so a plain `if`
 * there would freeze the branch.
 *
 * Placeholders for units that have not landed in this worktree: Avatar is not in
 * src/components yet, so the user rows draw a plain round View with the initial.
 * Form belongs to another unit, so `required` keeps only the field itself. The
 * asynchronous story's empty and load-more states need `renderEmptyState` /
 * `ListBoxLoadMoreItem`, so the spinner stands beside the field instead.
 */

const ANIMALS = [
  { id: "aardvark", name: "Aardvark" },
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "kangaroo", name: "Kangaroo" },
  { id: "panda", name: "Panda" },
  { id: "snake", name: "Snake" },
];

const COUNTRIES = [
  { id: "usa", name: "United States" },
  { id: "canada", name: "Canada" },
  { id: "mexico", name: "Mexico" },
  { id: "uk", name: "United Kingdom" },
  { id: "france", name: "France" },
  { id: "germany", name: "Germany" },
  { id: "spain", name: "Spain" },
  { id: "italy", name: "Italy" },
  { id: "japan", name: "Japan" },
  { id: "china", name: "China" },
  { id: "india", name: "India" },
  { id: "south-korea", name: "South Korea" },
];

const USERS = [
  { id: "1", name: "Bob", email: "bob@heroui.com", initial: "B" },
  { id: "2", name: "Fred", email: "fred@heroui.com", initial: "F" },
  { id: "3", name: "Martha", email: "martha@heroui.com", initial: "M" },
  { id: "4", name: "John", email: "john@heroui.com", initial: "J" },
  { id: "5", name: "Jane", email: "jane@heroui.com", initial: "J" },
];

const CHARACTERS = [
  { id: "Luke Skywalker", name: "Luke Skywalker" },
  { id: "C-3PO", name: "C-3PO" },
  { id: "R2-D2", name: "R2-D2" },
  { id: "Darth Vader", name: "Darth Vader" },
  { id: "Leia Organa", name: "Leia Organa" },
  { id: "Owen Lars", name: "Owen Lars" },
];

/** Stands in for Avatar until that unit lands in this worktree. */
function AvatarPlaceholder(props: { initial: string }) {
  return (
    <View class="size-4 items-center justify-center rounded-full bg-default">
      <Text class="text-xs text-default-foreground">{props.initial}</Text>
    </View>
  );
}

function AnimalRow(props: { animal: { id: string; name: string } }) {
  return (
    <ListBox.Item id={props.animal.id} textValue={props.animal.name}>
      {props.animal.name}
      <ListBox.ItemIndicator />
    </ListBox.Item>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Default (story Default)
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <ComboBox className="w-[256px]">
        <Label>Favorite Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * FullWidth (story FullWidth)
 * -----------------------------------------------------------------------------------------------*/

function FullWidth() {
  return (
    <Stage>
      <View class="w-[400px] gap-4">
        <ComboBox fullWidth>
          <Label>Favorite Animal</Label>
          <ComboBox.InputGroup>
            <Input placeholder="Search animals..." />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              {ANIMALS.slice(0, 3).map((animal) => (
                <AnimalRow animal={animal} />
              ))}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>
        <ComboBox fullWidth isRequired>
          <Label>Favorite Animal</Label>
          <ComboBox.InputGroup>
            <Input placeholder="Search animals..." />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              {ANIMALS.slice(0, 2).map((animal) => (
                <AnimalRow animal={animal} />
              ))}
            </ListBox>
          </ComboBox.Popover>
          <FieldError />
        </ComboBox>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * DefaultSelectedKey (story DefaultSelectedKey)
 * -----------------------------------------------------------------------------------------------*/

function DefaultSelectedKey() {
  return (
    <Stage>
      <ComboBox className="w-[256px]" defaultSelectedKey="cat">
        <Label>Favorite Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDescription (story WithDescription)
 * -----------------------------------------------------------------------------------------------*/

function WithDescription() {
  return (
    <Stage>
      <ComboBox className="w-[256px]">
        <Label>Favorite Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
        <Description>Search for your favorite animal</Description>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSections (story WithSections)
 * -----------------------------------------------------------------------------------------------*/

function Sections() {
  return (
    <Stage>
      <ComboBox className="w-[256px]">
        <Label>Country</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search countries..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            <ListBox.Section>
              <Header>North America</Header>
              {COUNTRIES.slice(0, 3).map((country) => (
                <AnimalRow animal={country} />
              ))}
            </ListBox.Section>
            <Separator isDecorative />
            <ListBox.Section>
              <Header>Europe</Header>
              {COUNTRIES.slice(3, 8).map((country) => (
                <AnimalRow animal={country} />
              ))}
            </ListBox.Section>
            <Separator isDecorative />
            <ListBox.Section>
              <Header>Asia</Header>
              {COUNTRIES.slice(8).map((country) => (
                <AnimalRow animal={country} />
              ))}
            </ListBox.Section>
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDisabledOptions (story WithDisabledOptions): disabledKeys on the root
 * -----------------------------------------------------------------------------------------------*/

function DisabledOptions() {
  return (
    <Stage>
      <ComboBox className="w-[256px]" disabledKeys={["cat", "kangaroo"]}>
        <Label>Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CustomIndicator (story CustomIndicator)
 * -----------------------------------------------------------------------------------------------*/

function CustomIndicator() {
  return (
    <Stage>
      <ComboBox className="w-[256px]">
        <Label>Favorite Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger>
            <Text>⇅</Text>
          </ComboBox.Trigger>
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Required (story Required, without Form)
 * -----------------------------------------------------------------------------------------------*/

function Required() {
  return (
    <Stage>
      <ComboBox className="w-[256px]" isRequired name="animal">
        <Label>Favorite Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
        <FieldError />
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CustomValue (story CustomValue)
 * -----------------------------------------------------------------------------------------------*/

function CustomValue() {
  return (
    <Stage>
      <ComboBox className="w-[256px]">
        <Label>User</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search users..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
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
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Controlled (story Controlled): the deprecated selectedKey alias
 * -----------------------------------------------------------------------------------------------*/

function Controlled() {
  const key = signal<string | null>("cat");

  return (
    <Stage>
      <ComboBox
        className="w-[256px]"
        selectedKey={key()}
        onSelectionChange={(value: unknown) =>
          key.set(value === null ? null : String(value))
        }
      >
        <Label>Animal (controlled)</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      <Text>{`Selected: ${key() ?? "None"}`}</Text>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ControlledInputValue (story ControlledInputValue)
 * -----------------------------------------------------------------------------------------------*/

function ControlledInput() {
  const text = signal("");

  return (
    <Stage>
      <ComboBox
        className="w-[256px]"
        inputValue={text()}
        onInputChange={(value: string) => text.set(value)}
      >
        <Label>Search (controlled input)</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Type to search..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      <Text>{`Input: ${text()}`}</Text>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * AsynchronousLoading (story AsynchronousLoading): fixed items + local Spinner
 * -----------------------------------------------------------------------------------------------*/

function Async() {
  const text = signal("");

  return (
    <Stage>
      <View class="items-start gap-2">
        <ComboBox
          allowsEmptyCollection
          className="w-[256px]"
          inputValue={text()}
          onInputChange={(value: string) => text.set(value)}
        >
          <Label>Pick a Character</Label>
          <ComboBox.InputGroup>
            <Input placeholder="Star Wars characters..." />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              {CHARACTERS.map((character) => (
                <AnimalRow animal={character} />
              ))}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>
        <View class="flex items-center gap-2">
          <Spinner size="sm" />
          <Text class="text-sm text-muted">Loading more...</Text>
        </View>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CustomFiltering (story CustomFiltering)
 * -----------------------------------------------------------------------------------------------*/

function CustomFilter() {
  return (
    <Stage>
      <ComboBox
        className="w-[256px]"
        defaultFilter={(text: string, inputValue: string) => {
          if (!inputValue) {
            return true;
          }

          return text.toLowerCase().startsWith(inputValue.toLowerCase());
        }}
      >
        <Label>Animal (custom filter)</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * AllowsCustomValue (story AllowsCustomValue)
 * -----------------------------------------------------------------------------------------------*/

function AllowsCustomValue() {
  return (
    <Stage>
      <ComboBox allowsCustomValue className="w-[256px]">
        <Label>Favorite Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search or type an animal..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
        <Description>You can type any animal name, even if it is not in the list</Description>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Disabled (story Disabled)
 * -----------------------------------------------------------------------------------------------*/

function Disabled() {
  return (
    <Stage>
      <ComboBox className="w-[256px]" defaultSelectedKey="cat" isDisabled>
        <Label>Favorite Animal</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * MenuTrigger (story MenuTrigger)
 * -----------------------------------------------------------------------------------------------*/

function MenuTrigger() {
  return (
    <Stage>
      <View class="items-start gap-8">
        <ComboBox className="w-[256px]" menuTrigger="focus">
          <Label>Favorite Animal</Label>
          <ComboBox.InputGroup>
            <Input placeholder="Search animals..." />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              {ANIMALS.map((animal) => (
                <AnimalRow animal={animal} />
              ))}
            </ListBox>
          </ComboBox.Popover>
          <Description>Popover opens when the input is focused</Description>
        </ComboBox>

        <ComboBox className="w-[256px]" menuTrigger="input">
          <Label>Favorite Animal</Label>
          <ComboBox.InputGroup>
            <Input placeholder="Search animals..." />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              {ANIMALS.map((animal) => (
                <AnimalRow animal={animal} />
              ))}
            </ListBox>
          </ComboBox.Popover>
          <Description>Popover opens when the user edits the input text</Description>
        </ComboBox>

        <ComboBox className="w-[256px]" menuTrigger="manual">
          <Label>Favorite Animal</Label>
          <ComboBox.InputGroup>
            <Input placeholder="Search animals..." />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              {ANIMALS.map((animal) => (
                <AnimalRow animal={animal} />
              ))}
            </ListBox>
          </ComboBox.Popover>
          <Description>
            Popover only opens when the trigger button is pressed or arrow keys are used
          </Description>
        </ComboBox>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * MultipleSelection (story MultipleSelection)
 * -----------------------------------------------------------------------------------------------*/

function Multiple() {
  return (
    <Stage>
      <ComboBox className="w-[256px]" selectionMode="multiple">
        <Label>Favorite Animals</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Value placeholder="No animals selected" />
        <ComboBox.Popover>
          <ListBox selectionMode="multiple">
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * MultipleSelectionControlled (story MultipleSelectionControlled)
 * -----------------------------------------------------------------------------------------------*/

function MultipleControlled() {
  const selected = signal<string[]>(["cat", "dog"]);

  return (
    <Stage>
      <ComboBox
        className="w-[256px]"
        selectionMode="multiple"
        value={selected()}
        onChange={(keys: unknown) =>
          selected.set(Array.from(keys as Iterable<unknown>).map(String))
        }
      >
        <Label>Animals (controlled)</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Value placeholder="No animals selected" />
        <ComboBox.Popover>
          <ListBox selectionMode="multiple">
            {ANIMALS.map((animal) => (
              <AnimalRow animal={animal} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      <Text>{`Selected: ${selected().join(", ") || "None"}`}</Text>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * MultipleSelectionWithTags (story MultipleSelectionWithTags), split: the Value
 * render prop
 * -----------------------------------------------------------------------------------------------*/

function MultipleTagsSplit() {
  return (
    <Stage>
      <ComboBox
        className="w-[256px]"
        defaultValue={["cat", "dog"]}
        items={ANIMALS}
        selectionMode="multiple"
      >
        <Label>Favorite Animals</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search animals..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Value className="flex flex-wrap gap-2">
          {({ isPlaceholder, selectedItems }) => {
            // D17: this function runs once, untracked; the branch must be a
            // reactive `<If>` reading the accessors, or the tags would freeze.
            return (
              <If
                else={<Text class="text-sm text-muted">No animals selected</Text>}
                when={!isPlaceholder() && selectedItems().length > 0}
              >
                <Each key={(item) => item.id} of={selectedItems()}>
                  {(item) => (
                    <Chip variant="soft">
                      <Chip.Label>{item().name}</Chip.Label>
                    </Chip>
                  )}
                </Each>
              </If>
            );
          }}
        </ComboBox.Value>
        <ComboBox.Popover>
          <ListBox selectionMode="multiple">
            {(animal: { id: string; name: string }) => (
              <ListBox.Item id={animal.id} textValue={animal.name}>
                {animal.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Stage>
  );
}

export const comboBoxScenarios: Record<string, Component> = {
  "combo-box/default": Default,
  "combo-box/full-width": FullWidth,
  "combo-box/default-selected-key": DefaultSelectedKey,
  "combo-box/description": WithDescription,
  "combo-box/sections": Sections,
  "combo-box/disabled-options": DisabledOptions,
  "combo-box/custom-indicator": CustomIndicator,
  "combo-box/required": Required,
  "combo-box/custom-value": CustomValue,
  "combo-box/controlled": Controlled,
  "combo-box/controlled-input": ControlledInput,
  "combo-box/async": Async,
  "combo-box/custom-filter": CustomFilter,
  "combo-box/allows-custom-value": AllowsCustomValue,
  "combo-box/disabled": Disabled,
  "combo-box/menu-trigger": MenuTrigger,
  "combo-box/multiple": Multiple,
  "combo-box/multiple-controlled": MultipleControlled,
  "combo-box/multiple-tags.split": MultipleTagsSplit,
};
