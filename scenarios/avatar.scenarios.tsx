import { View } from "nsh";
import { Avatar, AvatarGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared Avatar / AvatarGroup scenarios, written with HeroUI's API only, so the
 * reference app (npm @heroui/react 3.2.7) and this library render the same JSX.
 *
 * HeroUI's avatar tests read `data-slot`, BEM modifiers and `data-*` attributes,
 * none of which NSH projects (D18). The entries below render the same JSX as the
 * upstream cases and stories, so the tests read a visible consequence instead:
 * the text on screen, the resolved color of each fallback span, and geometry
 * measured through onLayout in harness/avatar.fixtures.tsx.
 *
 * Every image uses an inline 16x16 opaque `data:` PNG, so neither side depends
 * on the network and both load the same picture.
 *
 *   avatar/basic              T-001, default-appearance screenshot
 *   avatar/colors             T-003, five `color` values, fallbacks A..E
 *   avatar/sizes              story Sizes: sm / md / lg with an image
 *   avatar/variants           story Variants: default / soft x five colors
 *   avatar/image              T-021, T-022 (fallback, no image before load),
 *                             T-023, T-024 (web: image and its alt label)
 *   avatar/image-delay        T-025, T-026, Fallback delayMs={600} with no
 *                             Image, as upstream image.test.tsx:89-112
 *   avatar/group-default      story Default: four image avatars, default clip
 *   avatar/group-all          T-008, six avatars and no auto count
 *   avatar/group-max          T-009, four avatars, max={2}, auto +2
 *   avatar/group-count        T-010, three avatars plus an explicit +9
 *   avatar/group-count-max    T-011, max={2} plus an explicit +99
 *   avatar/group-ring         T-007 screenshot, overlap="ring"
 *   avatar/group-grid         T-012 screenshot, isGrid
 *   avatar/group-sizes        story Sizes: group size down to one avatar
 *   avatar/group-colors       T-014, group color down to fallbacks 1..5
 *   avatar/group-variants     T-015, group variant default / soft
 *   avatar/group-overlap-lab  clip and ring on a gradient host (R-034)
 */

const COLORS = ["default", "accent", "success", "warning", "danger"] as const;
const LETTERS = ["A", "B", "C", "D", "E"] as const;
const SIZES = ["sm", "md", "lg"] as const;

const IMAGE_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR42mOUS173n4ECwMRAIRg1YNSAUQMGiwEAGY0CTqYl9Z8AAAAASUVORK5CYII=";

function Basic() {
  return (
    <Stage>
      <Avatar>
        <Avatar.Fallback>JD</Avatar.Fallback>
      </Avatar>
    </Stage>
  );
}

function Colors() {
  return (
    <Stage>
      <View class="flex-row items-start gap-8">
        {COLORS.map((color, index) => (
          <Avatar color={color}>
            <Avatar.Fallback>{LETTERS[index]}</Avatar.Fallback>
          </Avatar>
        ))}
      </View>
    </Stage>
  );
}

function Sizes() {
  return (
    <Stage>
      <View class="flex-row items-center gap-8">
        {SIZES.map((size, index) => (
          <Avatar size={size}>
            <Avatar.Image alt="Fake Image" src={IMAGE_SRC} />
            <Avatar.Fallback>{LETTERS[index]}</Avatar.Fallback>
          </Avatar>
        ))}
      </View>
    </Stage>
  );
}

function Variants() {
  const variants = ["default", "soft"] as const;

  return (
    <Stage>
      <View class="flex-col gap-8">
        {variants.map((variant) => (
          <View class="flex-row items-center gap-8">
            {COLORS.map((color, index) => (
              <Avatar color={color} variant={variant}>
                <Avatar.Fallback>{LETTERS[index]}</Avatar.Fallback>
              </Avatar>
            ))}
          </View>
        ))}
      </View>
    </Stage>
  );
}

function WithImage() {
  return (
    <Stage>
      <Avatar>
        <Avatar.Image alt="Fake Image" src={IMAGE_SRC} />
        <Avatar.Fallback>AB</Avatar.Fallback>
      </Avatar>
    </Stage>
  );
}

function ImageDelay() {
  return (
    <Stage>
      <Avatar>
        <Avatar.Fallback delayMs={600}>AB</Avatar.Fallback>
      </Avatar>
    </Stage>
  );
}

function GroupDefault() {
  return (
    <Stage>
      <AvatarGroup>
        {LETTERS.slice(0, 4).map((letter) => (
          <Avatar>
            <Avatar.Image alt={`Member ${letter}`} src={IMAGE_SRC} />
            <Avatar.Fallback>{letter}</Avatar.Fallback>
          </Avatar>
        ))}
      </AvatarGroup>
    </Stage>
  );
}

function GroupAll() {
  const letters = ["A", "B", "C", "D", "E", "F"] as const;

  return (
    <Stage>
      <AvatarGroup>
        {letters.map((letter) => (
          <Avatar>
            <Avatar.Fallback>{letter}</Avatar.Fallback>
          </Avatar>
        ))}
      </AvatarGroup>
    </Stage>
  );
}

function GroupMax() {
  return (
    <Stage>
      <AvatarGroup max={2}>
        {LETTERS.slice(0, 4).map((letter) => (
          <Avatar>
            <Avatar.Fallback>{letter}</Avatar.Fallback>
          </Avatar>
        ))}
      </AvatarGroup>
    </Stage>
  );
}

function GroupCount() {
  return (
    <Stage>
      <AvatarGroup size="sm">
        {LETTERS.slice(0, 3).map((letter) => (
          <Avatar>
            <Avatar.Fallback>{letter}</Avatar.Fallback>
          </Avatar>
        ))}
        <AvatarGroup.Count>+9</AvatarGroup.Count>
      </AvatarGroup>
    </Stage>
  );
}

function GroupCountMax() {
  return (
    <Stage>
      <AvatarGroup max={2}>
        {LETTERS.slice(0, 4).map((letter) => (
          <Avatar>
            <Avatar.Fallback>{letter}</Avatar.Fallback>
          </Avatar>
        ))}
        <AvatarGroup.Count>+99</AvatarGroup.Count>
      </AvatarGroup>
    </Stage>
  );
}

function GroupRing() {
  return (
    <Stage>
      <AvatarGroup overlap="ring">
        {LETTERS.slice(0, 4).map((letter) => (
          <Avatar>
            <Avatar.Fallback>{letter}</Avatar.Fallback>
          </Avatar>
        ))}
      </AvatarGroup>
    </Stage>
  );
}

function GroupGrid() {
  return (
    <Stage>
      <AvatarGroup isGrid max={7}>
        {LETTERS.map((letter) => (
          <Avatar>
            <Avatar.Fallback>{letter}</Avatar.Fallback>
          </Avatar>
        ))}
      </AvatarGroup>
    </Stage>
  );
}

function GroupSizes() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        {SIZES.map((size, index) => (
          <AvatarGroup size={size}>
            <Avatar>
              <Avatar.Fallback>{LETTERS[index]}</Avatar.Fallback>
            </Avatar>
          </AvatarGroup>
        ))}
      </View>
    </Stage>
  );
}

