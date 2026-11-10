import { View } from "nsh";
import { Surface, TextArea } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared TextArea scenarios, written with HeroUI 3.2.7's API only (port sheet
 * 4b, "需要的共享场景"):
 *
 *   textarea/default    story Default
 *   textarea/variants   story Variants: primary and secondary
 *   textarea/full-width story FullWidth: on the page and on a Surface
 */

function Default() {
  return (
    <Stage>
      <TextArea aria-label="Describe your product" placeholder="Describe your product" onChange={probe("onChange")} />
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <View class="flex w-[280px] flex-col gap-2">
        <TextArea fullWidth placeholder="Primary textarea" variant="primary" />
        <TextArea fullWidth placeholder="Secondary textarea" variant="secondary" />
      </View>
    </Stage>
  );
}

function FullWidth() {
  return (
    <Stage>
      <View class="flex w-[400px] flex-col gap-3">
        <TextArea fullWidth placeholder="Full width textarea" />
        <Surface className="w-full rounded-3xl p-6">
          <TextArea fullWidth placeholder="Full width textarea on surface" variant="secondary" />
        </Surface>
      </View>
    </Stage>
  );
}

export const textAreaScenarios = {
  "textarea/default": Default,
  "textarea/variants": Variants,
  "textarea/full-width": FullWidth,
} satisfies Record<string, Component>;
