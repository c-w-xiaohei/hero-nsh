import { signal, Text, View } from "nsh";
import {
  Avatar,
  Button,
  Description,
  Dropdown,
  Header,
  IconChevronRight,
  Kbd,
  Label,
  Separator,
} from "@heroui/react";
import type { SelectionValue } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared scenarios for Dropdown, written with HeroUI's API only (SOP 3.3).
 * Sources are the stories of `dropdown.stories.tsx`, except `dropdown/narrow`,
 * which comes from `NarrowViewportDropdownFixture` in the upstream test
 * fixtures (port sheet 4b):
 *
 *   dropdown/default                    Default
 *   dropdown/single-selection           WithSingleSelection
 *   dropdown/custom-indicator           SingleWithCustomIndicator, plain node
 *   dropdown/custom-indicator.split     SingleWithCustomIndicator, render prop (D17) *   dropdown/multiple-selection         WithMultipleSelection
 *   dropdown/section-level-selection    WithSectionLevelSelection
 *   dropdown/keyboard-shortcuts         WithKeyboardShortcuts
 *   dropdown/icons                      WithIcons (iconify -> IconChevronRight)
 *   dropdown/long-press                 LongPressTrigger
 *   dropdown/descriptions               WithDescriptions
 *   dropdown/sections                   WithSections
 *   dropdown/disabled                   WithDisabledItems
 *   dropdown/submenus                   WithSubmenus
 *   dropdown/custom-submenu-indicator   WithCustomSubmenuIndicator
 *   dropdown/controlled                 Controlled
 *   dropdown/controlled-open            ControlledOpenState
 *   dropdown/custom-trigger             CustomTrigger (Avatar trigger)
 *   dropdown/narrow                     NarrowViewportDropdownFixture
 *
 * The four modal handoff fixtures (`dropdown/handoff-*`,
 * `dropdown/inside-modal`) wait for Modal / AlertDialog / Drawer to land
 * (port sheet section 5); their dropdown half lives in the NSH-only fixture.
 *
 * `probe` replaces every `alert` / `console.log` of the stories, so the same
 * entry serves a visual check and a behavior case. The danger row is the
 * `variant="danger"` item of the default story.
 */

/* -------------------------------------------------------------------------------------------------
 * Default
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Actions
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Section>
              <Dropdown.Item id="new-file" textValue="New file">
                <Label>New file</Label>
              </Dropdown.Item>
              <Dropdown.Item id="copy-link" textValue="Copy link">
                <Label>Copy link</Label>
              </Dropdown.Item>
              <Dropdown.Item id="edit-file" textValue="Edit file">
                <Label>Edit file</Label>
              </Dropdown.Item>
            </Dropdown.Section>
            <Separator />
            <Dropdown.Section>
              <Dropdown.Item id="delete-file" textValue="Delete file" variant="danger">
                <Label>Delete file</Label>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
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
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Fruit
        </Button>
        <Dropdown.Popover className="min-w-[256px]">
          <Dropdown.Menu
            selectedKeys={selected()}
            selectionMode="single"
            onSelectionChange={(keys: SelectionValue) => selected.set(keys)}
          >
            <Dropdown.Section>
              <Header>Select a fruit</Header>
              <Dropdown.Item id="apple" textValue="Apple">
                <Dropdown.ItemIndicator />
                <Label>Apple</Label>
              </Dropdown.Item>
              <Dropdown.Item id="banana" textValue="Banana">
                <Dropdown.ItemIndicator />
                <Label>Banana</Label>
              </Dropdown.Item>
              <Dropdown.Item id="cherry" textValue="Cherry">
                <Dropdown.ItemIndicator />
                <Label>Cherry</Label>
              </Dropdown.Item>
            </Dropdown.Section>
            <Dropdown.Item id="orange" textValue="Orange">
              <Dropdown.ItemIndicator />
              <Label>Orange</Label>
            </Dropdown.Item>
            <Dropdown.Item id="pear" textValue="Pear">
              <Dropdown.ItemIndicator />
              <Label>Pear</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * SingleWithCustomIndicator (plain node form)
 * -----------------------------------------------------------------------------------------------*/

