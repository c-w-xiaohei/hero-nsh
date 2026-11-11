import { Button, Tooltip } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared scenarios for Tooltip, written with HeroUI's API only.
 *
 * The upstream cases (heroui/packages/react/tests/components/tooltip/
 * tooltip.test.tsx) render a Button trigger, one Tooltip.Content line and,
 * when composed, a Tooltip.Arrow; `delay={0}` is what every upstream case
 * passes so that a hover opens without waiting for the 1500 ms default.
 *
 * `tooltip/trigger` is the second trigger form, Tooltip.Trigger, which the
 * upstream `data-slot` case used. `tooltip/placement` pairs the default `top`
 * side with `placement="bottom"` on two default-open instances: a shared
 * scenario cannot hover, so the screenshot variants start open.
 */

function Basic() {
  return (
    <Stage>
      <Tooltip delay={0}>
        <Button>Hover me</Button>
        <Tooltip.Content>Hover tip</Tooltip.Content>
      </Tooltip>
    </Stage>
  );
}

function Arrow() {
  return (
    <Stage>
      <Tooltip delay={0}>
        <Button>Hover me</Button>
        <Tooltip.Content showArrow>
          <Tooltip.Arrow testID="arrow" />
          Arrow tip
        </Tooltip.Content>
      </Tooltip>
    </Stage>
  );
}

function Trigger() {
  return (
    <Stage>
      <Tooltip delay={0}>
        <Tooltip.Trigger>Hover me</Tooltip.Trigger>
        <Tooltip.Content>Trigger tip</Tooltip.Content>
      </Tooltip>
    </Stage>
  );
}

function Placement() {
  return (
    <Stage>
      <Tooltip defaultOpen delay={0}>
        <Button>Top anchor</Button>
        <Tooltip.Content>Top tip</Tooltip.Content>
      </Tooltip>
      <Tooltip defaultOpen delay={0}>
        <Button>Bottom anchor</Button>
        <Tooltip.Content placement="bottom">Bottom tip</Tooltip.Content>
      </Tooltip>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <Tooltip isDisabled delay={0}>
        <Button>Hover me</Button>
        <Tooltip.Content>Should not appear</Tooltip.Content>
      </Tooltip>
    </Stage>
  );
}

export const tooltipScenarios: Record<string, Component> = {
  "tooltip/basic": Basic,
  "tooltip/arrow": Arrow,
  "tooltip/trigger": Trigger,
  "tooltip/placement": Placement,
  "tooltip/disabled": Disabled,
};
