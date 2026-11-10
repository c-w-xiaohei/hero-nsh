import { signal, Text, View } from "nsh";
import {
  Avatar,
  Description,
  EmptyState,
  ErrorMessage,
  Label,
  Tag,
  TagGroup,
} from "@heroui/react";
import type { SelectionValue } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for Tag and TagGroup, written with HeroUI's API only.
 *
 * The upstream stories (packages/react/src/components/tag-group/tag-group.stories.tsx)
 * are the source of `default` (Default), `sizes` (Sizes), `variants` (Variants),
 * `disabled` (Disabled), `selection-modes` (SelectionModes), `controlled`
 * (Controlled), `error-message` (WithErrorMessage), `prefix` (WithPrefix),
 * `remove-button` (WithRemoveButton), `list-data` (WithListData) and
 * `custom-remove.split` (Custom Remove Button through render props).
 *
 * Differences forced by the port sheet (§4b):
 *   - The Default story prefixes each tag with an Iconify icon; that icon is
 *     not a component of this library, so the slot stays empty there. `prefix`
 *     uses a text glyph and an Avatar (Avatar has landed) instead.
 *   - `custom-remove.split` takes the Tag's render props, whose parameter is an
 *     accessor object here and a boolean upstream (D17).
 *   - `selection-modes`, `controlled` and `error-message` hold their selection
 *     in an `nsh` signal, which is this host's state (the upstream stories use
 *     React state; the split is the same one ListBox records).
 */

/* -------------------------------------------------------------------------------------------------
 * Default (story Default): the prefix slots are left empty (see header)
 * -----------------------------------------------------------------------------------------------*/

