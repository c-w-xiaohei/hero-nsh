import { Text, View } from "nsh";
import { Badge, Surface } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared Badge scenarios, written with HeroUI's API only, so the reference app
 * (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * HeroUI's badge tests read `data-slot`, BEM modifiers and `data-*` attributes,
 * none of which NSH projects (D18). The entries below render the same JSX as the
 * upstream cases and stories, so the tests read a visible consequence instead:
 * the text on screen (T-001) and the resolved color of each text span (T-003).
 *
 * Avatar is not ported yet, so Surface stands in for it as the anchor target.
 * Avatar.Image is decoration only and adds no behavior; dropping it keeps the
 * scenario to components that are already in the library.
 *
 *   badge/basic       T-001, and the default-appearance screenshot
 *   badge/colors      T-003, five secondary badges, one per color
 *   badge/label       T-005 screenshot: implicit vs explicit Badge.Label
 *   badge/aria        T-008, aria-label mapped to accessibilityLabel
 *   badge/placements  story Placements: the four corners
 *   badge/sizes       story Sizes: the three minimum sizes
 *   badge/variants    story Variants: primary / secondary / soft × five colors
 *   badge/dots        story DotBadge: childless dots on the anchor
 *   badge/anchor      story Default: anchor context and stacking order
 */

const colors = ["default", "accent", "success", "warning", "danger"] as const;

function Basic() {
  return (
    <Stage>
      <Badge.Anchor>
        <Surface className="size-12 rounded-full" />
        <Badge>5</Badge>
      </Badge.Anchor>
    </Stage>
  );
}

function Colors() {
  return (
    <Stage>
      <View class="flex-row items-start gap-8">
        {colors.map((color, index) => (
          <Badge.Anchor>
            <Surface className="size-12 rounded-full" />
            <Badge color={color} variant="secondary">
              {String(index + 1)}
            </Badge>
          </Badge.Anchor>
        ))}
      </View>
    </Stage>
  );
}

function Label() {
  return (
    <Stage>
      <View class="flex-row items-start gap-8">
        <Badge.Anchor>
          <Surface className="size-12 rounded-full" />
          <Badge>5</Badge>
        </Badge.Anchor>
        <Badge.Anchor>
          <Surface className="size-12 rounded-full" />
          <Badge>
            <Badge.Label>5</Badge.Label>
          </Badge>
        </Badge.Anchor>
      </View>
    </Stage>
  );
}

function Aria() {
  return (
    <Stage>
      <Badge.Anchor>
        <Surface className="size-12 rounded-full" />
        <Badge aria-label="User is online">Online</Badge>
      </Badge.Anchor>
    </Stage>
  );
}

function Placements() {
  const placements = ["top-right", "top-left", "bottom-right", "bottom-left"] as const;

  return (
    <Stage>
      <View class="flex-row items-start gap-8">
        {placements.map((placement) => (
          <View class="flex-col items-center gap-2">
            <Badge.Anchor>
              <Surface className="size-12 rounded-full" />
              <Badge color="accent" placement={placement} size="sm" />
            </Badge.Anchor>
            <Text class="text-xs text-muted">{placement}</Text>
          </View>
        ))}
      </View>
    </Stage>
  );
}

function Sizes() {
  const sizes = ["sm", "md", "lg"] as const;

  return (
    <Stage>
      <View class="flex-row items-start gap-8">
        {sizes.map((size) => (
          <View class="flex-col items-center gap-2">
            <Badge.Anchor>
              <Surface className="size-12 rounded-full" />
              <Badge color="accent" size={size}>
                99+
              </Badge>
            </Badge.Anchor>
            <Text class="text-xs text-muted">{size}</Text>
          </View>
        ))}
      </View>
    </Stage>
  );
}

function Variants() {
  const variants = ["primary", "secondary", "soft"] as const;

  return (
    <Stage>
      <View class="flex-col gap-8">
        {variants.map((variant) => (
          <View class="flex-row items-center gap-8">
            {colors.map((color) => (
              <Badge.Anchor>
                <Surface className="size-12 rounded-full" />
                <Badge color={color} size="sm" variant={variant}>
                  5
                </Badge>
              </Badge.Anchor>
            ))}
          </View>
        ))}
      </View>
    </Stage>
  );
}

function Dots() {
  const dotColors = ["accent", "success", "warning", "danger"] as const;

  return (
    <Stage>
      <View class="flex-row items-center gap-8">
        {dotColors.map((color) => (
          <Badge.Anchor>
            <Surface className="size-12 rounded-full" />
            <Badge color={color} placement="bottom-right" size="sm" />
          </Badge.Anchor>
        ))}
      </View>
    </Stage>
  );
}

function Anchor() {
  return (
    <Stage>
      <Badge.Anchor>
        <Surface className="size-20 rounded-full" />
        <Badge color="accent" size="lg">
          5
        </Badge>
      </Badge.Anchor>
    </Stage>
  );
}

export const badgeScenarios: Record<string, Component> = {
  "badge/basic": Basic,
  "badge/colors": Colors,
  "badge/label": Label,
  "badge/aria": Aria,
  "badge/placements": Placements,
  "badge/sizes": Sizes,
  "badge/variants": Variants,
  "badge/dots": Dots,
  "badge/anchor": Anchor,
};
