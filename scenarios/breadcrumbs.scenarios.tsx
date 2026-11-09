import { Text } from "nsh";
import { Breadcrumbs } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared Breadcrumbs scenarios, written with HeroUI's API only.
 *
 * `basic`, `disabled`, `custom-separator` and `item-render` come from the
 * upstream unit fixture and cases (packages/react/tests/components/breadcrumbs/
 * breadcrumbs.test.tsx); `links` is T-002's fixture: the upstream case checks
 * the `href` attributes, and the NSH equivalent is the URL the app opens, so it
 * needs two absolute URLs. `string-separator` and `jsx-separator` keep the
 * Kobalte fixture's texts (Home / Components / Breadcrumbs), which is where the
 * Kobalte cases' selectors come from.
 *
 * Split scenarios (SOP 3.3.3, D17): a render prop receives booleans upstream
 * and accessors here, so `custom-separator.split`, `jsx-separator.split` and
 * `item-render.split` pass an NSH `Text` instead of the upstream `<span>`, and
 * `item-render.split` reads its values as accessors.
 */

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit-test fixtures
 * -----------------------------------------------------------------------------------------------*/

function Basic() {
  return (
    <Stage>
      <Breadcrumbs testID="breadcrumbs">
        <Breadcrumbs.Item href="#home" testID="item-home">
          Home
        </Breadcrumbs.Item>
        <Breadcrumbs.Item href="#products" testID="item-products">
          Products
        </Breadcrumbs.Item>
        <Breadcrumbs.Item testID="item-current">Laptop</Breadcrumbs.Item>
      </Breadcrumbs>
    </Stage>
  );
}

/** T-002: the upstream `href` assertions become opened URLs, so both are absolute. */
function Links() {
  return (
    <Stage>
      <Breadcrumbs testID="breadcrumbs">
        <Breadcrumbs.Item href="https://heroui.com/docs" testID="item-home">
          Home
        </Breadcrumbs.Item>
        <Breadcrumbs.Item href="https://heroui.com/components" testID="item-products">
          Products
        </Breadcrumbs.Item>
        <Breadcrumbs.Item testID="item-current">Laptop</Breadcrumbs.Item>
      </Breadcrumbs>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Breadcrumbs isDisabled testID="breadcrumbs">
        <Breadcrumbs.Item href="#home" testID="item-home">
          Home
        </Breadcrumbs.Item>
        <Breadcrumbs.Item href="#products" testID="item-products">
          Products
        </Breadcrumbs.Item>
        <Breadcrumbs.Item testID="item-current">Laptop</Breadcrumbs.Item>
      </Breadcrumbs>
    </Stage>
  );
}

/** T-007: a non-current item reports its press through the caller's `onPress`. */
function Action() {
  return (
    <Stage>
      <Breadcrumbs testID="breadcrumbs">
        <Breadcrumbs.Item
          href="#home"
          testID="item-home"
          onPress={probe("onPress")}
        >
          Home
        </Breadcrumbs.Item>
        <Breadcrumbs.Item testID="item-current">Current</Breadcrumbs.Item>
      </Breadcrumbs>
    </Stage>
  );
}

/** T-005: `<span data-testid>` has no NSH counterpart; the split writes `Text`. */
function CustomSeparatorSplit() {
  return (
    <Stage>
      <Breadcrumbs
        testID="breadcrumbs"
        separator={<Text testID="custom-separator">/</Text>}
      >
        <Breadcrumbs.Item href="#home" testID="item-home">
          Home
        </Breadcrumbs.Item>
        <Breadcrumbs.Item href="#products" testID="item-products">
          Products
        </Breadcrumbs.Item>
        <Breadcrumbs.Item testID="item-current">Laptop</Breadcrumbs.Item>
      </Breadcrumbs>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Kobalte fixtures: texts "Home" / "Components" / "Breadcrumbs"
 * -----------------------------------------------------------------------------------------------*/

function StringSeparator() {
  return (
    <Stage>
      <Breadcrumbs separator=">" testID="breadcrumbs">
        <Breadcrumbs.Item href="#home" testID="item-home">
          Home
        </Breadcrumbs.Item>
        <Breadcrumbs.Item href="#components" testID="item-components">
          Components
        </Breadcrumbs.Item>
        <Breadcrumbs.Item testID="item-current">Breadcrumbs</Breadcrumbs.Item>
      </Breadcrumbs>
    </Stage>
  );
}

function JsxSeparatorSplit() {
  return (
    <Stage>
      <Breadcrumbs
        testID="breadcrumbs"
        separator={<Text testID="jsx-separator">jsx separator</Text>}
      >
        <Breadcrumbs.Item href="#home" testID="item-home">
          Home
        </Breadcrumbs.Item>
        <Breadcrumbs.Item href="#components" testID="item-components">
          Components
        </Breadcrumbs.Item>
        <Breadcrumbs.Item testID="item-current">Breadcrumbs</Breadcrumbs.Item>
      </Breadcrumbs>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Render-prop item
 * -----------------------------------------------------------------------------------------------*/

function ItemRenderSplit() {
  return (
    <Stage>
      <Breadcrumbs testID="breadcrumbs">
        <Breadcrumbs.Item href="#home" testID="item-home">
          {({ isCurrent }) => (
            <Text testID={isCurrent() ? "custom-item-current" : "custom-item"}>Home</Text>
          )}
        </Breadcrumbs.Item>
        <Breadcrumbs.Item testID="item-current">Current</Breadcrumbs.Item>
      </Breadcrumbs>
    </Stage>
  );
}

export const breadcrumbsScenarios: Record<string, Component> = {
  "breadcrumbs/basic": Basic,
  "breadcrumbs/links": Links,
  "breadcrumbs/disabled": Disabled,
  "breadcrumbs/action": Action,
  "breadcrumbs/custom-separator.split": CustomSeparatorSplit,
  "breadcrumbs/string-separator": StringSeparator,
  "breadcrumbs/jsx-separator.split": JsxSeparatorSplit,
  "breadcrumbs/item-render.split": ItemRenderSplit,
};