function CustomIndicatorNode() {
  return (
    <Stage>
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Fruits
        </Button>
        <Dropdown.Popover className="min-w-[256px]">
          <Dropdown.Menu selectionMode="single">
            <Dropdown.Section>
              <Header>Select a fruit</Header>
              <Dropdown.Item id="apple" textValue="Apple">
                <Dropdown.ItemIndicator>
                  <IconChevronRight className="size-4 text-accent" />
                </Dropdown.ItemIndicator>
                <Label>Apple</Label>
              </Dropdown.Item>
              <Dropdown.Item id="banana" textValue="Banana">
                <Dropdown.ItemIndicator>
                  <IconChevronRight className="size-4 text-accent" />
                </Dropdown.ItemIndicator>
                <Label>Banana</Label>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * SingleWithCustomIndicator (render prop form, D17)
 * -----------------------------------------------------------------------------------------------*/

function CustomIndicatorSplit() {
  const selected = signal<SelectionValue>(new Set(["apple"]));

  return (
    <Stage>
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Fruits
        </Button>
        <Dropdown.Popover className="min-w-[256px]">
          <Dropdown.Menu
            selectedKeys={selected()}
            selectionMode="single"
            onSelectionChange={(keys: SelectionValue) => selected.set(keys)}
          >
            <Dropdown.Section>
              <Header>Select a fruit</Header>
              <Dropdown.Item id="apple" textValue="Apple">
                <Dropdown.ItemIndicator>
                  {({ isSelected }) =>
                    isSelected() ? <IconChevronRight className="size-4 text-accent" /> : null
                  }
                </Dropdown.ItemIndicator>
                <Label>Apple</Label>
              </Dropdown.Item>
              <Dropdown.Item id="banana" textValue="Banana">
                <Dropdown.ItemIndicator>
                  {({ isSelected }) =>
                    isSelected() ? <IconChevronRight className="size-4 text-accent" /> : null
                  }
                </Dropdown.ItemIndicator>
                <Label>Banana</Label>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
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
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Preferred Fruits
        </Button>
        <Dropdown.Popover className="min-w-[256px]">
          <Dropdown.Menu
            selectedKeys={selected()}
            selectionMode="multiple"
            onSelectionChange={(keys: SelectionValue) => selected.set(keys)}
          >
            <Dropdown.Section>
              <Header>Select a fruit</Header>
              <Dropdown.Item id="apple" textValue="Apple">
                <Dropdown.ItemIndicator />
                <Label>Apple</Label>
              </Dropdown.Item>
              <Dropdown.Item id="banana" textValue="Banana">
                <Dropdown.ItemIndicator />
                <Label>Banana</Label>
              </Dropdown.Item>
              <Dropdown.Item id="cherry" textValue="Cherry">
                <Dropdown.ItemIndicator />
                <Label>Cherry</Label>
              </Dropdown.Item>
            </Dropdown.Section>
            <Dropdown.Item id="orange" textValue="Orange">
              <Dropdown.ItemIndicator />
              <Label>Orange</Label>
            </Dropdown.Item>
            <Dropdown.Item id="pear" textValue="Pear">
              <Dropdown.ItemIndicator />
              <Label>Pear</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
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
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Styles
        </Button>
        <Dropdown.Popover className="min-w-[256px]">
          <Dropdown.Menu>
            <Dropdown.Section>
              <Header>Actions</Header>
              <Dropdown.Item id="cut" textValue="Cut">
                <Label>Cut</Label>
                <Kbd className="ms-auto" variant="light">
                  <Kbd.Abbr keyValue="command" />
                  <Kbd.Content>X</Kbd.Content>
                </Kbd>
              </Dropdown.Item>
              <Dropdown.Item id="copy" textValue="Copy">
                <Label>Copy</Label>
                <Kbd className="ms-auto" variant="light">
                  <Kbd.Abbr keyValue="command" />
                  <Kbd.Content>C</Kbd.Content>
                </Kbd>
              </Dropdown.Item>
            </Dropdown.Section>
            <Separator />
            <Dropdown.Section
              selectedKeys={textStyles()}
              selectionMode="multiple"
              onSelectionChange={(keys: SelectionValue) => textStyles.set(keys)}
            >
              <Header>Text Style</Header>
              <Dropdown.Item id="bold" textValue="Bold">
                <Dropdown.ItemIndicator />
                <Label>Bold</Label>
                <Kbd className="ms-auto" variant="light">
                  <Kbd.Abbr keyValue="command" />
                  <Kbd.Content>B</Kbd.Content>
                </Kbd>
              </Dropdown.Item>
              <Dropdown.Item id="italic" textValue="Italic">
                <Dropdown.ItemIndicator />
                <Label>Italic</Label>
                <Kbd className="ms-auto" variant="light">
                  <Kbd.Abbr keyValue="command" />
                  <Kbd.Content>I</Kbd.Content>
                </Kbd>
              </Dropdown.Item>
              <Dropdown.Item id="underline" textValue="Underline">
                <Dropdown.ItemIndicator />
                <Label>Underline</Label>
                <Kbd className="ms-auto" variant="light">
                  <Kbd.Abbr keyValue="command" />
                  <Kbd.Content>U</Kbd.Content>
                </Kbd>
              </Dropdown.Item>
            </Dropdown.Section>
            <Separator />
            <Dropdown.Section
              selectedKeys={textAlignment()}
              selectionMode="single"
              onSelectionChange={(keys: SelectionValue) => textAlignment.set(keys)}
            >
              <Header>Text Alignment</Header>
              <Dropdown.Item id="left" textValue="Left">
                <Dropdown.ItemIndicator type="dot" />
                <Label>Left</Label>
                <Kbd className="ms-auto" variant="light">
                  <Kbd.Abbr keyValue="alt" />
                  <Kbd.Content>A</Kbd.Content>
                </Kbd>
              </Dropdown.Item>
              <Dropdown.Item id="center" textValue="Center">
                <Dropdown.ItemIndicator type="dot" />
                <Label>Center</Label>
                <Kbd className="ms-auto" variant="light">
                  <Kbd.Abbr keyValue="alt" />
                  <Kbd.Content>H</Kbd.Content>
                </Kbd>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithKeyboardShortcuts
 * -----------------------------------------------------------------------------------------------*/

function KeyboardShortcuts() {
  return (
    <Stage>
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Actions
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="new" textValue="New">
              <Label>New</Label>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Content>N</Kbd.Content>
              </Kbd>
            </Dropdown.Item>
            <Dropdown.Item id="open" textValue="Open">
              <Label>Open</Label>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Content>O</Kbd.Content>
              </Kbd>
            </Dropdown.Item>
            <Dropdown.Item id="delete" textValue="Delete" variant="danger">
              <Label>Delete</Label>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Abbr keyValue="shift" />
                <Kbd.Content>D</Kbd.Content>
              </Kbd>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithIcons (the stories' iconify icons become the landed IconChevronRight)
 * -----------------------------------------------------------------------------------------------*/

function Icons() {
  return (
    <Stage>
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Actions
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="new-file" textValue="New file">
              <IconChevronRight className="size-4 shrink-0 text-muted" />
              <Label>New file</Label>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Content>N</Kbd.Content>
              </Kbd>
            </Dropdown.Item>
            <Dropdown.Item id="open-file" textValue="Open file">
              <IconChevronRight className="size-4 shrink-0 text-muted" />
              <Label>Open file</Label>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Content>O</Kbd.Content>
              </Kbd>
            </Dropdown.Item>
            <Dropdown.Item id="delete-file" textValue="Delete file" variant="danger">
              <IconChevronRight className="size-4 shrink-0 text-danger" />
              <Label>Delete file</Label>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Abbr keyValue="shift" />
                <Kbd.Content>D</Kbd.Content>
              </Kbd>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * LongPressTrigger
 * -----------------------------------------------------------------------------------------------*/

function LongPress() {
  return (
    <Stage>
      <Dropdown trigger="longPress">
        <Button aria-label="Menu" variant="secondary">
          Long Press
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Item id="new-file" textValue="New file">
              <Label>New file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="open-file" textValue="Open file">
              <Label>Open file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete-file" textValue="Delete file" variant="danger">
              <Label>Delete file</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDescriptions
 * -----------------------------------------------------------------------------------------------*/

function Descriptions() {
  return (
    <Stage>
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Actions
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="new-file" textValue="New file">
              <View class="flex h-8 items-start justify-center pt-px">
                <IconChevronRight className="size-4 shrink-0 text-muted" />
              </View>
              <View class="flex flex-col">
                <Label>New file</Label>
                <Description>Create a new file</Description>
              </View>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Content>N</Kbd.Content>
              </Kbd>
            </Dropdown.Item>
            <Dropdown.Item id="save-file" textValue="Save file">
              <View class="flex h-8 items-start justify-center pt-px">
                <IconChevronRight className="size-4 shrink-0 text-muted" />
              </View>
              <View class="flex flex-col">
                <Label>Save file</Label>
                <Description>Save the current file</Description>
              </View>
              <Kbd className="ms-auto" variant="light">
                <Kbd.Abbr keyValue="command" />
                <Kbd.Content>S</Kbd.Content>
              </Kbd>
            </Dropdown.Item>
            <Dropdown.Item id="delete-file" textValue="Delete file" variant="danger">
              <View class="flex h-8 items-start justify-center pt-px">
                <IconChevronRight className="size-4 shrink-0 text-danger" />
              </View>
              <View class="flex flex-col">
                <Label>Delete file</Label>
                <Description>Move to trash</Description>
              </View>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSections
 * -----------------------------------------------------------------------------------------------*/

function Sections() {
  return (
    <Stage>
      <Dropdown>
        <Button isIconOnly aria-label="Menu" variant="secondary">
          <IconChevronRight className="outline-none" />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Section>
              <Header>Actions</Header>
              <Dropdown.Item id="new-file" textValue="New file">
                <View class="flex h-8 items-start justify-center pt-px">
                  <IconChevronRight className="size-4 shrink-0 text-muted" />
                </View>
                <View class="flex flex-col">
                  <Label>New file</Label>
                  <Description>Create a new file</Description>
                </View>
              </Dropdown.Item>
              <Dropdown.Item id="edit-file" textValue="Edit file">
                <View class="flex h-8 items-start justify-center pt-px">
                  <IconChevronRight className="size-4 shrink-0 text-muted" />
                </View>
                <View class="flex flex-col">
                  <Label>Edit file</Label>
                  <Description>Make changes</Description>
                </View>
              </Dropdown.Item>
            </Dropdown.Section>
            <Separator />
            <Dropdown.Section>
              <Header>Danger zone</Header>
              <Dropdown.Item id="delete-file" textValue="Delete file" variant="danger">
                <View class="flex h-8 items-start justify-center pt-px">
                  <IconChevronRight className="size-4 shrink-0 text-danger" />
                </View>
                <View class="flex flex-col">
                  <Label>Delete file</Label>
                  <Description>Move to trash</Description>
                </View>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithDisabledItems
 * -----------------------------------------------------------------------------------------------*/

function Disabled() {
  return (
    <Stage>
      <Dropdown>
        <Button isIconOnly aria-label="Menu" variant="secondary">
          <IconChevronRight className="outline-none" />
        </Button>
        <Dropdown.Popover className="min-w-[220px]">
          <Dropdown.Menu disabledKeys={["delete-file"]} onAction={probe("onAction")}>
            <Dropdown.Section>
              <Header>Actions</Header>
              <Dropdown.Item id="new-file" textValue="New file">
                <View class="flex h-8 items-start justify-center pt-px">
                  <IconChevronRight className="size-4 shrink-0 text-muted" />
                </View>
                <View class="flex flex-col">
                  <Label>New file</Label>
                  <Description>Create a new file</Description>
                </View>
              </Dropdown.Item>
              <Dropdown.Item id="edit-file" textValue="Edit file">
                <View class="flex h-8 items-start justify-center pt-px">
                  <IconChevronRight className="size-4 shrink-0 text-muted" />
                </View>
                <View class="flex flex-col">
                  <Label>Edit file</Label>
                  <Description>Make changes</Description>
                </View>
              </Dropdown.Item>
            </Dropdown.Section>
            <Separator />
            <Dropdown.Section>
              <Header>Danger zone</Header>
              <Dropdown.Item id="delete-file" textValue="Delete file" variant="danger">
                <View class="flex h-8 items-start justify-center pt-px">
                  <IconChevronRight className="size-4 shrink-0 text-danger" />
                </View>
                <View class="flex flex-col">
                  <Label>Delete file</Label>
                  <Description>Move to trash</Description>
                </View>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithSubmenus (two levels)
 * -----------------------------------------------------------------------------------------------*/

function Submenus() {
  return (
    <Stage>
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Share
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="copy-link" textValue="Copy Link">
              <Label>Copy Link</Label>
            </Dropdown.Item>
            <Dropdown.Item id="facebook" textValue="Facebook">
              <Label>Facebook</Label>
            </Dropdown.Item>
            <Dropdown.SubmenuTrigger>
              <Dropdown.Item id="share" textValue="Share">
                <Label>Other</Label>
                <Dropdown.SubmenuIndicator />
              </Dropdown.Item>
              <Dropdown.Popover>
                <Dropdown.Menu>
                  <Dropdown.Item id="whatsapp" textValue="WhatsApp">
                    <Label>WhatsApp</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="telegram" textValue="Telegram">
                    <Label>Telegram</Label>
                  </Dropdown.Item>
                  <Dropdown.SubmenuTrigger>
                    <Dropdown.Item id="email" textValue="Email">
                      <Label>Email</Label>
                      <Dropdown.SubmenuIndicator />
                    </Dropdown.Item>
                    <Dropdown.Popover>
                      <Dropdown.Menu>
                        <Dropdown.Item id="work" textValue="Work email">
                          <Label>Work email</Label>
                        </Dropdown.Item>
                        <Dropdown.Item id="personal" textValue="Personal email">
                          <Label>Personal email</Label>
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown.SubmenuTrigger>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithCustomSubmenuIndicator
 * -----------------------------------------------------------------------------------------------*/

function CustomSubmenuIndicator() {
  return (
    <Stage>
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Share
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={probe("onAction")}>
            <Dropdown.Item id="copy-link" textValue="Copy Link">
              <Label>Copy Link</Label>
            </Dropdown.Item>
            <Dropdown.SubmenuTrigger>
              <Dropdown.Item id="share" textValue="Share">
                <Label>More options</Label>
                <Dropdown.SubmenuIndicator>
                  <IconChevronRight className="size-3.5 text-muted" />
                </Dropdown.SubmenuIndicator>
              </Dropdown.Item>
              <Dropdown.Popover>
                <Dropdown.Menu>
                  <Dropdown.Item id="whatsapp" textValue="WhatsApp">
                    <Label>WhatsApp</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="telegram" textValue="Telegram">
                    <Label>Telegram</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
            <Dropdown.SubmenuTrigger>
              <Dropdown.Item id="other" textValue="Other">
                <Label>Other (default indicator)</Label>
                <Dropdown.SubmenuIndicator />
              </Dropdown.Item>
              <Dropdown.Popover>
                <Dropdown.Menu>
                  <Dropdown.Item id="sms" textValue="SMS">
                    <Label>SMS</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Controlled (controlled multiple selection + external summary)
 * -----------------------------------------------------------------------------------------------*/

function selectionSummary(selection: SelectionValue): string {
  if (selection === "all") {
    return "Selected: all";
  }

  const keys = Array.from(selection);

  return keys.length > 0 ? `Selected: ${keys.join(", ")}` : "Selected: None";
}

function Controlled() {
  const selected = signal<SelectionValue>(new Set(["bold"]));

  return (
    <Stage>
      <Dropdown>
        <Button aria-label="Menu" variant="secondary">
          Actions
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu
            selectedKeys={selected()}
            selectionMode="multiple"
            onSelectionChange={(keys: SelectionValue) => selected.set(keys)}
          >
            <Dropdown.Item id="bold" textValue="Bold">
              <Label>Bold</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
            <Dropdown.Item id="italic" textValue="Italic">
              <Label>Italic</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
            <Dropdown.Item id="underline" textValue="Underline">
              <Label>Underline</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <Text class="text-sm text-muted">{selectionSummary(selected())}</Text>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ControlledOpenState
 * -----------------------------------------------------------------------------------------------*/

function ControlledOpen() {
  const open = signal(false);

  return (
    <Stage>
      <Text class="text-sm text-muted">{open() ? "Dropdown is: open" : "Dropdown is: closed"}</Text>
      <Dropdown isOpen={open()} onOpenChange={(isOpen: boolean) => open.set(isOpen)}>
        <Button aria-label="Menu" variant="secondary">
          Actions
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Item id="new-file" textValue="New file">
              <Label>New file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="open-file" textValue="Open file">
              <Label>Open file</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete-file" textValue="Delete file" variant="danger">
              <Label>Delete file</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * CustomTrigger (Avatar trigger, non-menu content above the menu)
 * -----------------------------------------------------------------------------------------------*/

function CustomTrigger() {
  return (
    <Stage>
      <Dropdown>
        <Dropdown.Trigger className="rounded-full">
          <Avatar>
            <Avatar.Image
              alt="Junior Garcia"
              src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg"
            />
            <Avatar.Fallback delayMs={600}>JD</Avatar.Fallback>
          </Avatar>
        </Dropdown.Trigger>
        <Dropdown.Popover>
          <View class="px-3 pt-3 pb-1">
            <View class="flex items-center gap-2">
              <Avatar size="sm">
                <Avatar.Image
                  alt="Jane"
                  src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg"
                />
                <Avatar.Fallback delayMs={600}>JD</Avatar.Fallback>
              </Avatar>
              <View class="flex flex-col gap-0">
                <Text class="text-sm leading-5 font-medium">Jane Doe</Text>
                <Text class="text-xs leading-none text-muted">jane@example.com</Text>
              </View>
            </View>
          </View>
          <Dropdown.Menu>
            <Dropdown.Item id="dashboard" textValue="Dashboard">
              <Label>Dashboard</Label>
            </Dropdown.Item>
            <Dropdown.Item id="profile" textValue="Profile">
              <Label>Profile</Label>
            </Dropdown.Item>
            <Dropdown.Item id="logout" textValue="Logout" variant="danger">
              <Label>Log Out</Label>
              <IconChevronRight className="size-3.5 text-danger" />
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * NarrowViewportDropdownFixture: a row wider than 48svw on a 390pt screen
 * -----------------------------------------------------------------------------------------------*/

function Narrow() {
  return (
    <Stage>
      <Dropdown>
        <Dropdown.Trigger aria-label="Menu">Actions</Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Item id="theme" textValue="System theme">
              <IconChevronRight className="size-4 text-muted" />
              <Label style={{ minWidth: 256 }}>System theme</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </Stage>
  );
}

export const dropdownScenarios: Record<string, Component> = {
  "dropdown/default": Default,
  "dropdown/single-selection": SingleSelection,
  "dropdown/custom-indicator": CustomIndicatorNode,
  "dropdown/custom-indicator.split": CustomIndicatorSplit,
  "dropdown/multiple-selection": MultipleSelection,
  "dropdown/section-level-selection": SectionLevelSelection,
  "dropdown/keyboard-shortcuts": KeyboardShortcuts,
  "dropdown/icons": Icons,
  "dropdown/long-press": LongPress,
  "dropdown/descriptions": Descriptions,
  "dropdown/sections": Sections,
  "dropdown/disabled": Disabled,
  "dropdown/submenus": Submenus,
  "dropdown/custom-submenu-indicator": CustomSubmenuIndicator,
  "dropdown/controlled": Controlled,
  "dropdown/controlled-open": ControlledOpen,
  "dropdown/custom-trigger": CustomTrigger,
  "dropdown/narrow": Narrow,
};
