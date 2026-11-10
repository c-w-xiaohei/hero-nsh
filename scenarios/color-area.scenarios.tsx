import { signal, Text, View } from "nsh";
import { ColorArea, ColorSwatch } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared ColorArea scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app (npm @heroui/react 3.2.7) and this library render the same JSX.
 * The story file is color-area.stories.tsx; the four upstream test cases only
 * render the default tree and the showDots modifier (port sheet 4b).
 *
 *   color-area/default          T-001: one labelled area with a Thumb; also the
 *                               light/dark screenshot baseline for the gradient,
 *                               thumb and border (R-019, R-005)
 *   color-area/show-dots        T-003: the same tree plus `showDots`; upstream
 *                               asserts the BEM modifier, which D18 drops, so
 *                               the dot layer is checked by the screenshot only
 *   color-area/channels         story ColorChannels: default HSL, RGB red/green
 *                               and RGB blue/green, the only visual evidence for
 *                               R-019 and the three-layer RGB build (R-029)
 *   color-area/disabled         story Disabled: isDisabled (R-006, R-018)
 *   color-area/controlled       story Controlled: `value` + `onChange` echo
 *   color-area/with-preview     story WithColorPreview: the area next to an
 *                               already ported ColorSwatch
 *   color-area/all              showDots x colorSpace x isDisabled, the full
 *                               variant matrix for the pixel baselines (§7)
 *   color-area/render-props.split
 *                               the function forms of className / style /
 *                               children on Root and Thumb; the argument is a
 *                               values object on the HeroUI side and an accessors
 *                               object here (D17), so the two sides are written
 *                               separately
 *
 * Every area carries `aria-label="Color"`: the stories leave it out, but both
 * the group and the thumb take their accessible name from it (§1).
 */

const SPACES = ["hsl", "hsb", "rgb"] as const;

function defaultValueFor(space: (typeof SPACES)[number]): string {
  return space === "rgb" ? "rgb(50 100 200)" : "hsl(200, 100%, 50%)";
}

function Default() {
  return (
    <Stage>
      <ColorArea aria-label="Color" defaultValue="hsl(200, 100%, 50%)">
        <ColorArea.Thumb />
      </ColorArea>
    </Stage>
  );
}

function ShowDots() {
  return (
    <Stage>
      <ColorArea aria-label="Color" defaultValue="hsl(200, 100%, 50%)" showDots>
        <ColorArea.Thumb />
      </ColorArea>
    </Stage>
  );
}

function Channels() {
  return (
    <Stage>
      <View class="flex-col gap-8">
        <View class="flex-col gap-2">
          <Text class="text-sm font-medium text-muted">
            HSB: Saturation vs Brightness (default)
          </Text>
          <ColorArea aria-label="HSB saturation and brightness" defaultValue="hsl(30, 100%, 50%)">
            <ColorArea.Thumb />
          </ColorArea>
        </View>
        <View class="flex-col gap-2">
          <Text class="text-sm font-medium text-muted">RGB: Red vs Green</Text>
          <ColorArea
            aria-label="RGB red and green"
            defaultValue="rgb(255 100 50)"
            xChannel="red"
            yChannel="green"
          >
            <ColorArea.Thumb />
          </ColorArea>
        </View>
        <View class="flex-col gap-2">
          <Text class="text-sm font-medium text-muted">RGB: Blue vs Green</Text>
          <ColorArea
            aria-label="RGB blue and green"
            defaultValue="rgb(50 100 255)"
            xChannel="blue"
            yChannel="green"
          >
            <ColorArea.Thumb />
          </ColorArea>
        </View>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <ColorArea aria-label="Color" defaultValue="hsl(200, 100%, 50%)" isDisabled>
        <ColorArea.Thumb />
      </ColorArea>
    </Stage>
  );
}

/* The story holds a parsed Color in React state; here the same value is a
 * signal holding the string form, which both sides accept for `value`. */
