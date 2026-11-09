import { signal, Text, View } from "nsh";
import { Description, Header, Kbd, Label, Menu, Separator } from "@heroui/react";
import type { SelectionValue } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for Menu, MenuItem and MenuSection, written with HeroUI's
 * API only (SOP 3.3).
 *
 * Menu has no stories of its own; the entries below take the rows and groups
 * of `dropdown.stories.tsx` with the Dropdown Trigger / Popover removed,
 * because HeroUI's Menu is the collection inside the popover, not the popover
 * (port sheet §5). Sources:
 *
 *   menu/default                    Default (rows only)
 *   menu/sections                   WithSections (Header + Separator)
 *   menu/single-selection           WithSingleSelection
 *   menu/multiple-selection         WithMultipleSelection
 *   menu/section-level-selection    WithSectionLevelSelection
 *   menu/descriptions               WithDescriptions
 *   menu/keyboard-shortcuts         WithKeyboardShortcuts
 *   menu/danger                     a danger-variant row (Default's danger group)
 *   menu/custom-indicator.split     SingleWithCustomIndicator (render prop, D17)
 *   menu/custom-indicator-node      SingleWithCustomIndicator as a plain node
 *   menu/custom-submenu-indicator   WithCustomSubmenuIndicator
 *   menu/disabled                   WithDisabledItems
 *   menu/submenu                    WithSubmenus (one trigger row, no popover)
 *   menu/empty                      renderEmptyState
 *   menu/rtl                        a menu with both marker slots, direction-rtl
 *
 * Units that have not landed are stood in for: Avatar and Iconify icons do not
 * exist here, so a plain View marks the icon column. Everything else (Label,
 * Description, Header, Kbd, Separator, IconChevronRight) is the landed HeroUI
 * component.
 */

/* -------------------------------------------------------------------------------------------------
 * Default
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <Menu aria-label="Actions" className="w-64">
        <Menu.Item id="new-file" textValue="New file">
          <Label>New file</Label>
        </Menu.Item>
        <Menu.Item id="copy-link" textValue="Copy link">
          <Label>Copy link</Label>
        </Menu.Item>
        <Menu.Item id="edit-file" textValue="Edit file">
          <Label>Edit file</Label>
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSections
 * -----------------------------------------------------------------------------------------------*/

function Sections() {
  return (
    <Stage>
      <Menu aria-label="File actions" className="w-64">
        <Menu.Section>
          <Header>Actions</Header>
          <Menu.Item id="new-file" textValue="New file">
            <Label>New file</Label>
          </Menu.Item>
          <Menu.Item id="copy-link" textValue="Copy link">
            <Label>Copy link</Label>
          </Menu.Item>
        </Menu.Section>
        <Separator />
        <Menu.Section>
          <Header>Danger zone</Header>
          <Menu.Item id="delete-file" textValue="Delete file" variant="danger">
            <Label>Delete file</Label>
          </Menu.Item>
        </Menu.Section>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSingleSelection
 * -----------------------------------------------------------------------------------------------*/

function SingleSelection() {
  const selected = signal<SelectionValue>(new Set(["apple"]));

  return (
    <Stage>
      <Menu
        aria-label="Fruit"
        className="w-64"
        selectedKeys={selected()}
        selectionMode="single"
        onSelectionChange={(keys) => selected.set(keys)}
      >
        <Menu.Item id="apple" textValue="Apple">
          <Menu.ItemIndicator />
          <Label>Apple</Label>
        </Menu.Item>
        <Menu.Item id="banana" textValue="Banana">
          <Menu.ItemIndicator />
          <Label>Banana</Label>
        </Menu.Item>
        <Menu.Item id="cherry" textValue="Cherry">
          <Menu.ItemIndicator />
          <Label>Cherry</Label>
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithMultipleSelection
 * -----------------------------------------------------------------------------------------------*/

function MultipleSelection() {
  const selected = signal<SelectionValue>(new Set(["apple"]));

  return (
    <Stage>
      <Menu
        aria-label="Preferred fruits"
        className="w-64"
        selectedKeys={selected()}
        selectionMode="multiple"
        onSelectionChange={(keys) => selected.set(keys)}
      >
        <Menu.Item id="apple" textValue="Apple">
          <Menu.ItemIndicator type="dot" />
          <Label>Apple</Label>
        </Menu.Item>
        <Menu.Item id="banana" textValue="Banana">
          <Menu.ItemIndicator type="dot" />
          <Label>Banana</Label>
        </Menu.Item>
        <Menu.Item id="cherry" textValue="Cherry">
          <Menu.ItemIndicator type="dot" />
          <Label>Cherry</Label>
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSectionLevelSelection
 * -----------------------------------------------------------------------------------------------*/

function SectionLevelSelection() {
  const textStyles = signal<SelectionValue>(new Set(["bold", "italic"]));
  const textAlignment = signal<SelectionValue>(new Set(["left"]));

  return (
    <Stage>
      <Menu aria-label="Formatting" className="w-64">
        <Menu.Section>
          <Header>Actions</Header>
          <Menu.Item id="cut" textValue="Cut">
            <Label>Cut</Label>
          </Menu.Item>
          <Menu.Item id="copy" textValue="Copy">
            <Label>Copy</Label>
          </Menu.Item>
        </Menu.Section>
        <Separator />
        <Menu.Section
          selectedKeys={textStyles()}
          selectionMode="multiple"
          onSelectionChange={(keys) => textStyles.set(keys)}
        >
          <Header>Text Style</Header>
          <Menu.Item id="bold" textValue="Bold">
            <Menu.ItemIndicator />
            <Label>Bold</Label>
          </Menu.Item>
          <Menu.Item id="italic" textValue="Italic">
            <Menu.ItemIndicator />
            <Label>Italic</Label>
          </Menu.Item>
          <Menu.Item id="underline" textValue="Underline">
            <Menu.ItemIndicator />
            <Label>Underline</Label>
          </Menu.Item>
        </Menu.Section>
        <Separator />
        <Menu.Section
          selectedKeys={textAlignment()}
          selectionMode="single"
          onSelectionChange={(keys) => textAlignment.set(keys)}
        >
          <Header>Text Alignment</Header>
          <Menu.Item id="left" textValue="Left">
            <Menu.ItemIndicator type="dot" />
            <Label>Left</Label>
          </Menu.Item>
          <Menu.Item id="center" textValue="Center">
            <Menu.ItemIndicator type="dot" />
            <Label>Center</Label>
          </Menu.Item>
          <Menu.Item id="right" textValue="Right">
            <Menu.ItemIndicator type="dot" />
            <Label>Right</Label>
          </Menu.Item>
        </Menu.Section>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDescriptions
 * -----------------------------------------------------------------------------------------------*/

function Descriptions() {
  return (
    <Stage>
      <Menu aria-label="File actions" className="w-72">
        <Menu.Item id="new-file" textValue="New file">
          <View class="flex h-8 items-start justify-center pt-px">
            <View class="size-4 shrink-0 rounded-sm bg-muted" />
          </View>
          <View class="flex flex-col">
            <Label>New file</Label>
            <Description>Create a new file</Description>
          </View>
          <Kbd className="ms-auto" variant="light">
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>N</Kbd.Content>
          </Kbd>
        </Menu.Item>
        <Menu.Item id="open-file" textValue="Open file">
          <View class="flex h-8 items-start justify-center pt-px">
            <View class="size-4 shrink-0 rounded-sm bg-muted" />
          </View>
          <View class="flex flex-col">
            <Label>Open file</Label>
            <Description>Open an existing file</Description>
          </View>
          <Kbd className="ms-auto" variant="light">
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>O</Kbd.Content>
          </Kbd>
        </Menu.Item>
        <Menu.Item id="delete-file" textValue="Delete file" variant="danger">
          <View class="flex h-8 items-start justify-center pt-px">
            <View class="size-4 shrink-0 rounded-sm bg-danger" />
          </View>
          <View class="flex flex-col">
            <Label>Delete file</Label>
            <Description>Move to trash</Description>
          </View>
          <Kbd className="ms-auto" variant="light">
            <Kbd.Abbr keyValue="command" />
            <Kbd.Abbr keyValue="shift" />
            <Kbd.Content>D</Kbd.Content>
          </Kbd>
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithKeyboardShortcuts
 * -----------------------------------------------------------------------------------------------*/

function KeyboardShortcuts() {
  return (
    <Stage>
      <Menu aria-label="Actions" className="w-64">
        <Menu.Item id="new" textValue="New">
          <Label>New</Label>
          <Kbd className="ms-auto" variant="light">
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>N</Kbd.Content>
          </Kbd>
        </Menu.Item>
        <Menu.Item id="open" textValue="Open">
          <Label>Open</Label>
          <Kbd className="ms-auto" variant="light">
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>O</Kbd.Content>
          </Kbd>
        </Menu.Item>
        <Menu.Item id="save" textValue="Save">
          <Label>Save</Label>
          <Kbd className="ms-auto" variant="light">
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>S</Kbd.Content>
          </Kbd>
        </Menu.Item>
        <Menu.Item id="delete" textValue="Delete" variant="danger">
          <Label>Delete</Label>
          <Kbd className="ms-auto" variant="light">
            <Kbd.Abbr keyValue="command" />
            <Kbd.Abbr keyValue="shift" />
            <Kbd.Content>D</Kbd.Content>
          </Kbd>
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Danger variant
 * -----------------------------------------------------------------------------------------------*/

function Danger() {
  return (
    <Stage>
      <Menu
        aria-label="File actions"
        className="w-64"
        defaultSelectedKeys={new Set(["delete-file"])}
        selectionMode="single"
      >
        <Menu.Item id="delete-file" textValue="Delete file" variant="danger">
          <Menu.ItemIndicator />
          <Label>Delete file</Label>
        </Menu.Item>
        <Menu.Item id="move-file" textValue="Move file" variant="danger">
          <Menu.ItemIndicator type="dot" />
          <Label>Move file</Label>
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * SingleWithCustomIndicator, split: the Indicator's render prop (D17)
 * -----------------------------------------------------------------------------------------------*/

function CustomIndicatorSplit() {
  const selected = signal<SelectionValue>(new Set(["apple"]));

  return (
    <Stage>
      <Menu
        aria-label="Fruit"
        className="w-64"
        selectedKeys={selected()}
        selectionMode="single"
        onSelectionChange={(keys) => selected.set(keys)}
      >
        <Menu.Item id="apple" textValue="Apple">
          <Menu.ItemIndicator>
            {({ isSelected }) => (isSelected() ? <Text class="text-accent">✓</Text> : null)}
          </Menu.ItemIndicator>
          <Label>Apple</Label>
        </Menu.Item>
        <Menu.Item id="banana" textValue="Banana">
          <Menu.ItemIndicator>
            {({ isSelected }) => (isSelected() ? <Text class="text-accent">✓</Text> : null)}
          </Menu.ItemIndicator>
          <Label>Banana</Label>
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * A custom indicator passed as a plain node
 * -----------------------------------------------------------------------------------------------*/

function CustomIndicatorNode() {
  return (
    <Stage>
      <Menu aria-label="Fruit" className="w-64" selectionMode="single">
        <Menu.Item id="apple" textValue="Apple">
          <Menu.ItemIndicator>
            <View class="size-2 rounded-full bg-accent" />
          </Menu.ItemIndicator>
          <Label>Apple</Label>
        </Menu.Item>
        <Menu.Item id="banana" textValue="Banana">
          <Menu.ItemIndicator>
            <View class="size-2 rounded-full bg-accent" />
          </Menu.ItemIndicator>
          <Label>Banana</Label>
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithCustomSubmenuIndicator
 * -----------------------------------------------------------------------------------------------*/

function CustomSubmenuIndicator() {
  return (
    <Stage>
      <Menu aria-label="Share" className="w-64">
        <Menu.Item id="copy-link" textValue="Copy link">
          <Label>Copy link</Label>
        </Menu.Item>
        <Menu.Item
          id="share"
          textValue="Share"
          aria-expanded={false}
          aria-haspopup="menu"
        >
          <Label>More options</Label>
          <Menu.Item.SubmenuIndicator>
            <View class="size-3.5 items-center justify-center">
              <Text class="text-muted">›</Text>
            </View>
          </Menu.Item.SubmenuIndicator>
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDisabledItems
 * -----------------------------------------------------------------------------------------------*/

function Disabled() {
  return (
    <Stage>
      <Menu aria-label="File actions" className="w-64" disabledKeys={["delete-file"]}>
        <Menu.Section>
          <Header>Actions</Header>
          <Menu.Item id="new-file" textValue="New file">
            <Label>New file</Label>
          </Menu.Item>
          <Menu.Item id="edit-file" textValue="Edit file">
            <Label>Edit file</Label>
          </Menu.Item>
        </Menu.Section>
        <Separator />
        <Menu.Section>
          <Header>Danger zone</Header>
          <Menu.Item id="delete-file" textValue="Delete file" variant="danger">
            <Label>Delete file</Label>
          </Menu.Item>
        </Menu.Section>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSubmenus, one trigger row (the submenu popover belongs to Dropdown)
 * -----------------------------------------------------------------------------------------------*/

function Submenu() {
  return (
    <Stage>
      <Menu
        aria-label="Share"
        className="w-64"
        defaultSelectedKeys={new Set(["share"])}
        selectionMode="single"
      >
        <Menu.Item id="copy-link" textValue="Copy link">
          <Menu.ItemIndicator />
          <Label>Copy link</Label>
        </Menu.Item>
        <Menu.Item
          id="share"
          textValue="Share"
          aria-expanded={false}
          aria-haspopup="menu"
        >
          <Menu.ItemIndicator />
          <Label>Other</Label>
          <Menu.Item.SubmenuIndicator />
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Empty state
 * -----------------------------------------------------------------------------------------------*/

function Empty() {
  return (
    <Stage>
      <Menu
        aria-label="Actions"
        className="w-64"
        renderEmptyState={() => <Text class="p-2 text-muted">No actions</Text>}
      />
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * RTL: both marker slots, direction-rtl
 * -----------------------------------------------------------------------------------------------*/

function Rtl() {
  return (
    <Stage direction="rtl">
      <Menu
        aria-label="Share"
        className="w-64"
        defaultSelectedKeys={new Set(["share"])}
        selectionMode="single"
      >
        <Menu.Item id="copy-link" textValue="Copy link">
          <Menu.ItemIndicator />
          <Label>Copy link</Label>
        </Menu.Item>
        <Menu.Item
          id="share"
          textValue="Share"
          aria-expanded={false}
          aria-haspopup="menu"
        >
          <Menu.ItemIndicator />
          <Label>Other</Label>
          <Menu.Item.SubmenuIndicator />
        </Menu.Item>
      </Menu>
    </Stage>
  );
}

export const menuScenarios: Record<string, Component> = {
  "menu/default": Default,
  "menu/sections": Sections,
  "menu/single-selection": SingleSelection,
  "menu/multiple-selection": MultipleSelection,
  "menu/section-level-selection": SectionLevelSelection,
  "menu/descriptions": Descriptions,
  "menu/keyboard-shortcuts": KeyboardShortcuts,
  "menu/danger": Danger,
  "menu/custom-indicator.split": CustomIndicatorSplit,
  "menu/custom-indicator-node": CustomIndicatorNode,
  "menu/custom-submenu-indicator": CustomSubmenuIndicator,
  "menu/disabled": Disabled,
  "menu/submenu": Submenu,
  "menu/empty": Empty,
  "menu/rtl": Rtl,
};
