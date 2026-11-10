import { View } from "nsh";
import {
  Button,
  ButtonGroup,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared Toolbar scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX (SOP 3.3).
 *
 * The upstream tests read BEM modifiers, `data-slot` and `aria-orientation`,
 * none of which NSH has (D18, port sheet §8). Where a modifier has a visible
 * consequence the scenarios measure it through `onLayout` probes instead:
 *
 *   toolbar/press        T-001, T-005  labelled toolbar, pressable children
 *   toolbar/horizontal   T-002, T-006  default axis (one row) and focus chain
 *   toolbar/vertical     T-003         vertical axis (one column)
 *   toolbar/attached     T-004         `p-1`: root frame plus child frame
 *   toolbar/nested-group T-007, T-008  nested ToggleButtonGroup and Save
 *   toolbar/nested-toolbar  X-001      a vertical Toolbar inside a horizontal one
 *   toolbar/stories-*    R-006 … R-019, reference geometry for the screenshots
 *
 * Focus is written to the probe from `onFocus`, because nsh/test cannot read
 * focus (SOP 3.2); the selection callback stores the `Set` as a sorted array,
 * because `JSON.stringify(new Set(...))` is `{}`.
 *
 * The story entries stand in for the three glyphs with a `View` square, as the
 * ToggleButton stories do: NSH icons carry their own size (R-015) and the
 * upstream `@iconify` glyphs are not part of this library's API.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** Records the frame `name` got, so a test can compare two controls' positions. */
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

function focus(name: string) {
  return () => probe("focus")(name);
}

function selectionChanged(keys: Set<string>) {
  probe("onSelectionChange")([...keys].sort());
}

function Glyph() {
  return <View class="size-4 rounded-sm bg-accent-foreground" />;
}

function Press() {
  return (
    <Stage>
      <Toolbar aria-label="Text formatting">
        <Button onFocus={focus("Undo")} onPress={probe("onPress")}>
          Undo
        </Button>
        <Button onFocus={focus("Redo")}>Redo</Button>
      </Toolbar>
    </Stage>
  );
}

function Horizontal() {
  return (
    <Stage>
      <Toolbar aria-label="Editor toolbar">
        <Button className="h-10" onFocus={focus("Undo")} onLayout={frame("horizontal-0")}>
          Undo
        </Button>
        <Button className="h-10" onFocus={focus("Redo")} onLayout={frame("horizontal-1")}>
          Redo
        </Button>
      </Toolbar>
    </Stage>
  );
}

function Vertical() {
  return (
    <Stage>
      <Toolbar aria-label="Tools" orientation="vertical">
        <Button className="w-20" onLayout={frame("vertical-0")}>
          Undo
        </Button>
        <Button className="w-20" onLayout={frame("vertical-1")}>
          Redo
        </Button>
      </Toolbar>
    </Stage>
  );
}

function Attached() {
  return (
    <Stage>
      <Toolbar isAttached aria-label="Attached toolbar" onLayout={frame("attached-root")}>
        <Button onLayout={frame("attached-0")}>Undo</Button>
      </Toolbar>
    </Stage>
  );
}

function NestedGroup() {
  return (
    <Stage>
      <Toolbar aria-label="Editor">
        <ToggleButtonGroup
          aria-label="Text style"
          selectionMode="multiple"
          onSelectionChange={(keys) => selectionChanged(keys)}
        >
          <ToggleButton id="bold" onFocus={focus("Bold")}>
            Bold
          </ToggleButton>
          <ToggleButton id="italic" onFocus={focus("Italic")}>
            Italic
          </ToggleButton>
        </ToggleButtonGroup>
        <Button onFocus={focus("Save")}>Save</Button>
      </Toolbar>
    </Stage>
  );
}

/*
 * A vertical Toolbar nested in a horizontal one: each toolbar's groups must
 * take that toolbar's own axis, not the outermost one. The inner groups carry
 * the frames (X-001): the ToggleButtonGroup reads its direction from the axis,
 * the ButtonGroup from `justify-content`, which only shows while the group is
 * wider than its members — hence `fullWidth` and the longer labels above it.
 */
function NestedToolbar() {
  return (
    <Stage>
      <Toolbar aria-label="Editor">
        <ToggleButtonGroup aria-label="Text style" selectionMode="multiple">
          <ToggleButton id="bold" onLayout={frame("nested-outer-0")}>
            Bold
          </ToggleButton>
          <ToggleButton id="italic" onLayout={frame("nested-outer-1")}>
            Italic
          </ToggleButton>
        </ToggleButtonGroup>
        <Toolbar aria-label="Tools" orientation="vertical">
          <ToggleButtonGroup aria-label="Align" selectionMode="multiple">
            <ToggleButton id="left" onLayout={frame("nested-inner-0")}>
              Align left
            </ToggleButton>
            <ToggleButton id="right" onLayout={frame("nested-inner-1")}>
              Align right
            </ToggleButton>
          </ToggleButtonGroup>
          <ButtonGroup fullWidth onLayout={frame("nested-inner-group")}>
            <Button onLayout={frame("nested-inner-button-0")}>Cut</Button>
            <Button onLayout={frame("nested-inner-button-1")}>Copy</Button>
          </ButtonGroup>
        </Toolbar>
      </Toolbar>
    </Stage>
  );
}

function StoriesDefault() {
  return (
    <Stage>
      <Toolbar aria-label="Text formatting">
        <ToggleButtonGroup aria-label="Text style" selectionMode="multiple">
          <ToggleButton isIconOnly aria-label="Bold" id="bold">
            <Glyph />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Italic" id="italic">
            <ToggleButtonGroup.Separator />
            <Glyph />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Underline" id="underline">
            <ToggleButtonGroup.Separator />
            <Glyph />
          </ToggleButton>
        </ToggleButtonGroup>
        <Separator />
        <ButtonGroup>
          <Button isIconOnly aria-label="Copy" variant="secondary">
            <Glyph />
          </Button>
          <ButtonGroup.Separator />
          <Button isIconOnly aria-label="Cut" variant="secondary">
            <Glyph />
          </Button>
        </ButtonGroup>
      </Toolbar>
    </Stage>
  );
}

function StoriesVertical() {
  return (
    <Stage>
      <Toolbar aria-label="Tools" orientation="vertical">
        <ToggleButtonGroup aria-label="Text style" selectionMode="multiple">
          <ToggleButton isIconOnly aria-label="Bold" id="bold">
            <Glyph />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Italic" id="italic">
            <ToggleButtonGroup.Separator />
            <Glyph />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Underline" id="underline">
            <ToggleButtonGroup.Separator />
            <Glyph />
          </ToggleButton>
        </ToggleButtonGroup>
        <Separator />
        <ButtonGroup>
          <Button isIconOnly aria-label="Undo" variant="secondary">
            <Glyph />
          </Button>
          <ButtonGroup.Separator />
          <Button isIconOnly aria-label="Redo" variant="secondary">
            <Glyph />
          </Button>
        </ButtonGroup>
      </Toolbar>
    </Stage>
  );
}

function StoriesAttached() {
  return (
    <Stage>
      <Toolbar isAttached aria-label="Attached toolbar">
        <ToggleButtonGroup aria-label="Text style" selectionMode="multiple">
          <ToggleButton isIconOnly aria-label="Bold" id="bold">
            <Glyph />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Italic" id="italic">
            <ToggleButtonGroup.Separator />
            <Glyph />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label="Underline" id="underline">
            <ToggleButtonGroup.Separator />
            <Glyph />
          </ToggleButton>
        </ToggleButtonGroup>
        <Separator />
        <ButtonGroup>
          <Button isIconOnly aria-label="Copy" variant="secondary">
            <Glyph />
          </Button>
          <ButtonGroup.Separator />
          <Button isIconOnly aria-label="Cut" variant="secondary">
            <Glyph />
          </Button>
        </ButtonGroup>
      </Toolbar>
    </Stage>
  );
}

export const toolbarScenarios: Record<string, Component> = {
  "toolbar/press": Press,
  "toolbar/horizontal": Horizontal,
  "toolbar/vertical": Vertical,
  "toolbar/attached": Attached,
  "toolbar/nested-group": NestedGroup,
  "toolbar/nested-toolbar": NestedToolbar,
  "toolbar/stories-default": StoriesDefault,
  "toolbar/stories-vertical": StoriesVertical,
  "toolbar/stories-attached": StoriesAttached,
};
