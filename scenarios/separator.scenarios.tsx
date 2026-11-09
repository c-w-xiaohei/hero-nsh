import { signal, Text, View } from "nsh";
import { Button, Separator } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared Separator scenarios. They use only the HeroUI API so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * The upstream tests render `<Separator />` and read DOM attributes; NSH has
 * none of them, so the entries here reproduce the geometry the upstream
 * attributes stand for (`onLayout` → `probe`) and split the `it.each` cases of
 * the HeroUI and Kobalte suites into one entry per orientation, each holding a
 * single divider so counts stay meaningful.
 *
 * `separator/custom` is the className-override entry from the port sheet;
 * `separator/custom-vertical*` are the T-008 fixture: the upstream `render` prop
 * and ref have no NSH counterpart, so the same className, orientation and
 * variant are placed directly on the separator.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layout(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function Default() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Separator testID="separator" onLayout={layout("horizontal")} />
      </View>
    </Stage>
  );
}

function Vertical() {
  return (
    <Stage>
      <View class="h-5 w-[300px] flex-row items-center gap-4">
        <Text>Blog</Text>
        <Separator orientation="vertical" testID="vertical" onLayout={layout("vertical")} />
        <Text>Docs</Text>
      </View>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <View class="w-[300px] flex-col gap-4">
        <Separator variant="default" />
        <Separator variant="secondary" />
        <Separator variant="tertiary" />
      </View>
    </Stage>
  );
}

function Decorative() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Separator isDecorative testID="divider" />
      </View>
    </Stage>
  );
}

function DecorativeVertical() {
  return (
    <Stage>
      <View class="h-5 w-[300px] flex-row items-center gap-4">
        <Text>Blog</Text>
        <Separator isDecorative orientation="vertical" testID="divider" />
        <Text>Docs</Text>
      </View>
    </Stage>
  );
}

function DecorativeHr() {
  return (
    <Stage>
      <View class="w-[300px]">
        <Separator isDecorative elementType="hr" testID="divider" />
      </View>
    </Stage>
  );
}

function Toggle() {
  const decorative = signal(true);

  return (
    <Stage>
      <Button testID="toggle" onPress={() => decorative.update((value) => !value)}>
        Toggle semantics
      </Button>
      <View class="w-[300px]">
        <Separator isDecorative={decorative()} testID="divider" />
      </View>
    </Stage>
  );
}

function Custom() {
  return (
    <Stage>
      <View class="w-[300px] flex-col">
        <Separator className="my-4" />
        <Separator className="bg-separator-secondary" />
      </View>
    </Stage>
  );
}

function CustomVertical() {
  return (
    <Stage>
      <View class="h-5 w-[300px] flex-row items-center">
        <Separator
          className="my-4"
          orientation="vertical"
          variant="secondary"
          testID="custom-divider"
        />
      </View>
    </Stage>
  );
}

function CustomVerticalDecorative() {
  return (
    <Stage>
      <View class="h-5 w-[300px] flex-row items-center">
        <Separator
          className="my-4"
          isDecorative
          orientation="vertical"
          variant="secondary"
          testID="custom-divider"
        />
      </View>
    </Stage>
  );
}

export const separatorScenarios: Record<string, Component> = {
  "separator/default": Default,
  "separator/vertical": Vertical,
  "separator/variants": Variants,
  "separator/decorative": Decorative,
  "separator/decorative-vertical": DecorativeVertical,
  "separator/decorative-hr": DecorativeHr,
  "separator/toggle": Toggle,
  "separator/custom": Custom,
  "separator/custom-vertical": CustomVertical,
  "separator/custom-vertical-decorative": CustomVerticalDecorative,
};
