import { Text, View } from "nsh";
import { ColorField, ColorSwatch, Description, FieldError, Label, parseColor } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared ColorField scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX. The story file is
 * color-field.stories.tsx; the cases below are its stories, combined where the
 * story is a stack of fields (port sheet 4b.3).
 *
 *   color-field/basic          story Default: the default appearance with a
 *                              ColorSwatch prefix and a hex value (T-001)
 *   color-field/variants       story Variants + FullWidth + WithDescription:
 *                              primary / secondary groups, full width and the
 *                              description row. T-003's screenshot target: the
 *                              secondary group's BEM modifier is a class name
 *                              (D18), so the variant's appearance is verified
 *                              here instead.
 *   color-field/required       story Required: the asterisk after the Label and
 *                              the placeholder
 *   color-field/invalid        story Invalid, plus a third invalid field with a
 *                              Description: R-002 hides the description while
 *                              invalid, so that pair is the screenshot evidence
 *   color-field/disabled       story Disabled: one field with a value and one
 *                              empty, both dimmed
 *   color-field/channels       story ChannelEditing + RGBChannels: hue /
 *                              saturation / lightness and red / green / blue,
 *                              static values so the reference side can render
 *                              the same JSX
 *   color-field/style-render-props.split
 *                              the function form of `className` / `style`; the
 *                              argument is a values object on the HeroUI side
 *                              and an accessors object here (D17), so the two
 *                              sides are written separately
 *
 * The stories' controlled fields keep their value in React state; a shared
 * scene cannot carry that signal on both sides, so `basic`, `channels` and
 * `disabled` use `defaultValue` / a static `value`. The interaction that needs
 * a writable value is covered by the NSH-only fixture (port sheet 4b.3).
 */

function Basic() {
  return (
    <Stage>
      <ColorField className="w-[280px]" defaultValue={parseColor("#0485F7")} name="color">
        <Label>Color</Label>
        <ColorField.Group>
          <ColorField.Prefix>
            <ColorSwatch color="#0485F7" size="xs" />
          </ColorField.Prefix>
          <ColorField.Input />
        </ColorField.Group>
      </ColorField>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <ColorField
          className="w-[280px]"
          defaultValue={parseColor("#0485F7")}
          name="primary-color"
        >
          <Label>Primary variant</Label>
          <ColorField.Group variant="primary">
            <ColorField.Input />
          </ColorField.Group>
        </ColorField>
        <ColorField
          className="w-[280px]"
          defaultValue={parseColor("#F43F5E")}
          name="secondary-color"
        >
          <Label>Secondary variant</Label>
          <ColorField.Group variant="secondary">
            <ColorField.Input />
          </ColorField.Group>
        </ColorField>
        <View class="w-[400px] flex-col gap-4">
          <ColorField fullWidth defaultValue={parseColor("#10B981")} name="color">
            <Label>Brand Color</Label>
            <ColorField.Group>
              <ColorField.Input />
            </ColorField.Group>
          </ColorField>
          <ColorField fullWidth defaultValue={parseColor("#8B5CF6")} name="color-with-suffix">
            <Label>Theme Color</Label>
            <ColorField.Group>
              <ColorField.Input />
            </ColorField.Group>
          </ColorField>
        </View>
        <ColorField
          className="w-[280px]"
          defaultValue={parseColor("#3B82F6")}
          name="described-color"
        >
          <Label>Primary Color</Label>
          <ColorField.Group>
            <ColorField.Input />
          </ColorField.Group>
          <Description>Enter your brand's primary color</Description>
        </ColorField>
        <ColorField
          className="w-[280px]"
          defaultValue={parseColor("#F59E0B")}
          name="accent-color"
        >
          <Label>Accent Color</Label>
          <ColorField.Group>
            <ColorField.Input />
          </ColorField.Group>
          <Description>Used for highlights and CTAs</Description>
        </ColorField>
      </View>
    </Stage>
  );
}

