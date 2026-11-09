import { Text, View } from "nsh";
import {
  CircleDashedIcon,
  CloseIcon,
  DangerIcon,
  ExternalLinkIcon,
  IconCalendar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconMinus,
  IconPlus,
  IconSearch,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared icons scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX. The set is not a
 * documented component: these entries exist for the screenshot comparison and
 * the Windows spot check (port sheet 4b.3).
 *
 *   icons/all    all fifteen icons in upstream order, no size overrides
 *   icons/sizes  className overriding the default size (R-013)
 *   icons/inline an icon between two Texts, for the baseline difference (R-016)
 *
 * Color is deliberately absent: upstream tints an icon with an ancestor
 * `text-*` class and this library needs an explicit `color` token, so the same
 * JSX would mean two different things (port sheet 4b.3, §8). Color is checked
 * through the NSH-only fixture instead.
 */

function All() {
  return (
    <Stage>
      <View class="flex-row items-center gap-4">
        <IconChevronDown />
        <IconChevronUp />
        <IconChevronLeft />
        <IconChevronRight />
        <ExternalLinkIcon />
        <CircleDashedIcon />
        <CloseIcon />
        <InfoIcon />
        <WarningIcon />
        <DangerIcon />
        <SuccessIcon />
        <IconMinus />
        <IconPlus />
        <IconSearch />
        <IconCalendar />
      </View>
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <View class="flex-row items-center gap-4">
        <IconChevronDown className="size-3" />
        <IconSearch className="size-4" />
        <CloseIcon className="size-6" />
      </View>
    </Stage>
  );
}

function Inline() {
  return (
    <Stage>
      <View class="flex-row items-center gap-1">
        <Text>Before</Text>
        <IconChevronDown />
        <Text>After</Text>
      </View>
    </Stage>
  );
}

export const iconsScenarios = {
  "icons/all": All,
  "icons/sizes": Sizes,
  "icons/inline": Inline,
} satisfies Record<string, Component>;