function Controlled() {
  const value = signal("hsl(50, 100%, 50%)");

  return (
    <Stage>
      <View class="flex-col gap-4">
        <ColorArea
          aria-label="Color"
          value={value()}
          onChange={(color) => value.set(color.toString("hsl"))}
        >
          <ColorArea.Thumb />
        </ColorArea>
        <View class="flex-row gap-1">
          <Text class="text-sm text-muted">Current color:</Text>
          <Text class="text-sm font-medium">{value()}</Text>
        </View>
      </View>
    </Stage>
  );
}

function WithPreview() {
  const value = signal("hsl(200, 100%, 50%)");

  return (
    <Stage>
      <View class="flex-col gap-4">
        <ColorArea
          aria-label="Color"
          value={value()}
          showDots
          onChange={(color) => value.set(color.toString("hsl"))}
        >
          <ColorArea.Thumb />
        </ColorArea>
        <View class="flex-row items-center gap-3">
          <ColorSwatch color={value()} size="lg" />
          <View class="flex-col gap-0.5">
            <Text class="text-sm font-medium">{value()}</Text>
            <Text class="text-xs text-muted">{value()}</Text>
          </View>
        </View>
      </View>
    </Stage>
  );
}

function All() {
  return (
    <Stage>
      <View class="flex-col gap-6">
        {SPACES.map((space) => (
          <View class="flex-col gap-3">
            <Text class="text-sm font-semibold text-muted capitalize">{space}</Text>
            <View class="flex-row flex-wrap items-start gap-4">
              {[false, true].map((showDots) =>
                [false, true].map((isDisabled) => (
                  <View class="flex-col gap-1">
                    <Text class="text-xs text-muted">
                      {`${showDots ? "dots" : "plain"} ${isDisabled ? "disabled" : "enabled"}`}
                    </Text>
                    <ColorArea
                      aria-label={`${space} ${showDots ? "with dots" : "plain"} ${
                        isDisabled ? "disabled" : "enabled"
                      }`}
                      colorSpace={space}
                      defaultValue={defaultValueFor(space)}
                      isDisabled={isDisabled}
                      showDots={showDots}
                    >
                      <ColorArea.Thumb />
                    </ColorArea>
                  </View>
                )),
              )}
            </View>
          </View>
        ))}
      </View>
    </Stage>
  );
}

/* D17 split: HeroUI passes plain values (`{ state, isDisabled }`, `{ color }`)
 * and this side passes an accessors object, so the two sides are separate
 * copies. Only the NSH entry carries the `.split` suffix. */
function RenderPropsSplit() {
  return (
    <Stage>
      <ColorArea
        aria-label="Color"
        defaultValue="hsl(200, 50%, 50%)"
        className={({ isDisabled }) => (isDisabled() ? "opacity-50" : "")}
        style={({ state }) => ({ opacity: state.isDragging() ? 0.9 : 1 })}
      >
        {({ state, isDisabled }) => (
          <View class="flex-col gap-2">
            <ColorArea.Thumb
              className={({ isDragging }) => (isDragging() ? "size-5" : "size-4")}
              style={({ color }) => ({ backgroundColor: color().toString("css") })}
            >
              {({ isDragging, isHovered, isFocused, isFocusVisible, isDisabled: thumbDisabled }) => (
                <Text class="text-xs" testID="thumb-state">
                  {`${isDragging() ? "Dragging" : "Idle"} ${
                    isHovered() ? "Hovered" : "NotHovered"
                  } ${isFocused() ? "Focused" : "NotFocused"} ${
                    isFocusVisible() ? "FocusRing" : "NoRing"
                  } ${thumbDisabled() ? "Disabled" : "Enabled"}`}
                </Text>
              )}
            </ColorArea.Thumb>
            <Text class="text-sm text-muted" testID="root-state">
              {`${state.value().toString("hsl")} ${isDisabled() ? "Disabled" : "Enabled"}`}
            </Text>
          </View>
        )}
      </ColorArea>
    </Stage>
  );
}

export const colorAreaScenarios: Record<string, Component> = {
  "color-area/default": Default,
  "color-area/show-dots": ShowDots,
  "color-area/channels": Channels,
  "color-area/disabled": Disabled,
  "color-area/controlled": Controlled,
  "color-area/with-preview": WithPreview,
  "color-area/all": All,
  "color-area/render-props.split": RenderPropsSplit,
};
