import { Text, View } from "nsh";
import { Input, Surface } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared Input scenarios, written with HeroUI 3.2.7's API only (port sheet 4b,
 * "需要的共享场景"):
 *
 *   input/default    story Default
 *   input/variants   story Variants: primary and secondary
 *   input/full-width story FullWidth: on the page and on a Surface
 *   input/on-surfaces story OnSurfaces: four Surface variants
 *
 * Standalone inputs have no Label; their accessible name is `aria-label`, as
 * the story's placeholder-only inputs get nothing else.
 */

function Default() {
  return (
    <Stage>
      <Input aria-label="Your name" placeholder="Your name" onChange={probe("onChange")} />
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <View class="flex w-[240px] flex-col gap-2">
        <Input fullWidth placeholder="Primary input" variant="primary" />
        <Input fullWidth placeholder="Secondary input" variant="secondary" />
      </View>
    </Stage>
  );
}

function FullWidth() {
  return (
    <Stage>
      <View class="flex w-[400px] flex-col gap-3">
        <Input fullWidth placeholder="Full width input" />
        <View class="flex h-[180px] items-center justify-center rounded-3xl bg-surface p-4">
          <Surface className="w-full">
            <Input fullWidth placeholder="Full width input on surface" variant="secondary" />
          </Surface>
        </View>
      </View>
    </Stage>
  );
}

function OnSurfaces() {
  return (
    <Stage>
      <View class="flex flex-col gap-8">
        <View class="flex flex-col gap-2">
          <Text class="text-sm font-medium text-muted">Default Surface</Text>
          <Surface className="flex min-w-[320px] flex-col gap-3 rounded-3xl p-6" variant="default">
            <Input className="w-full" placeholder="Your name" variant="primary" />
            <Input className="w-full" placeholder="Your name" variant="secondary" />
          </Surface>
        </View>
        <View class="flex flex-col gap-2">
          <Text class="text-sm font-medium text-muted">Secondary Surface</Text>
          <Surface className="flex min-w-[320px] flex-col gap-3 rounded-3xl p-6" variant="secondary">
            <Input className="w-full" placeholder="Your name" variant="primary" />
            <Input className="w-full" placeholder="Your name" variant="secondary" />
          </Surface>
        </View>
        <View class="flex flex-col gap-2">
          <Text class="text-sm font-medium text-muted">Tertiary Surface</Text>
          <Surface className="flex min-w-[320px] flex-col gap-3 rounded-3xl p-6" variant="tertiary">
            <Input className="w-full" placeholder="Your name" variant="primary" />
            <Input className="w-full" placeholder="Your name" variant="secondary" />
          </Surface>
        </View>
        <View class="flex flex-col gap-2">
          <Text class="text-sm font-medium text-muted">Transparent Surface</Text>
          <Surface className="flex min-w-[320px] flex-col gap-3 rounded-3xl border p-6" variant="transparent">
            <Input className="w-full" placeholder="Your name" variant="primary" />
            <Input className="w-full" placeholder="Your name" variant="secondary" />
          </Surface>
        </View>
      </View>
    </Stage>
  );
}

export const inputScenarios = {
  "input/default": Default,
  "input/variants": Variants,
  "input/full-width": FullWidth,
  "input/on-surfaces": OnSurfaces,
} satisfies Record<string, Component>;