function Required() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <ColorField isRequired className="w-[280px]" name="color">
          <Label>Brand Color</Label>
          <ColorField.Group>
            <ColorField.Input placeholder="#000000" />
          </ColorField.Group>
        </ColorField>
        <ColorField isRequired className="w-[280px]" name="theme-color">
          <Label>Theme Color</Label>
          <ColorField.Group>
            <ColorField.Input placeholder="#000000" />
          </ColorField.Group>
          <Description>Required field</Description>
        </ColorField>
      </View>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <ColorField isInvalid isRequired className="w-[280px]" name="color">
          <Label>Color</Label>
          <ColorField.Group>
            <ColorField.Input placeholder="#000000" />
          </ColorField.Group>
          <FieldError>Please enter a valid hex color</FieldError>
        </ColorField>
        <ColorField isInvalid className="w-[280px]" name="invalid-color">
          <Label>Background Color</Label>
          <ColorField.Group>
            <ColorField.Input defaultValue="not-a-color" />
          </ColorField.Group>
          <FieldError>Invalid color format. Use hex (e.g., #FF5733)</FieldError>
        </ColorField>
        <ColorField isInvalid className="w-[280px]" name="described-invalid">
          <Label>Described Color</Label>
          <ColorField.Group>
            <ColorField.Input placeholder="#000000" />
          </ColorField.Group>
          <Description>Enter your brand's primary color</Description>
        </ColorField>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <ColorField
          isDisabled
          className="w-[280px]"
          defaultValue={parseColor("#0485F7")}
          name="color"
        >
          <Label>Color</Label>
          <ColorField.Group>
            <ColorField.Input />
          </ColorField.Group>
          <Description>This color field is disabled</Description>
        </ColorField>
        <ColorField isDisabled className="w-[280px]" name="color-empty">
          <Label>Color</Label>
          <ColorField.Group>
            <ColorField.Input placeholder="#000000" />
          </ColorField.Group>
          <Description>This color field is disabled</Description>
        </ColorField>
      </View>
    </Stage>
  );
}

function Channel(props: {
  label: string;
  channel: "hue" | "saturation" | "lightness" | "red" | "green" | "blue";
  colorSpace: "hsl" | "rgb";
  value: string;
  suffix?: string;
  width: string;
}) {
  return (
    <ColorField
      channel={props.channel}
      className={props.width}
      colorSpace={props.colorSpace}
      name={props.channel}
      value={parseColor(props.value)}
    >
      <Label>{props.label}</Label>
      <ColorField.Group>
        <ColorField.Input />
        {props.suffix ? (
          <ColorField.Suffix>
            <Text class="text-sm text-muted">{props.suffix}</Text>
          </ColorField.Suffix>
        ) : null}
      </ColorField.Group>
    </ColorField>
  );
}

function Channels() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <Text class="text-sm text-muted">Edit individual HSL channels:</Text>
        <View class="flex-row gap-4">
          <Channel channel="hue" colorSpace="hsl" label="Hue" value="#7F007F" width="w-[100px]" />
          <Channel
            channel="saturation"
            colorSpace="hsl"
            label="Saturation"
            suffix="%"
            value="#7F007F"
            width="w-[100px]"
          />
          <Channel
            channel="lightness"
            colorSpace="hsl"
            label="Lightness"
            suffix="%"
            value="#7F007F"
            width="w-[100px]"
          />
        </View>
        <View class="flex-row items-center gap-2">
          <ColorSwatch className="size-8" color="#7F007F" size="xs" />
          <Text class="text-sm">Current: #7F007F</Text>
        </View>
        <Text class="text-sm text-muted">Edit individual RGB channels:</Text>
        <View class="flex-row gap-4">
          <Channel channel="red" colorSpace="rgb" label="Red" value="#3B82F6" width="w-[80px]" />
          <Channel channel="green" colorSpace="rgb" label="Green" value="#3B82F6" width="w-[80px]" />
          <Channel channel="blue" colorSpace="rgb" label="Blue" value="#3B82F6" width="w-[80px]" />
        </View>
        <View class="flex-row items-center gap-2">
          <ColorSwatch className="size-8" color="#3B82F6" size="xs" />
          <Text class="text-sm">Current: #3B82F6</Text>
        </View>
      </View>
    </Stage>
  );
}

function StyleRenderPropsSplit() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <ColorField
          className={({ isDisabled }) => (isDisabled() ? "w-[280px] opacity-50" : "w-[280px]")}
          defaultValue={parseColor("#0485F7")}
          name="color"
          style={() => ({ width: 280 })}
        >
          <Label>Color</Label>
          <ColorField.Group>
            <ColorField.Input />
          </ColorField.Group>
        </ColorField>
        <ColorField
          className={({ isDisabled }) => (isDisabled() ? "w-[280px] opacity-50" : "w-[280px]")}
          defaultValue={parseColor("#EF4444")}
          isDisabled
          name="disabled-color"
          style={() => ({ width: 280 })}
        >
          <Label>Disabled</Label>
          <ColorField.Group>
            <ColorField.Input />
          </ColorField.Group>
        </ColorField>
      </View>
    </Stage>
  );
}

export const colorFieldScenarios: Record<string, Component> = {
  "color-field/basic": Basic,
  "color-field/variants": Variants,
  "color-field/required": Required,
  "color-field/invalid": Invalid,
  "color-field/disabled": Disabled,
  "color-field/channels": Channels,
  "color-field/style-render-props.split": StyleRenderPropsSplit,
};
