import { Text, View } from "nsh";
import { Button, buttonVariants, Link } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared scenarios for Link and Link.Icon, written with HeroUI's API only.
 *
 * The upstream unit tests (packages/react/tests/components/link/link.test.tsx)
 * are the source of `basic`, `disabled`, `icon-default` and `icon-custom`; the
 * stories are the source of `story` (Default, CustomIcon, IconPlacement) and
 * `underline-variants` (UnderlineVariants).
 *
 * The Kobalte cases are written against its own `Link.Root` with the text
 * "Link": `plain` and `plain-disabled` keep that text so the ported cases keep
 * their upstream selectors, while `basic` keeps HeroUI's "HeroUI" link.
 *
 * Split scenarios (SOP 3.3.3, D17): the render props receive an object of
 * accessors here and an object of booleans upstream, so `focus.split`,
 * `render-props.split` and `current` are written for the NSH side.
 */

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit-test fixtures
 * -----------------------------------------------------------------------------------------------*/

function Basic() {
  return (
    <Stage>
      <Link
        href="https://heroui.com"
        testID="link-docs"
        onHoverStart={probe("onHoverStart")}
        onHoverEnd={probe("onHoverEnd")}
        onPress={probe("onPress")}
      >
        HeroUI
      </Link>
      <Link href="#elsewhere" testID="link-elsewhere">
        Elsewhere
      </Link>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Link
        isDisabled
        href="https://heroui.com"
        testID="link-disabled"
        onHoverStart={probe("onHoverStart")}
        onHoverEnd={probe("onHoverEnd")}
        onPress={probe("onPress")}
      >
        Docs
      </Link>
    </Stage>
  );
}

function IconDefault() {
  return (
    <Stage>
      <Link href="https://heroui.com" testID="link-icon-default">
        HeroUI
        <Link.Icon testID="link-icon" />
      </Link>
    </Stage>
  );
}