function Default() {
  return (
    <Stage>
      <TagGroup aria-label="Tags" selectionMode="single">
        <TagGroup.List>
          <Tag id="default-news">News</Tag>
          <Tag id="default-travel">Travel</Tag>
          <Tag id="default-gaming">Gaming</Tag>
          <Tag id="default-shopping">Shopping</Tag>
        </TagGroup.List>
      </TagGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Sizes (story Sizes)
 * -----------------------------------------------------------------------------------------------*/

function Sizes() {
  return (
    <Stage>
      <View class="flex flex-col gap-6">
        <TagGroup selectionMode="single" size="sm">
          <Label>Small</Label>
          <TagGroup.List>
            <Tag>News</Tag>
            <Tag>Travel</Tag>
            <Tag>Gaming</Tag>
          </TagGroup.List>
        </TagGroup>
        <TagGroup selectionMode="single" size="md">
          <Label>Medium</Label>
          <TagGroup.List>
            <Tag>News</Tag>
            <Tag>Travel</Tag>
            <Tag>Gaming</Tag>
          </TagGroup.List>
        </TagGroup>
        <TagGroup selectionMode="single" size="lg">
          <Label>Large</Label>
          <TagGroup.List>
            <Tag>News</Tag>
            <Tag>Travel</Tag>
            <Tag>Gaming</Tag>
          </TagGroup.List>
        </TagGroup>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Variants (story Variants)
 * -----------------------------------------------------------------------------------------------*/

function Variants() {
  return (
    <Stage>
      <View class="flex flex-col gap-8">
        <TagGroup selectionMode="single" variant="default">
          <Label>Default</Label>
          <TagGroup.List>
            <Tag>News</Tag>
            <Tag>Travel</Tag>
            <Tag>Gaming</Tag>
          </TagGroup.List>
        </TagGroup>
        <TagGroup selectionMode="single" variant="surface">
          <Label>Surface</Label>
          <TagGroup.List>
            <Tag>News</Tag>
            <Tag>Travel</Tag>
            <Tag>Gaming</Tag>
          </TagGroup.List>
        </TagGroup>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Disabled (story Disabled): an individually disabled tag and disabledKeys
 * -----------------------------------------------------------------------------------------------*/

function Disabled() {
  return (
    <Stage>
      <View class="flex flex-col gap-4">
        <TagGroup selectionMode="single">
          <Label>Disabled Tags</Label>
          <TagGroup.List>
            <Tag isDisabled>News</Tag>
            <Tag>Travel</Tag>
            <Tag isDisabled>Gaming</Tag>
          </TagGroup.List>
          <Description>Some tags are disabled</Description>
        </TagGroup>
        <TagGroup disabledKeys={["disabled-travel"]} selectionMode="single">
          <Label>Disabled Keys</Label>
          <TagGroup.List>
            <Tag id="disabled-news">News</Tag>
            <Tag id="disabled-travel">Travel</Tag>
            <Tag id="disabled-gaming">Gaming</Tag>
          </TagGroup.List>
          <Description>Tags disabled via disabledKeys prop</Description>
        </TagGroup>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * SelectionModes (story SelectionModes)
 * -----------------------------------------------------------------------------------------------*/

function SelectionModes() {
  const singleSelected = signal<SelectionValue>(new Set(["news"]));
  const multipleSelected = signal<SelectionValue>(new Set(["news", "travel"]));

  return (
    <Stage>
      <View class="flex flex-col gap-8">
        <TagGroup
          selectedKeys={singleSelected()}
          selectionMode="single"
          onSelectionChange={(keys) => singleSelected.set(keys)}
        >
          <Label>Single Selection</Label>
          <TagGroup.List>
            <Tag>News</Tag>
            <Tag>Travel</Tag>
            <Tag>Gaming</Tag>
            <Tag>Shopping</Tag>
          </TagGroup.List>
          <Description>Choose one category</Description>
        </TagGroup>
        <TagGroup
          selectedKeys={multipleSelected()}
          selectionMode="multiple"
          onSelectionChange={(keys) => multipleSelected.set(keys)}
        >
          <Label>Multiple Selection</Label>
          <TagGroup.List>
            <Tag>News</Tag>
            <Tag>Travel</Tag>
            <Tag>Gaming</Tag>
            <Tag>Shopping</Tag>
          </TagGroup.List>
          <Description>Choose multiple categories</Description>
        </TagGroup>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Controlled (story Controlled): the selection lives outside the group
 * -----------------------------------------------------------------------------------------------*/

function Controlled() {
  const selected = signal<SelectionValue>(new Set(["news", "travel"]));

  return (
    <Stage>
      <View class="flex flex-col gap-3">
        <TagGroup
          selectedKeys={selected()}
          selectionMode="multiple"
          onSelectionChange={(keys) => selected.set(keys)}
        >
          <Label>Categories (controlled)</Label>
          <TagGroup.List>
            <Tag id="news">News</Tag>
            <Tag id="travel">Travel</Tag>
            <Tag id="gaming">Gaming</Tag>
            <Tag id="shopping">Shopping</Tag>
          </TagGroup.List>
          <Description>
            {`Selected: ${
              selected() === "all" ? "all" : Array.from(selected()).join(", ") || "None"
            }`}
          </Description>
        </TagGroup>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithErrorMessage (story WithErrorMessage)
 * -----------------------------------------------------------------------------------------------*/

function WithErrorMessage() {
  const selected = signal<SelectionValue>(new Set<string>());
  const count = () => (selected() === "all" ? 5 : Array.from(selected()).length);
  const isInvalid = () => count() === 0;

  return (
    <Stage>
      <TagGroup
        selectedKeys={selected()}
        selectionMode="multiple"
        onSelectionChange={(keys) => selected.set(keys)}
      >
        <Label>Amenities</Label>
        <TagGroup.List>
          <Tag id="laundry">Laundry</Tag>
          <Tag id="fitness">Fitness center</Tag>
          <Tag id="parking">Parking</Tag>
          <Tag id="pool">Swimming pool</Tag>
          <Tag id="breakfast">Breakfast</Tag>
        </TagGroup.List>
        <Description>
          {isInvalid() ? "Select at least one category" : `Selected: ${count()}`}
        </Description>
        <If when={isInvalid()}>
          <ErrorMessage>Please select at least one category</ErrorMessage>
        </If>
      </TagGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithPrefix (story WithPrefix): a glyph stands in for the Iconify icon
 * -----------------------------------------------------------------------------------------------*/

function PrefixGlyph() {
  return <Text class="text-xs text-current">◆</Text>;
}

function WithPrefix() {
  return (
    <Stage>
      <View class="flex flex-col gap-8">
        <TagGroup selectionMode="single">
          <Label>With Icons</Label>
          <TagGroup.List>
            <Tag>
              <PrefixGlyph />
              News
            </Tag>
            <Tag>
              <PrefixGlyph />
              Travel
            </Tag>
            <Tag>
              <PrefixGlyph />
              Gaming
            </Tag>
            <Tag>
              <PrefixGlyph />
              Shopping
            </Tag>
          </TagGroup.List>
          <Description>Tags with icons</Description>
        </TagGroup>
        <TagGroup selectionMode="single">
          <Label>With Avatars</Label>
          <TagGroup.List>
            <Tag>
              <Avatar className="size-4">
                <Avatar.Fallback>F</Avatar.Fallback>
              </Avatar>
              Fred
            </Tag>
            <Tag>
              <Avatar className="size-4">
                <Avatar.Fallback>M</Avatar.Fallback>
              </Avatar>
              Michael
            </Tag>
            <Tag>
              <Avatar className="size-4">
                <Avatar.Fallback>J</Avatar.Fallback>
              </Avatar>
              Jane
            </Tag>
          </TagGroup.List>
          <Description>Tags with avatars</Description>
        </TagGroup>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithRemoveButton (story WithRemoveButton): default and compound custom button
 * -----------------------------------------------------------------------------------------------*/

type NamedTag = { id: string; name: string };

const INITIAL_TAGS: NamedTag[] = [
  { id: "news", name: "News" },
  { id: "travel", name: "Travel" },
  { id: "gaming", name: "Gaming" },
  { id: "shopping", name: "Shopping" },
];

const INITIAL_FRAMEWORKS: NamedTag[] = [
  { id: "react", name: "React" },
  { id: "vue", name: "Vue" },
  { id: "angular", name: "Angular" },
  { id: "svelte", name: "Svelte" },
];

function removeKeys(keys: Set<unknown>, current: NamedTag[]): NamedTag[] {
  return current.filter((entry) => !keys.has(entry.id));
}

function WithRemoveButton() {
  const tags = signal<NamedTag[]>(INITIAL_TAGS);
  const frameworks = signal<NamedTag[]>(INITIAL_FRAMEWORKS);

  return (
    <Stage>
      <View class="flex flex-col gap-8">
        <View class="w-sm">
          <TagGroup
            selectionMode="single"
            onRemove={(keys) => tags.set(removeKeys(keys, tags()))}
          >
            <Label>Default Remove Button</Label>
            <TagGroup.List
              items={tags()}
              renderEmptyState={() => (
                <EmptyState className="p-1">No categories found</EmptyState>
              )}
            >
              {(tag) => (
                <Tag id={tag.id} textValue={tag.name}>
                  {tag.name}
                </Tag>
              )}
            </TagGroup.List>
            <Description>Click the X to remove tags</Description>
          </TagGroup>
        </View>
        <View class="w-md">
          <TagGroup
            selectionMode="single"
            onRemove={(keys) => frameworks.set(removeKeys(keys, frameworks()))}
          >
            <Label>Custom Remove Button (Compound Component)</Label>
            <TagGroup.List
              items={frameworks()}
              renderEmptyState={() => (
                <EmptyState className="p-1">No frameworks found</EmptyState>
              )}
            >
              {(tag) => (
                <Tag id={tag.id} textValue={tag.name}>
                  {tag.name}
                  <Tag.RemoveButton>
                    <Text>×</Text>
                  </Tag.RemoveButton>
                </Tag>
              )}
            </TagGroup.List>
            <Description>Custom remove button using compound component pattern</Description>
          </TagGroup>
        </View>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * WithListData (story WithListData): items + function child
 * -----------------------------------------------------------------------------------------------*/

type TeamMember = { id: string; name: string; fallback: string };

const TEAM: TeamMember[] = [
  { id: "fred", name: "Fred", fallback: "F" },
  { id: "michael", name: "Michael", fallback: "M" },
  { id: "jane", name: "Jane", fallback: "J" },
  { id: "alice", name: "Alice", fallback: "A" },
  { id: "bob", name: "Bob", fallback: "B" },
  { id: "charlie", name: "Charlie", fallback: "C" },
];

function WithListData() {
  const selected = signal<SelectionValue>(new Set(["fred", "michael"]));

  return (
    <Stage>
      <View class="w-sm">
        <TagGroup
          selectedKeys={selected()}
          selectionMode="multiple"
          onSelectionChange={(keys) => selected.set(keys)}
        >
          <Label>Team Members</Label>
          <TagGroup.List
            items={TEAM}
            renderEmptyState={() => <EmptyState className="p-1">No team members</EmptyState>}
          >
            {(user) => (
              <Tag id={user.id} textValue={user.name}>
                <Avatar className="size-4">
                  <Avatar.Fallback>{user.fallback}</Avatar.Fallback>
                </Avatar>
                {user.name}
              </Tag>
            )}
          </TagGroup.List>
          <Description>Select team members for your project</Description>
        </TagGroup>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Custom Remove Button through the Tag's render props (story WithRemoveButton,
 * second group). Split (SOP 3.3.3): `allowsRemoving` is an accessor here.
 * -----------------------------------------------------------------------------------------------*/

function CustomRemoveSplit() {
  const frameworks = signal<NamedTag[]>(INITIAL_FRAMEWORKS);

  return (
    <Stage>
      <View class="w-md">
        <TagGroup
          selectionMode="single"
          onRemove={(keys) => frameworks.set(removeKeys(keys, frameworks()))}
        >
          <Label>Custom Remove Button (Render Props)</Label>
          <TagGroup.List
            items={frameworks()}
            renderEmptyState={() => <EmptyState className="p-1">No frameworks found</EmptyState>}
          >
            {(tag) => (
              <Tag id={tag.id} textValue={tag.name}>
                {(values) => [
                  <Text>{tag.name}</Text>,
                  <If when={values.allowsRemoving()}>
                    <Tag.RemoveButton>
                      <Text>×</Text>
                    </Tag.RemoveButton>
                  </If>,
                ]}
              </Tag>
            )}
          </TagGroup.List>
          <Description>Custom remove button with render props</Description>
        </TagGroup>
      </View>
    </Stage>
  );
}

export const tagScenarios: Record<string, Component> = {
  "tag/default": Default,
  "tag/sizes": Sizes,
  "tag/variants": Variants,
  "tag/disabled": Disabled,
  "tag/selection-modes": SelectionModes,
  "tag/controlled": Controlled,
  "tag/error-message": WithErrorMessage,
  "tag/prefix": WithPrefix,
  "tag/remove-button": WithRemoveButton,
  "tag/list-data": WithListData,
  "tag/custom-remove.split": CustomRemoveSplit,
};
