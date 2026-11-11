import { signal, Text, View } from "nsh";
import {
  Autocomplete,
  Button,
  Description,
  FieldError,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared scenarios for Autocomplete, written with HeroUI's API only (SOP 3.3).
 *
 * Sources:
 *   autocomplete/default          the `AutocompleteExample` fixture of
 *                                 heroui/.../autocomplete.test.tsx:20 (T-002,
 *                                 T-004, T-005, T-021, T-028, T-029, T-038,
 *                                 T-041, T-046, T-058 …)
 *   autocomplete/clear-button     the same fixture with `withClearButton` and
 *                                 defaultValue "cat" (T-003)
 *   autocomplete/clear-button-empty  ClearButton with nothing selected
 *   autocomplete/disabled         `isDisabled` (T-004, T-054, T-055)
 *   autocomplete/invalid          `isInvalid` + FieldError (T-005, T-037)
 *   autocomplete/description      Label + Description (T-036)
 *   autocomplete/aria-label       `aria-label`, no visible Label (T-034, T-035)
 *   autocomplete/open             `defaultOpen` (T-027, T-032)
 *   autocomplete/controlled-open  `isOpen` held by the parent (T-026, T-031)
 *   autocomplete/outside          the popover plus a pressable view outside it
 *                                 (T-029)
 *   autocomplete/scrolling        40 options with a short list (T-011, G-001)
 *   autocomplete/filter           five fruits whose names filter with the typed
 *                                 text (T-058)
 *   autocomplete/multiple*        the `AutocompleteMultipleFixture` of
 *                                 fixtures.tsx:25: selected animals render as
 *                                 TagGroup tags inside the trigger (T-006,
 *                                 T-047 … T-050)
 *
 * Split scenarios (SOP 3.3.3, D17): ListBox.Item's render prop takes booleans
 * upstream and accessors here, so the `markers` scenes read `isFocused()` and
 * `isSelected()` inside reactive constructs. They mark the row that holds the
 * list's virtual focus with a `*` suffix and the selected row with `✓`, which
 * is how a test sees a highlight without an `aria-activedescendant` query.
 * `aria-label` keeps each row's accessible name stable while the marker moves.
 *
 * The filter callback is RAC's `contains` signature `(textValue, inputValue)`;
 * upstream takes it from `useFilter`, which does not exist here, so the same
 * case-insensitive comparison is written out. Both sides compile it.
 */

const ANIMALS = [
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "panda", name: "Panda" },
];

const FRUITS = ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"];

const MANY = Array.from({ length: 40 }, (_, index) => ({
  id: `option-${index}`,
  name: `Animal ${index}`,
}));

/** RAC's default `contains` filter with `sensitivity: "base"`. */
function contains(textValue: string, inputValue: string): boolean {
  return textValue.toLowerCase().includes(inputValue.toLowerCase());
}

function animals(nodes: { id: string; name: string }[], markers: boolean) {
  return nodes.map((item) =>
    markers ? (
      <ListBox.Item id={item.id} textValue={item.name} aria-label={item.name}>
        {(values) => [
          <Text>{values.isFocused() ? `${item.name}*` : item.name}</Text>,
          <ListBox.ItemIndicator>
            {(indicator) => <Text>{indicator.isSelected() ? "✓" : ""}</Text>}
          </ListBox.ItemIndicator>,
        ]}
      </ListBox.Item>
    ) : (
      <ListBox.Item id={item.id} textValue={item.name}>
        {item.name}
        <ListBox.ItemIndicator />
      </ListBox.Item>
    ),
  );
}

/* -------------------------------------------------------------------------------------------------
 * Single selection
 * --------------------------------------------------------------------------------------------- */

