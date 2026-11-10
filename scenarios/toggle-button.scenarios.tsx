import { signal, Text, View } from "nsh";
import { Button, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared ToggleButton / ToggleButtonGroup scenarios, written with HeroUI 3.2.7's
 * API only, so the reference app and this library render the same JSX.
 *
 * Split scenarios (SOP 3.3.3, port sheet 4b):
 *   `.split` render props   HeroUI passes plain booleans, this side passes
 *                           accessors (D17): the selection / focus state is
 *                           printed as text in every case that needs it, since
 *                           nsh/test cannot read aria-pressed or aria-checked.
 *   `.split` controlled     the controlled cases keep their value in an NSH
 *                           signal, which the reference app cannot share.
 *   `.split` icons          NSH has no descendant selector, so an icon carries
 *                           its own size classes (R-015): size-5 sm:size-4 for
 *                           md / lg, size-4 for sm.
 *
 * Also split:
 *   attached / detached / vertical / full-width measure geometry through
 *   onLayout probes; the shared entries below render the same JSX as the
 *   upstream stories so the reference side can screenshot them.
 *
 *   toggle-button/basic                T-001, T-003, T-026 source
 *   toggle-button/variants.split       story Variants: default / ghost x selected
 *   toggle-button/sizes.split          story Sizes: sm / md / lg, with an icon
 *   toggle-button/icon-only.split      story IconOnly: sm / md / lg, no label
 *   toggle-button/render-props.split   T-004, T-013
 *   toggle-button/default-selected.split  T-005, T-024, T-027
 *   toggle-button/controlled.split     T-006
 *   toggle-button/controlled-on.split  T-025
 *   toggle-button/disabled.split       T-011, T-012
 *   toggle-button/hover                T-007
 *   toggle-button/press                T-008
 *   toggle-button/focus.split          T-009, T-010
 *   toggle-button-group/multiple.split          T-018
 *   toggle-button-group/multiple-default.split  T-019
 *   toggle-button-group/single.split            T-020, T-032
 *   toggle-button-group/single-disallow.split   T-021
 *   toggle-button-group/attached       T-016, T-017 (reference geometry)
 *   toggle-button-group/detached       T-017
 *   toggle-button-group/vertical       T-016
 *   toggle-button-group/full-width     T-016
 *   toggle-button-group/separators     T-015
 *   toggle-button-group/disabled       T-022, T-035
 *   toggle-button-group/sizes          T-023
 *   toggle-button-group/idless.split   X-003 (group disabled, member without an id)
 *   toggle-button-group/group-state.split  X-002 (HeroUI-shaped group state)
 *   toggle-button-group/animals.split  T-028 (dogs / cats / dragons)
 *   toggle-button-group/multi-click.split  T-033
 *   toggle-button-group/shift-multi.split  X-001 (three members, multiple)
 *   toggle-button-group/click-single.split T-032
 *   toggle-button-group/keyboard-horizontal  T-029
 *   toggle-button-group/keyboard-vertical    T-030
 *   toggle-button-group/item-disabled.split  T-036
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** Records the frame `name` got, so a test can compare two buttons' positions. */
function frame(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function selectionChanged(keys: Set<string>) {
  probe("onSelectionChange")([...keys].sort());
}

/* -------------------------------------------------------------------------------------------------
 * ToggleButton
 * -----------------------------------------------------------------------------------------------*/

function Basic() {
  return (
    <Stage>
      <ToggleButton testID="toggle">Bold</ToggleButton>
    </Stage>
  );
}

function VariantsSplit() {
  return (
    <Stage>
      <ToggleButton>
        {({ isSelected }) => <Text>{isSelected() ? "Default on" : "Default off"}</Text>}
      </ToggleButton>
      <ToggleButton defaultSelected>
        {({ isSelected }) => <Text>{isSelected() ? "Default on" : "Default off"}</Text>}
      </ToggleButton>
      <ToggleButton variant="ghost">
        {({ isSelected }) => <Text>{isSelected() ? "Ghost on" : "Ghost off"}</Text>}
      </ToggleButton>
      <ToggleButton defaultSelected variant="ghost">
        {({ isSelected }) => <Text>{isSelected() ? "Ghost on" : "Ghost off"}</Text>}
      </ToggleButton>
    </Stage>
  );
}

/** Stands in for the upstream svg; NSH icons carry their own size (R-015). */
function Icon(props: { size: "sm" | "md" | "lg" }) {
  return (
    <View
      class={
        props.size === "sm"
          ? "size-4 rounded-sm bg-accent-foreground"
          : "size-5 sm:size-4 rounded-sm bg-accent-foreground"
      }
    />
  );
}

function SizesSplit() {
  return (
    <Stage>
      <View class="flex-row items-center gap-3">
        <ToggleButton size="sm">
          <Icon size="sm" />
          <Text>Small</Text>
        </ToggleButton>
        <ToggleButton size="md">
          <Icon size="md" />
          <Text>Medium</Text>
        </ToggleButton>
        <ToggleButton size="lg">
          <Icon size="lg" />
          <Text>Large</Text>
        </ToggleButton>
      </View>
      <View class="flex-row items-center gap-3">
        <ToggleButton size="sm">Small</ToggleButton>
        <ToggleButton size="md">Medium</ToggleButton>
        <ToggleButton size="lg">Large</ToggleButton>
      </View>
    </Stage>
  );
}

function IconOnlySplit() {
  return (
    <Stage>
      <View class="flex-row items-center gap-3">
        <ToggleButton isIconOnly aria-label="Like small" size="sm">
          <Icon size="sm" />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label="Like medium" size="md">
          <Icon size="md" />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label="Like large" size="lg">
          <Icon size="lg" />
        </ToggleButton>
      </View>
    </Stage>
  );
}

function RenderPropsSplit() {
  return (
    <Stage>
      <ToggleButton onChange={(isSelected) => probe("onChange")(isSelected)}>
        {({ isSelected }) => <Text>{isSelected() ? "Bold on" : "Bold off"}</Text>}
      </ToggleButton>
    </Stage>
  );
}

function DefaultSelectedSplit() {
  return (
    <Stage>
      <ToggleButton defaultSelected>
        {({ isSelected }) => <Text>{isSelected() ? "Button on" : "Button off"}</Text>}
      </ToggleButton>
    </Stage>
  );
}

function ControlledSplit() {
  const selected = signal(false);

  return (
    <Stage>
      <ToggleButton
        isSelected={selected()}
        onChange={(isSelected) => probe("onChange")(isSelected)}
      >
        {({ isSelected }) => <Text>{isSelected() ? "Bold on" : "Bold off"}</Text>}
      </ToggleButton>
      <Button onPress={() => selected.set(true)}>Set selected</Button>
    </Stage>
  );
}

function ControlledOnSplit() {
  const selected = signal(true);

  return (
    <Stage>
      <ToggleButton
        isSelected={selected()}
        onChange={(isSelected) => probe("onChange")(isSelected)}
      >
        {({ isSelected }) => <Text>{isSelected() ? "Button on" : "Button off"}</Text>}
      </ToggleButton>
    </Stage>
  );
}

function DisabledSplit() {
  return (
    <Stage>
      <ToggleButton
        isDisabled
        onChange={(isSelected) => probe("onChange")(isSelected)}
        onHoverStart={probe("onHoverStart")}
      >
        {({ isSelected }) => <Text>{isSelected() ? "Bold on" : "Bold off"}</Text>}
      </ToggleButton>
      <View testID="away" class="size-10" />
    </Stage>
  );
}

function Hover() {
  return (
    <Stage>
      <ToggleButton onHoverEnd={probe("onHoverEnd")} onHoverStart={probe("onHoverStart")}>
        Bold
      </ToggleButton>
      <View testID="away" class="size-10" />
    </Stage>
  );
}

function Press() {
  return (
    <Stage>
      <ToggleButton
        onPressChange={probe("onPressChange")}
        onPressDown={probe("onPressDown")}
        onPressUp={probe("onPressUp")}
      >
        Bold
      </ToggleButton>
    </Stage>
  );
}

function FocusSplit() {
  return (
    <Stage>
      <ToggleButton
        onChange={(isSelected) => probe("onChange")(isSelected)}
        onFocus={probe("onFocus")}
      >
        {({ isFocusVisible, isSelected }) => (
          <Text>
            {`${isSelected() ? "Bold on" : "Bold off"} ${
              isFocusVisible() ? "Ring" : "NoRing"
            }`}
          </Text>
        )}
      </ToggleButton>
      <ToggleButton>Italic</ToggleButton>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ToggleButtonGroup
 * -----------------------------------------------------------------------------------------------*/

function MultipleSplit() {
  return (
    <Stage>
      <ToggleButtonGroup
        selectionMode="multiple"
        onSelectionChange={(keys) => selectionChanged(keys)}
      >
        <ToggleButton id="bold">
          {({ isSelected }) => <Text>{isSelected() ? "Bold on" : "Bold off"}</Text>}
        </ToggleButton>
        <ToggleButton id="italic">
          {({ isSelected }) => <Text>{isSelected() ? "Italic on" : "Italic off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function MultipleDefaultSplit() {
  return (
    <Stage>
      <ToggleButtonGroup defaultSelectedKeys={["bold"]} selectionMode="multiple">
        <ToggleButton id="bold">
          {({ isSelected }) => <Text>{isSelected() ? "Bold on" : "Bold off"}</Text>}
        </ToggleButton>
        <ToggleButton id="italic">
          {({ isSelected }) => <Text>{isSelected() ? "Italic on" : "Italic off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function SingleSplit() {
  return (
    <Stage>
      <ToggleButtonGroup
        selectionMode="single"
        onSelectionChange={(keys) => selectionChanged(keys)}
      >
        <ToggleButton id="left">
          {({ isSelected }) => <Text>{isSelected() ? "Left on" : "Left off"}</Text>}
        </ToggleButton>
        <ToggleButton id="center">
          {({ isSelected }) => <Text>{isSelected() ? "Center on" : "Center off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function SingleDisallowSplit() {
  return (
    <Stage>
      <ToggleButtonGroup
        disallowEmptySelection
        defaultSelectedKeys={["left"]}
        selectionMode="single"
      >
        <ToggleButton id="left">
          {({ isSelected }) => <Text>{isSelected() ? "Left on" : "Left off"}</Text>}
        </ToggleButton>
        <ToggleButton id="center">
          {({ isSelected }) => <Text>{isSelected() ? "Center on" : "Center off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function Attached() {
  return (
    <Stage>
      <ToggleButtonGroup selectionMode="multiple">
        <ToggleButton id="bold" onLayout={frame("attached-0")}>
          Bold
        </ToggleButton>
        <ToggleButton id="italic" onLayout={frame("attached-1")}>
          Italic
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function Detached() {
  return (
    <Stage>
      <ToggleButtonGroup isDetached selectionMode="multiple">
        <ToggleButton id="bold" onLayout={frame("detached-0")}>
          Bold
        </ToggleButton>
        <ToggleButton id="italic" onLayout={frame("detached-1")}>
          Italic
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function Vertical() {
  return (
    <Stage>
      <ToggleButtonGroup orientation="vertical" selectionMode="multiple">
        <ToggleButton id="bold" onLayout={frame("vertical-0")}>
          Bold
        </ToggleButton>
        <ToggleButton id="italic" onLayout={frame("vertical-1")}>
          Italic
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function FullWidth() {
  return (
    <Stage>
      <ToggleButtonGroup fullWidth selectionMode="multiple">
        <ToggleButton id="bold" onLayout={frame("full-width-0")}>
          Bold
        </ToggleButton>
        <ToggleButton id="italic" onLayout={frame("full-width-1")}>
          Italic
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function Separators() {
  return (
    <Stage>
      <ToggleButtonGroup selectionMode="multiple">
        <ToggleButton id="bold">Bold</ToggleButton>
        <ToggleButton id="italic">
          <ToggleButtonGroup.Separator testID="group-separator" />
          Italic
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function GroupDisabled() {
  return (
    <Stage>
      <ToggleButtonGroup isDisabled selectionMode="multiple">
        <ToggleButton id="bold" onFocus={() => probe("focus")("Bold")}>
          Bold
        </ToggleButton>
        <ToggleButton id="italic" onFocus={() => probe("focus")("Italic")}>
          Italic
        </ToggleButton>
      </ToggleButtonGroup>
      <ToggleButton onChange={(isSelected) => probe("onChange")(isSelected)} testID="focus-btn">
        After
      </ToggleButton>
    </Stage>
  );
}

function GroupSizes() {
  return (
    <Stage>
      <ToggleButtonGroup selectionMode="multiple" size="lg">
        <ToggleButton id="bold">Bold</ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function IdlessSplit() {
  return (
    <Stage>
      <ToggleButtonGroup
        isDisabled
        selectionMode="multiple"
        onSelectionChange={(keys) => selectionChanged(keys)}
      >
        <ToggleButton>
          {({ isSelected }) => <Text>{isSelected() ? "Bold on" : "Bold off"}</Text>}
        </ToggleButton>
        <ToggleButton id="italic">
          {({ isSelected }) => <Text>{isSelected() ? "Italic on" : "Italic off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

/**
 * X-002: the group render props carry HeroUI's `ToggleGroupState`
 * (react-spectrum/packages/react-aria-components/src/ToggleButtonGroup.tsx:46),
 * read here through its plain members. The state is printed once, so it fits
 * the group's fixed height; the mutators are called from buttons after it.
 */
function GroupStateSplit() {
  let toggleBold = () => {};
  let selectBold = () => {};
  let clearBold = () => {};

  return (
    <Stage>
      <ToggleButtonGroup
        defaultSelectedKeys={["bold"]}
        disallowEmptySelection
        selectionMode="multiple"
      >
        {({ state }) => {
          toggleBold = () => state.toggleKey("bold");
          selectBold = () => state.setSelected("bold", true);
          clearBold = () => state.setSelected("bold", false);

          return (
            <View class="flex-row items-center gap-2">
              <ToggleButton id="bold">Bold</ToggleButton>
              <ToggleButton id="italic">Italic</ToggleButton>
              <Text testID="group-state">
                {`keys=${[...state.selectedKeys].sort().join("+") || "none"} mode=${
                  state.selectionMode
                } disallow=${state.disallowEmptySelection} disabled=${state.isDisabled} bold=${state.isSelected(
                  "bold",
                )} italic=${state.isSelected("italic")}`}
              </Text>
            </View>
          );
        }}
      </ToggleButtonGroup>
      <Button onPress={() => toggleBold()}>Toggle bold</Button>
      <Button onPress={() => selectBold()}>Select bold</Button>
      <Button onPress={() => clearBold()}>Clear bold</Button>
      <ToggleButtonGroup isDisabled>
        {({ state }) => (
          <Text testID="group-disabled-state">
            {`disabled=${state.isDisabled} mode=${state.selectionMode} keys=${
              [...state.selectedKeys].sort().join("+") || "none"
            }`}
          </Text>
        )}
      </ToggleButtonGroup>
    </Stage>
  );
}

function AnimalsSplit() {
  return (
    <Stage>
      <ToggleButtonGroup
        defaultSelectedKeys={["cats"]}
        selectionMode="single"
        onSelectionChange={(keys) => selectionChanged(keys)}
      >
        <ToggleButton id="dogs">
          {({ isSelected }) => <Text>{isSelected() ? "Dogs on" : "Dogs off"}</Text>}
        </ToggleButton>
        <ToggleButton id="cats">
          {({ isSelected }) => <Text>{isSelected() ? "Cats on" : "Cats off"}</Text>}
        </ToggleButton>
        <ToggleButton id="dragons">
          {({ isSelected }) => <Text>{isSelected() ? "Dragons on" : "Dragons off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function MultiClickSplit() {
  return (
    <Stage>
      <ToggleButtonGroup selectionMode="multiple">
        <ToggleButton id="dogs">
          {({ isSelected }) => <Text>{isSelected() ? "Dogs on" : "Dogs off"}</Text>}
        </ToggleButton>
        <ToggleButton id="cats">
          {({ isSelected }) => <Text>{isSelected() ? "Cats on" : "Cats off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function ShiftMultiSplit() {
  return (
    <Stage>
      <ToggleButtonGroup
        selectionMode="multiple"
        onSelectionChange={(keys) => selectionChanged(keys)}
      >
        <ToggleButton id="dogs">
          {({ isSelected }) => <Text>{isSelected() ? "Dogs on" : "Dogs off"}</Text>}
        </ToggleButton>
        <ToggleButton id="cats">
          {({ isSelected }) => <Text>{isSelected() ? "Cats on" : "Cats off"}</Text>}
        </ToggleButton>
        <ToggleButton id="dragons">
          {({ isSelected }) => <Text>{isSelected() ? "Dragons on" : "Dragons off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function ClickSingleSplit() {
  return (
    <Stage>
      <ToggleButtonGroup
        selectionMode="single"
        onSelectionChange={(keys) => selectionChanged(keys)}
      >
        <ToggleButton id="dogs">
          {({ isSelected }) => <Text>{isSelected() ? "Dogs on" : "Dogs off"}</Text>}
        </ToggleButton>
        <ToggleButton id="cats">
          {({ isSelected }) => <Text>{isSelected() ? "Cats on" : "Cats off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function KeyboardHorizontal() {
  return (
    <Stage>
      <ToggleButtonGroup selectionMode="multiple">
        <ToggleButton
          id="dogs"
          onFocus={() => probe("focus")("Dogs")}
          onLayout={frame("horizontal-0")}
        >
          Dogs
        </ToggleButton>
        <ToggleButton
          id="cats"
          onFocus={() => probe("focus")("Cats")}
          onLayout={frame("horizontal-1")}
        >
          Cats
        </ToggleButton>
        <ToggleButton
          id="dragons"
          onFocus={() => probe("focus")("Dragons")}
          onLayout={frame("horizontal-2")}
        >
          Dragons
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function KeyboardVertical() {
  return (
    <Stage>
      <ToggleButtonGroup orientation="vertical" selectionMode="multiple">
        <ToggleButton
          id="dogs"
          onFocus={() => probe("focus")("Dogs")}
          onLayout={frame("kv-0")}
        >
          Dogs
        </ToggleButton>
        <ToggleButton
          id="cats"
          onFocus={() => probe("focus")("Cats")}
          onLayout={frame("kv-1")}
        >
          Cats
        </ToggleButton>
        <ToggleButton
          id="dragons"
          onFocus={() => probe("focus")("Dragons")}
          onLayout={frame("kv-2")}
        >
          Dragons
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

function ItemDisabledSplit() {
  return (
    <Stage>
      <ToggleButtonGroup
        selectionMode="single"
        onSelectionChange={(keys) => selectionChanged(keys)}
      >
        <ToggleButton id="dogs">
          {({ isSelected }) => <Text>{isSelected() ? "Dogs on" : "Dogs off"}</Text>}
        </ToggleButton>
        <ToggleButton id="cats" isDisabled>
          {({ isSelected }) => <Text>{isSelected() ? "Cats on" : "Cats off"}</Text>}
        </ToggleButton>
        <ToggleButton id="dragons">
          {({ isSelected }) => <Text>{isSelected() ? "Dragons on" : "Dragons off"}</Text>}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stage>
  );
}

export const toggleButtonScenarios: Record<string, Component> = {
  "toggle-button/basic": Basic,
  "toggle-button/variants.split": VariantsSplit,
  "toggle-button/sizes.split": SizesSplit,
  "toggle-button/icon-only.split": IconOnlySplit,
  "toggle-button/render-props.split": RenderPropsSplit,
  "toggle-button/default-selected.split": DefaultSelectedSplit,
  "toggle-button/controlled.split": ControlledSplit,
  "toggle-button/controlled-on.split": ControlledOnSplit,
  "toggle-button/disabled.split": DisabledSplit,
  "toggle-button/hover": Hover,
  "toggle-button/press": Press,
  "toggle-button/focus.split": FocusSplit,
  "toggle-button-group/multiple.split": MultipleSplit,
  "toggle-button-group/multiple-default.split": MultipleDefaultSplit,
  "toggle-button-group/single.split": SingleSplit,
  "toggle-button-group/single-disallow.split": SingleDisallowSplit,
  "toggle-button-group/attached": Attached,
  "toggle-button-group/detached": Detached,
  "toggle-button-group/vertical": Vertical,
  "toggle-button-group/full-width": FullWidth,
  "toggle-button-group/separators": Separators,
  "toggle-button-group/disabled": GroupDisabled,
  "toggle-button-group/sizes": GroupSizes,
  "toggle-button-group/idless.split": IdlessSplit,
  "toggle-button-group/group-state.split": GroupStateSplit,
  "toggle-button-group/animals.split": AnimalsSplit,
  "toggle-button-group/multi-click.split": MultiClickSplit,
  "toggle-button-group/shift-multi.split": ShiftMultiSplit,
  "toggle-button-group/click-single.split": ClickSingleSplit,
  "toggle-button-group/keyboard-horizontal": KeyboardHorizontal,
  "toggle-button-group/keyboard-vertical": KeyboardVertical,
  "toggle-button-group/item-disabled.split": ItemDisabledSplit,
};