function GroupColors() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        {COLORS.map((color, index) => (
          <AvatarGroup color={color}>
            <Avatar>
              <Avatar.Fallback>{String(index + 1)}</Avatar.Fallback>
            </Avatar>
          </AvatarGroup>
        ))}
      </View>
    </Stage>
  );
}

function GroupVariants() {
  return (
    <Stage>
      <View class="flex-row items-center gap-8">
        <AvatarGroup variant="default">
          <Avatar>
            <Avatar.Fallback>D</Avatar.Fallback>
          </Avatar>
        </AvatarGroup>
        <AvatarGroup variant="soft">
          <Avatar>
            <Avatar.Fallback>S</Avatar.Fallback>
          </Avatar>
        </AvatarGroup>
      </View>
    </Stage>
  );
}

function GroupOverlapLab() {
  return (
    <Stage>
      <View class="flex-col gap-4 rounded-2xl bg-[linear-gradient(45deg,#ffe08a,#7ec8ff)] p-4">
        <AvatarGroup>
          {LETTERS.slice(0, 3).map((letter) => (
            <Avatar>
              <Avatar.Fallback>{letter}</Avatar.Fallback>
            </Avatar>
          ))}
        </AvatarGroup>
        <AvatarGroup overlap="ring">
          {LETTERS.slice(0, 3).map((letter) => (
            <Avatar>
              <Avatar.Fallback>{letter}</Avatar.Fallback>
            </Avatar>
          ))}
        </AvatarGroup>
      </View>
    </Stage>
  );
}

export const avatarScenarios: Record<string, Component> = {
  "avatar/basic": Basic,
  "avatar/colors": Colors,
  "avatar/sizes": Sizes,
  "avatar/variants": Variants,
  "avatar/image": WithImage,
  "avatar/image-delay": ImageDelay,
  "avatar/group-default": GroupDefault,
  "avatar/group-all": GroupAll,
  "avatar/group-max": GroupMax,
  "avatar/group-count": GroupCount,
  "avatar/group-count-max": GroupCountMax,
  "avatar/group-ring": GroupRing,
  "avatar/group-grid": GroupGrid,
  "avatar/group-sizes": GroupSizes,
  "avatar/group-colors": GroupColors,
  "avatar/group-variants": GroupVariants,
  "avatar/group-overlap-lab": GroupOverlapLab,
};