function Default() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onClear={probe("clear")}
        onOpenChange={probe("openChange")}
        onInputChange={probe("inputChange")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function MarkersSplit() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onClear={probe("clear")}
        onOpenChange={probe("openChange")}
        onInputChange={probe("inputChange")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, true)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function MarkersSelectedSplit() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        defaultValue="dog"
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onOpenChange={probe("openChange")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, true)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function MarkersControlledSplit() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        placeholder="Select an animal"
        selectionMode="single"
        value="dog"
        onChange={probe("change")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, true)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function MarkersNoAutoFocusSplit() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        disableAutoFocusFirst
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, true)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function Numbers() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        placeholder="Select a number"
        selectionMode="single"
        onChange={probe("change")}
      >
        <Label>Number</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search numbers" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search numbers..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>
              {["1", "2", "3"].map((number) => (
                <ListBox.Item id={number} textValue={number}>
                  {number}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function MarkersDisabledSplit() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        disabledKeys={["dog"]}
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onOpenChange={probe("openChange")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, true)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function ClearButton() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        defaultValue="cat"
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onClear={probe("clear")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function ClearButtonEmpty() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onClear={probe("clear")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        isDisabled
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onOpenChange={probe("openChange")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.ClearButton />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        isInvalid
        placeholder="Select an animal"
        selectionMode="single"
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
        <FieldError>Please choose an animal</FieldError>
      </Autocomplete>
    </Stage>
  );
}

function WithDescription() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        placeholder="Select an animal"
        selectionMode="single"
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Description>Pick the animal you like best</Description>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function AriaLabel() {
  return (
    <Stage>
      <Autocomplete
        aria-label="Favorite Animal"
        className="w-[256px]"
        placeholder="Select an animal"
        selectionMode="single"
      >
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function DefaultOpen() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        defaultOpen
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onOpenChange={probe("openChange")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function ControlledOpen() {
  const open = signal(true);

  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        isOpen={open()}
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onOpenChange={probe("openChange")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function Outside() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
        onOpenChange={probe("openChange")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
      <Button>Outside</Button>
    </Stage>
  );
}

function Scrolling() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        placeholder="Select an animal"
        selectionMode="single"
        onChange={probe("change")}
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox className="max-h-24">{animals(MANY, false)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function FilterScene() {
  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        placeholder="Select a fruit"
        selectionMode="single"
        onChange={probe("change")}
        onInputChange={probe("inputChange")}
      >
        <Label>Favorite Fruit</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search fruits" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search fruits..." />
              </SearchField.Group>
            </SearchField>
            <ListBox>
              {FRUITS.map((fruit) => (
                <ListBox.Item id={fruit} textValue={fruit}>
                  {fruit}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Multiple selection with tags
 * --------------------------------------------------------------------------------------------- */

type MultipleProps = {
  defaultValue?: string[];
  value?: string[];
  defaultOpen?: boolean;
  /** Upstream's fixtures own `selectedKeys` and filter it on remove (T-006). */
  controlled?: boolean;
};

/** The selection payload as keys, whether the component reports an array, a set or one key. */
function toStringList(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === "string" || typeof value === "number") return [String(value)];

  const iterable = value as Iterable<unknown>;

  if (typeof iterable[Symbol.iterator] === "function") {
    return Array.from(iterable).map(String);
  }

  return [];
}

function Multiple(props: MultipleProps) {
  const selected = signal<string[]>(props.defaultValue ?? props.value ?? []);
  const record = (keys: unknown) => {
    const list = toStringList(keys);
    probe("change")(list);
    if (props.controlled) selected.set(list);
  };
  const onRemove = (keys: Set<string>) => {
    const list = Array.from(keys).map(String);
    probe("remove")(list);
    if (props.controlled) {
      selected.set(selected().filter((key) => !list.includes(key)));
    }
  };

  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        defaultOpen={props.defaultOpen}
        placeholder="Select animals"
        selectionMode="multiple"
        value={props.controlled ? selected() : props.value}
        defaultValue={props.controlled ? undefined : props.defaultValue}
        onChange={record}
      >
        <Label>Favorite Animals</Label>
        <Autocomplete.Trigger>
          <Autocomplete.Value className="flex flex-wrap gap-2">
            {({ defaultChildren, isPlaceholder, selectedItems }) => (
              <If
                else={defaultChildren()}
                when={!isPlaceholder() && selectedItems().length > 0}
              >
                <TagGroup aria-label="Selected animals" size="sm" onRemove={onRemove}>
                  <TagGroup.List>
                    <Each key={(item) => item.key} of={selectedItems()}>
                      {(item) => {
                        const animal = ANIMALS.find((entry) => entry.id === item().key);

                        return (
                          <Tag id={item().key} textValue={animal?.name ?? item().key}>
                            {animal?.name ?? item().key}
                          </Tag>
                        );
                      }}
                    </Each>
                  </TagGroup.List>
                </TagGroup>
              </If>
            )}
          </Autocomplete.Value>
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus aria-label="Search animals" name="search" variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox>{animals(ANIMALS, true)}</ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

function MultipleTags() {
  return <Multiple controlled defaultValue={["cat", "dog", "panda"]} />;
}

function MultipleSelecting() {
  return <Multiple defaultValue={[]} />;
}

function MultipleDefaultTwo() {
  return <Multiple defaultValue={["cat", "dog"]} />;
}

function MultipleOpen() {
  return <Multiple controlled defaultOpen defaultValue={["cat", "dog", "panda"]} />;
}

function MultipleControlled() {
  return <Multiple value={["cat", "dog"]} />;
}

export const autocompleteScenarios = {
  "autocomplete/default": Default,
  "autocomplete/markers.split": MarkersSplit,
  "autocomplete/markers-selected.split": MarkersSelectedSplit,
  "autocomplete/markers-disabled.split": MarkersDisabledSplit,
  "autocomplete/markers-controlled.split": MarkersControlledSplit,
  "autocomplete/markers-no-autofocus.split": MarkersNoAutoFocusSplit,
  "autocomplete/numbers": Numbers,
  "autocomplete/clear-button": ClearButton,
  "autocomplete/clear-button-empty": ClearButtonEmpty,
  "autocomplete/disabled": Disabled,
  "autocomplete/invalid": Invalid,
  "autocomplete/description": WithDescription,
  "autocomplete/aria-label": AriaLabel,
  "autocomplete/open": DefaultOpen,
  "autocomplete/controlled-open": ControlledOpen,
  "autocomplete/outside": Outside,
  "autocomplete/scrolling": Scrolling,
  "autocomplete/filter": FilterScene,
  "autocomplete/multiple": MultipleSelecting,
  "autocomplete/multiple-default": MultipleDefaultTwo,
  "autocomplete/multiple-tags": MultipleTags,
  "autocomplete/multiple-open": MultipleOpen,
  "autocomplete/multiple-controlled": MultipleControlled,
} satisfies Record<string, Component>;