function IconCustom() {
  return (
    <Stage>
      <Link href="https://heroui.com" testID="link-icon-custom">
        HeroUI
        <Link.Icon testID="link-icon">
          <Text>→</Text>
        </Link.Icon>
      </Link>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Kobalte fixtures: text "Link", as in kobalte/packages/core/src/link/link.test.tsx
 * -----------------------------------------------------------------------------------------------*/

function Plain() {
  return (
    <Stage>
      <Link href="https://heroui.com" testID="link">
        Link
      </Link>
    </Stage>
  );
}

function PlainDisabled() {
  return (
    <Stage>
      <Link isDisabled href="https://heroui.com" testID="link" onPress={probe("onPress")}>
        Link
      </Link>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Focus, Tab order and render props
 * -----------------------------------------------------------------------------------------------*/

function FocusSplit() {
  return (
    <Stage>
      <Link
        href="#docs"
        testID="link-focus"
        onFocus={probe("onFocus")}
        onBlur={probe("onBlur")}
      >
        {({ isFocusVisible }) => <Text>{isFocusVisible() ? "Focused" : "Docs"}</Text>}
      </Link>
    </Stage>
  );
}

function Tab() {
  return (
    <Stage>
      <Button onFocus={probe("focus:Before")}>Before</Button>
      <Link href="#docs" testID="link-tab" onFocus={probe("focus:Link")}>
        Link
      </Link>
      <Button onFocus={probe("focus:After")}>After</Button>
    </Stage>
  );
}

function TabDisabled() {
  return (
    <Stage>
      <Button onFocus={probe("focus:Before")}>Before</Button>
      <Link isDisabled href="#docs" testID="link-tab" onFocus={probe("focus:Link")}>
        Link
      </Link>
      <Button onFocus={probe("focus:After")}>After</Button>
    </Stage>
  );
}

function RenderPropsSplit() {
  return (
    <Stage>
      <Link
        href="#docs"
        testID="link-render-props"
        className={({ isHovered }) => (isHovered() ? "text-danger" : "text-link")}
        style={({ isPressed }) => ({ opacity: isPressed() ? 0.5 : 1 })}
      >
        {({
          isCurrent,
          isDisabled,
          isFocused,
          isFocusVisible,
          isHovered,
          isPressed,
        }) => (
          <Text>
            {`${isHovered() ? "hovered" : "idle"} ${
              isPressed() ? "pressed" : "released"
            } ${isFocused() ? "focused" : "unfocused"} ${
              isFocusVisible() ? "focus-visible" : "not-focus-visible"
            } ${isDisabled() ? "disabled" : "enabled"} ${
              isCurrent() ? "current" : "not-current"
            }`}
          </Text>
        )}
      </Link>
    </Stage>
  );
}

function Current() {
  return (
    <Stage>
      <Link href="#docs" aria-current="page" testID="link-current">
        {({ isCurrent }) => <Text>{isCurrent() ? "Current page" : "Other page"}</Text>}
      </Link>
      <Link href="#other" testID="link-not-current">
        {({ isCurrent }) => <Text>{isCurrent() ? "Current page" : "Other page"}</Text>}
      </Link>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Stories
 * -----------------------------------------------------------------------------------------------*/

function UnderlineVariants() {
  return (
    <Stage>
      <View class="flex flex-col gap-6">
        <View class="flex flex-col gap-2">
          <Text class="text-sm text-muted">Default hover underline</Text>
          <Link href="#">
            Hover to see the underline
            <Link.Icon />
          </Link>
        </View>

        <View class="flex flex-col gap-2">
          <Text class="text-sm text-muted">Always visible underline</Text>
          <Link className="underline" href="#">
            Underline always visible
            <Link.Icon />
          </Link>
        </View>

        <View class="flex flex-col gap-2">
          <Text class="text-sm text-muted">No underline</Text>
          <Link className="no-underline" href="#">
            Link without any underline
            <Link.Icon />
          </Link>
        </View>

        <View class="flex flex-col gap-2">
          <Text class="text-sm text-muted">Changing the underline offset</Text>
          <View class="flex flex-col gap-3">
            <Link className="underline-offset-1" href="#">
              Offset 1 (1px space)
              <Link.Icon />
            </Link>
            <Link className="underline-offset-2" href="#">
              Offset 2 (2px space)
              <Link.Icon />
            </Link>
            <Link className="underline-offset-3" href="#">
              Offset 3 (3px space)
              <Link.Icon />
            </Link>
            <Link className="underline-offset-4" href="#">
              Offset 4 (4px space)
              <Link.Icon />
            </Link>
          </View>
        </View>
      </View>
    </Stage>
  );
}

function Story() {
  return (
    <Stage>
      <View class="flex flex-col gap-6">
        <View class="flex items-center gap-4">
          <Link href="#">
            Call to action
            <Link.Icon />
          </Link>
          <Link isDisabled href="#">
            Call to action
            <Link.Icon />
          </Link>
          <Link
            href="https://heroui.com"
            rel="noopener noreferrer"
            target="_blank"
            className={buttonVariants({
              className: "gap-0 px-3 py-0.5 no-underline",
              size: "md",
              variant: "tertiary",
            })}
          >
            HeroUI
            <Link.Icon className="h-2 w-2" />
          </Link>
        </View>

        <View class="flex flex-col gap-4">
          <Text class="text-sm text-muted">Icon at end (default)</Text>
          <Link href="#">
            Icon at end (default)
            <Link.Icon />
          </Link>
          <Link href="#">
            <Link.Icon />
            Icon at start
          </Link>
        </View>

        <View class="flex flex-col gap-4">
          <Text class="text-sm text-muted">Custom icons</Text>
          <Link href="#">
            External Link
            <Link.Icon>
              <Text>→</Text>
            </Link.Icon>
          </Link>
          <Link href="#">
            <Link.Icon>
              <Text>ⓘ</Text>
            </Link.Icon>
            Info Link
          </Link>
        </View>
      </View>
    </Stage>
  );
}

export const linkScenarios: Record<string, Component> = {
  "link/basic": Basic,
  "link/disabled": Disabled,
  "link/plain": Plain,
  "link/plain-disabled": PlainDisabled,
  "link/focus.split": FocusSplit,
  "link/tab": Tab,
  "link/tab-disabled": TabDisabled,
  "link/icon-default": IconDefault,
  "link/icon-custom": IconCustom,
  "link/render-props.split": RenderPropsSplit,
  "link/current": Current,
  "link/underline-variants": UnderlineVariants,
  "link/story": Story,
};
