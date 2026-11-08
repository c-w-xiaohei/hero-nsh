import { signal, Text, View } from "nsh";
import { Button, ButtonGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared scenarios for Button and ButtonGroup, written with HeroUI's API only.
 *
 * Split scenarios (SOP 3.3.3, port sheet 4b):
 *   button/icon-only.split, button/sizes.split  the NSH side draws no svg and has no
 *     descendant selector, so icons carry their own size classes (R-011 / R-014):
 *     size-5 sm:size-4 for md / lg, size-4 for sm;
 *   button/render-props  the render prop receives accessors instead of booleans (D17).
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layout(group: string, index: number) {
  return (event: LayoutEvent) =>
    probe("layout")({
      group,
      index,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/* -------------------------------------------------------------------------------------------------
 * Button
 * -----------------------------------------------------------------------------------------------*/

function Basic() {
  return (
    <Stage>
      <Button testID="save-btn">Save</Button>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="danger-soft">Danger soft</Button>
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </Stage>
  );
}

function FullWidth() {
  return (
    <Stage>
      <Button fullWidth>Full width</Button>
    </Stage>
  );
}

/*
 * The NSH side of a split icon scenario: no svg and no descendant selector, so an
 * icon carries its own size classes (R-011 / R-014): size-5 sm:size-4 for md / lg,
 * size-4 for sm. A View stands in for the svg; the reference package draws its own.
 */
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

function IconOnlySplit() {
  return (
    <Stage>
      <Button isIconOnly aria-label="Add small" size="sm">
        <Icon size="sm" />
      </Button>
      <Button isIconOnly aria-label="Add medium" size="md">
        <Icon size="md" />
      </Button>
      <Button isIconOnly aria-label="Add large" size="lg">
        <Icon size="lg" />
      </Button>
    </Stage>
  );
}

function SizesSplit() {
  return (
    <Stage>
      <Button size="sm">Small</Button>
      <Button size="sm">
        <Icon size="sm" />
        Small with icon
      </Button>
      <Button size="md">Medium</Button>
      <Button size="md">
        <Icon size="md" />
        Medium with icon
      </Button>
      <Button size="lg">Large</Button>
      <Button size="lg">
        <Icon size="lg" />
        Large with icon
      </Button>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Button
        isDisabled
        onPress={probe("onPress")}
        onPressDown={probe("onPressDown")}
        onHoverStart={probe("onHoverStart")}
        onHoverEnd={probe("onHoverEnd")}
      >
        Save
      </Button>
    </Stage>
  );
}

function Pending() {
  return (
    <Stage>
      <Button isPending onPress={probe("onPress")}>
        Save
      </Button>
    </Stage>
  );
}

function Hover() {
  return (
    <Stage>
      <Button
        onHoverStart={probe("onHoverStart")}
        onHoverEnd={probe("onHoverEnd")}
        onHoverChange={probe("onHoverChange")}
      >
        Save
      </Button>
      <Button>Other</Button>
    </Stage>
  );
}

function Focus() {
  return (
    <Stage>
      <Button testID="focus-button" onFocus={probe("onFocus")} onBlur={probe("onBlur")}>
        {({ isFocusVisible }) => <Text>{isFocusVisible() ? "Focus visible" : "Save"}</Text>}
      </Button>
      <Button testID="focus-other">Other</Button>
    </Stage>
  );
}

function CustomClass() {
  return (
    <Stage>
      <Button className="text-red-500">Custom</Button>
    </Stage>
  );
}

function RenderProps() {
  return (
    <Stage>
      <Button>{({ isPressed }) => (isPressed() ? "Pressed" : "Save")}</Button>
    </Stage>
  );
}

function Counter() {
  const count = signal(0);
  return (
    <Stage>
      <Button testID="counter-button" onPress={() => count.update((value) => value + 1)}>
        Save {count()}
      </Button>
    </Stage>
  );
}

function Press() {
  return (
    <Stage>
      <Button
        onPress={probe("onPress")}
        onPressDown={probe("onPressDown")}
        onPressUp={probe("onPressUp")}
        onPressChange={probe("onPressChange")}
        onLongPress={probe("onLongPress")}
        onFocus={probe("onFocus")}
      >
        Save
      </Button>
    </Stage>
  );
}

function TabOrder() {
  return (
    <Stage>
      <Button onFocus={probe("focus:First")}>First</Button>
      <Button onFocus={probe("focus:Second")}>Second</Button>
    </Stage>
  );
}

function TabOrderDisabled() {
  return (
    <Stage>
      <Button onFocus={probe("focus:First")}>First</Button>
      <Button isDisabled onFocus={probe("focus:Disabled")}>
        Disabled
      </Button>
      <Button onFocus={probe("focus:Third")}>Third</Button>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ButtonGroup
 * -----------------------------------------------------------------------------------------------*/

function GroupDefault() {
  return (
    <Stage>
      <ButtonGroup>
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupSizes() {
  return (
    <Stage>
      <ButtonGroup size="sm">
        <Button>Small one</Button>
        <Button>Small two</Button>
      </ButtonGroup>
      <ButtonGroup size="md">
        <Button>Medium one</Button>
        <Button>Medium two</Button>
      </ButtonGroup>
      <ButtonGroup size="lg">
        <Button>Large one</Button>
        <Button>Large two</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupVariants() {
  return (
    <Stage>
      <ButtonGroup variant="primary">
        <Button>Primary group</Button>
      </ButtonGroup>
      <ButtonGroup variant="secondary">
        <Button>Secondary group</Button>
      </ButtonGroup>
      <ButtonGroup variant="tertiary">
        <Button>Tertiary group</Button>
      </ButtonGroup>
      <ButtonGroup variant="outline">
        <Button>Outline group</Button>
      </ButtonGroup>
      <ButtonGroup variant="ghost">
        <Button>Ghost group</Button>
      </ButtonGroup>
      <ButtonGroup variant="danger">
        <Button>Danger group</Button>
      </ButtonGroup>
      <ButtonGroup variant="danger-soft">
        <Button>Danger soft group</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupFullWidth() {
  return (
    <Stage>
      <ButtonGroup fullWidth>
        <Button>One</Button>
        <Button>Two</Button>
        <Button>Three</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupDisabled() {
  return (
    <Stage>
      <ButtonGroup isDisabled>
        <Button onPress={probe("onPress")}>Save</Button>
        <Button isDisabled={false}>Override</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupOutline() {
  return (
    <Stage>
      <ButtonGroup variant="outline">
        <Button>One</Button>
        <ButtonGroup.Separator />
        <Button>Two</Button>
        <ButtonGroup.Separator />
        <Button>Three</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupNested() {
  return (
    <Stage>
      <ButtonGroup size="sm" variant="secondary">
        <Stage>
          <Button onPress={probe("onPress")}>Nested</Button>
        </Stage>
      </ButtonGroup>
    </Stage>
  );
}

function GroupPress() {
  return (
    <Stage>
      <ButtonGroup>
        <Button onPress={probe("onPress")}>Save</Button>
        <Button>Cancel</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupOrientation() {
  return (
    <Stage>
      <ButtonGroup orientation="horizontal">
        <Button onLayout={layout("horizontal", 0)}>One</Button>
        <Button onLayout={layout("horizontal", 1)}>Two</Button>
      </ButtonGroup>
      <ButtonGroup orientation="vertical">
        <Button onLayout={layout("vertical", 0)}>Three</Button>
        <Button onLayout={layout("vertical", 1)}>Four</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupSeparator() {
  return (
    <Stage>
      <ButtonGroup>
        <Button>One</Button>
        <ButtonGroup.Separator testID="separator" />
        <Button>Two</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupInherit() {
  return (
    <Stage>
      <ButtonGroup size="sm" variant="secondary">
        <Button onLayout={layout("inherit", 0)}>Save</Button>
      </ButtonGroup>
    </Stage>
  );
}

function GroupOverride() {
  return (
    <Stage>
      <ButtonGroup size="sm" variant="secondary">
        <Button size="lg" variant="primary">
          Override
        </Button>
      </ButtonGroup>
    </Stage>
  );
}

export const buttonScenarios: Record<string, Component> = {
  "button/basic": Basic,
  "button/variants": Variants,
  "button/sizes": Sizes,
  "button/sizes.split": SizesSplit,
  "button/full-width": FullWidth,
  "button/icon-only.split": IconOnlySplit,
  "button/disabled": Disabled,
  "button/pending": Pending,
  "button/hover": Hover,
  "button/focus": Focus,
  "button/custom-class": CustomClass,
  "button/render-props": RenderProps,
  "button/counter": Counter,
  "button/press": Press,
  "button/tab-order": TabOrder,
  "button/tab-order-disabled": TabOrderDisabled,
  "button-group/default": GroupDefault,
  "button-group/sizes": GroupSizes,
  "button-group/variants": GroupVariants,
  "button-group/full-width": GroupFullWidth,
  "button-group/disabled": GroupDisabled,
  "button-group/outline": GroupOutline,
  "button-group/nested": GroupNested,
  "button-group/press": GroupPress,
  "button-group/orientation": GroupOrientation,
  "button-group/separator": GroupSeparator,
  "button-group/inherit": GroupInherit,
  "button-group/override": GroupOverride,
};
