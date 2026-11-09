import { signal, Text, View } from "nsh";
import { Description, Label, ListBox } from "@heroui/react";
import type { SelectionValue } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for ListBox, ListBoxItem and ListBoxSection, written with
 * HeroUI's API only.
 *
 * The upstream stories are the source of `default` (Default), `sections`
 * (WithSections), `disabled` (WithDisabledItems), `multiple` (MultiSelect),
 * `custom-check.split` (CustomCheckIcon), `controlled.split` (Controlled) and
 * `items` (Virtualization without the Virtualizer, which is a separate RAC
 * component and not part of this unit).
 *
 * Differences forced by units that have not landed yet (port sheet §5):
 *   - Header (Section's title) belongs to another unit; the sections use
 *     `aria-label`, which HeroUI supports for a group without a Header.
 *   - Avatar, Kbd and Surface belong to other units: a plain View stands in
 *     for the avatar and the keyboard hint, and the list keeps its own width.
 *   - Separator is not a dependency of this unit (R-003): `sections` draws the
 *     decorative line with a local View and the 3% inset written in place.
 *
 * Split scenarios (SOP 3.3.3):
 *   - `custom-check.split` and `controlled.split` take the Indicator's render
 *     prop, whose parameter is an accessor object here and a boolean upstream
 *     (D17).
 *   - `rtl` in this worktree wraps the list in a local View with the direction,
 *     because harness/stage.tsx here predates Stage's `direction`.
 */

/* -------------------------------------------------------------------------------------------------
 * Placeholders for units that are not in this worktree yet
 * -----------------------------------------------------------------------------------------------*/

function AvatarPlaceholder(props: { initial: string }) {
  return (
    <View class="h-8 w-8 items-center justify-center rounded-full bg-default">
      <Text class="text-xs text-default-foreground">{props.initial}</Text>
    </View>
  );
}

function HintPlaceholder(props: { keys: string }) {
  return <Text class="ms-auto text-xs text-muted">{props.keys}</Text>;
}

/* -------------------------------------------------------------------------------------------------
 * Default (story Default)
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <ListBox aria-label="Users" className="w-64" selectionMode="single">
        <ListBox.Item id="1" textValue="Bob">
          <AvatarPlaceholder initial="B" />
          <View class="flex flex-col">
            <Label>Bob</Label>
            <Description>bob@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator />
        </ListBox.Item>
        <ListBox.Item id="2" textValue="Fred">
          <AvatarPlaceholder initial="F" />
          <View class="flex flex-col">
            <Label>Fred</Label>
            <Description>fred@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator />
        </ListBox.Item>
        <ListBox.Item id="3" textValue="Martha">
          <AvatarPlaceholder initial="M" />
          <View class="flex flex-col">
            <Label>Martha</Label>
            <Description>martha@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator />
        </ListBox.Item>
      </ListBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSections (story WithSections)
 * -----------------------------------------------------------------------------------------------*/

function Sections() {
  return (
    <Stage>
      <ListBox aria-label="File actions" className="w-64 p-2" selectionMode="none">
        <ListBox.Section aria-label="Actions">
          <ListBox.Item id="new-file" textValue="New file">
            <Text class="text-muted">+</Text>
            <View class="flex flex-col">
              <Label>New file</Label>
              <Description>Create a new file</Description>
            </View>
            <HintPlaceholder keys="N" />
          </ListBox.Item>
          <ListBox.Item id="edit-file" textValue="Edit file">
            <Text class="text-muted">~</Text>
            <View class="flex flex-col">
              <Label>Edit file</Label>
              <Description>Make changes</Description>
            </View>
            <HintPlaceholder keys="E" />
          </ListBox.Item>
        </ListBox.Section>
        {/* R-003: the 3% inset lives here until the Separator unit handles it. */}
        <View class="ms-[3%] h-px w-[94%] bg-border" />
        <ListBox.Section aria-label="Danger zone">
          <ListBox.Item id="delete-file" textValue="Delete file" variant="danger">
            <Text class="text-danger">x</Text>
            <View class="flex flex-col">
              <Label>Delete file</Label>
              <Description>Move to trash</Description>
            </View>
            <HintPlaceholder keys="D" />
          </ListBox.Item>
        </ListBox.Section>
      </ListBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDisabledItems (story WithDisabledItems)
 * -----------------------------------------------------------------------------------------------*/

function Disabled() {
  return (
    <Stage>
      <ListBox
        aria-label="File actions"
        className="w-64 p-2"
        disabledKeys={["delete-file"]}
        selectionMode="none"
      >
        <ListBox.Section aria-label="Actions">
          <ListBox.Item id="new-file" textValue="New file">
            <Text class="text-muted">+</Text>
            <View class="flex flex-col">
              <Label>New file</Label>
              <Description>Create a new file</Description>
            </View>
            <HintPlaceholder keys="N" />
          </ListBox.Item>
          <ListBox.Item id="edit-file" textValue="Edit file">
            <Text class="text-muted">~</Text>
            <View class="flex flex-col">
              <Label>Edit file</Label>
              <Description>Make changes</Description>
            </View>
            <HintPlaceholder keys="E" />
          </ListBox.Item>
        </ListBox.Section>
        <View class="ms-[3%] h-px w-[94%] bg-border" />
        <ListBox.Section aria-label="Danger zone">
          <ListBox.Item id="delete-file" textValue="Delete file" variant="danger">
            <Text class="text-danger">x</Text>
            <View class="flex flex-col">
              <Label>Delete file</Label>
              <Description>Move to trash</Description>
            </View>
            <HintPlaceholder keys="D" />
          </ListBox.Item>
        </ListBox.Section>
      </ListBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * MultiSelect (story MultiSelect)
 * -----------------------------------------------------------------------------------------------*/

function Multiple() {
  return (
    <Stage>
      <ListBox aria-label="Users" className="w-64" selectionMode="multiple">
        <ListBox.Item id="1" textValue="Bob">
          <AvatarPlaceholder initial="B" />
          <View class="flex flex-col">
            <Label>Bob</Label>
            <Description>bob@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator />
        </ListBox.Item>
        <ListBox.Item id="2" textValue="Fred">
          <AvatarPlaceholder initial="F" />
          <View class="flex flex-col">
            <Label>Fred</Label>
            <Description>fred@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator />
        </ListBox.Item>
        <ListBox.Item id="3" textValue="Martha">
          <AvatarPlaceholder initial="M" />
          <View class="flex flex-col">
            <Label>Martha</Label>
            <Description>martha@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator />
        </ListBox.Item>
      </ListBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CustomCheckIcon (story CustomCheckIcon), split: the Indicator's render prop
 * -----------------------------------------------------------------------------------------------*/

function CustomCheckSplit() {
  return (
    <Stage>
      <ListBox
        aria-label="Users"
        className="w-64"
        defaultSelectedKeys={new Set(["1"])}
        selectionMode="multiple"
      >
        <ListBox.Item id="1" textValue="Bob">
          <View class="flex flex-col">
            <Label>Bob</Label>
            <Description>bob@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator>
            {({ isSelected }) => <Text class="text-accent">{isSelected() ? "✓" : ""}</Text>}
          </ListBox.ItemIndicator>
        </ListBox.Item>
        <ListBox.Item id="2" textValue="Fred">
          <View class="flex flex-col">
            <Label>Fred</Label>
            <Description>fred@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator>
            {({ isSelected }) => <Text class="text-accent">{isSelected() ? "✓" : ""}</Text>}
          </ListBox.ItemIndicator>
        </ListBox.Item>
        <ListBox.Item id="3" textValue="Martha">
          <View class="flex flex-col">
            <Label>Martha</Label>
            <Description>martha@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator>
            {({ isSelected }) => <Text class="text-accent">{isSelected() ? "✓" : ""}</Text>}
          </ListBox.ItemIndicator>
        </ListBox.Item>
      </ListBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Controlled (story Controlled), split: the Indicator's render prop
 * -----------------------------------------------------------------------------------------------*/

function ControlledSplit() {
  const selected = signal<SelectionValue>(new Set(["1"]));

  return (
    <Stage>
      <ListBox
        aria-label="Users"
        className="w-64"
        selectedKeys={selected()}
        selectionMode="multiple"
        onSelectionChange={(keys) => selected.set(keys)}
      >
        <ListBox.Item id="1" textValue="Bob">
          <View class="flex flex-col">
            <Label>Bob</Label>
            <Description>bob@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator>
            {({ isSelected }) => <Text class="text-accent">{isSelected() ? "✓" : ""}</Text>}
          </ListBox.ItemIndicator>
        </ListBox.Item>
        <ListBox.Item id="2" textValue="Fred">
          <View class="flex flex-col">
            <Label>Fred</Label>
            <Description>fred@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator>
            {({ isSelected }) => <Text class="text-accent">{isSelected() ? "✓" : ""}</Text>}
          </ListBox.ItemIndicator>
        </ListBox.Item>
        <ListBox.Item id="3" textValue="Martha">
          <View class="flex flex-col">
            <Label>Martha</Label>
            <Description>martha@heroui.com</Description>
          </View>
          <ListBox.ItemIndicator>
            {({ isSelected }) => <Text class="text-accent">{isSelected() ? "✓" : ""}</Text>}
          </ListBox.ItemIndicator>
        </ListBox.Item>
      </ListBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Virtualization (story Virtualization without the Virtualizer)
 * -----------------------------------------------------------------------------------------------*/

const FIRST_NAMES = [
  "Emma",
  "Liam",
  "Olivia",
  "Noah",
  "Ava",
  "James",
  "Sophia",
  "Oliver",
  "Isabella",
  "Lucas",
  "Mia",
  "Ethan",
  "Charlotte",
  "Mason",
  "Amelia",
  "Logan",
  "Harper",
  "Alexander",
  "Ella",
  "Benjamin",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Anderson",
  "Taylor",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Clark",
  "Lewis",
  "Robinson",
  "Walker",
];

type User = { id: number; name: string; email: string };

function generateUsers(count: number): User[] {
  const users: User[] = [];

  for (let index = 0; index < count; index++) {
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];

    users.push({
      id: index + 1,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@acme.com`,
    });
  }

  return users;
}

function Items() {
  const users = generateUsers(1000);

  return (
    <Stage>
      <ListBox aria-label="Virtualized list with 1000 items" className="h-96 w-72" items={users}>
        {(user) => (
          <ListBox.Item id={user.id} textValue={user.name}>
            <View class="flex flex-col">
              <Label>{user.name}</Label>
              <Description>{user.email}</Description>
            </View>
            <ListBox.ItemIndicator />
          </ListBox.Item>
        )}
      </ListBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Dynamic Section (serves the grouped `items` mapping of port sheet T-007)
 * -----------------------------------------------------------------------------------------------*/

type GroupItem = { id: string; name: string; valueText: string; disabled: boolean };
type Group = { id: string; name: string; items: GroupItem[] };

const GROUPS: Group[] = [
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

function ItemsSection() {
  return (
    <Stage>
      <ListBox aria-label="Options" className="w-64" items={GROUPS} selectionMode="single">
        {(group) => (
          <ListBox.Section aria-label={group.name} items={group.items}>
            {(item) => (
              <ListBox.Item
                id={item.id}
                textValue={item.valueText}
                isDisabled={item.disabled}
              >
                <Label>{item.name}</Label>
              </ListBox.Item>
            )}
          </ListBox.Section>
        )}
      </ListBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Danger item variant
 * -----------------------------------------------------------------------------------------------*/

function Danger() {
  return (
    <Stage>
      <ListBox
        aria-label="File actions"
        className="w-64"
        defaultSelectedKeys={new Set(["delete-file"])}
        selectionMode="single"
      >
        <ListBox.Item id="delete-file" textValue="Delete file" variant="danger">
          <View class="flex flex-col">
            <Label>Delete file</Label>
            <Description>Move to trash</Description>
          </View>
          <ListBox.ItemIndicator />
        </ListBox.Item>
        <ListBox.Item id="edit-file" textValue="Edit file" variant="danger">
          <View class="flex flex-col">
            <Label>Edit file</Label>
            <Description>Make changes</Description>
          </View>
          <ListBox.ItemIndicator />
        </ListBox.Item>
      </ListBox>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * RTL (a selected and an unselected list, both direction-rtl)
 * -----------------------------------------------------------------------------------------------*/

function Rtl() {
  return (
    <Stage>
      <View class="flex-col gap-4" style={{ direction: "rtl" }}>
        <ListBox
          aria-label="RTL users"
          className="w-64"
          defaultSelectedKeys={new Set(["2"])}
          selectionMode="single"
        >
          <ListBox.Item id="1" textValue="Bob">
            <View class="flex flex-col">
              <Label>Bob</Label>
              <Description>bob@heroui.com</Description>
            </View>
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="2" textValue="Fred">
            <View class="flex flex-col">
              <Label>Fred</Label>
              <Description>fred@heroui.com</Description>
            </View>
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
        <ListBox aria-label="RTL unselected" className="w-64" selectionMode="single">
          <ListBox.Item id="1" textValue="Bob">
            <View class="flex flex-col">
              <Label>Bob</Label>
              <Description>bob@heroui.com</Description>
            </View>
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </View>
    </Stage>
  );
}

export const listBoxScenarios: Record<string, Component> = {
  "list-box/default": Default,
  "list-box/sections": Sections,
  "list-box/disabled": Disabled,
  "list-box/multiple": Multiple,
  "list-box/custom-check.split": CustomCheckSplit,
  "list-box/controlled.split": ControlledSplit,
  "list-box/items": Items,
  "list-box/items-section": ItemsSection,
  "list-box/danger": Danger,
  "list-box/rtl": Rtl,
};
