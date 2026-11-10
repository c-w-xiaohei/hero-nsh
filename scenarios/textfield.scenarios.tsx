import { signal, View } from "nsh";
import { Description, FieldError, Input, Label, TextArea, TextField } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Shared TextField scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX. The story file is
 * textfield.stories.tsx; every entry below is one story except the two splits
 * (port sheet 4b, "需要的共享场景").
 *
 *   textfield/default          story Default
 *   textfield/full-width       story FullWidth: input, textarea, invalid field
 *   textfield/with-textarea    story WithTextArea: rows 4 / 6 and `resize`
 *   textfield/required         story Required
 *   textfield/with-description story WithDescription
 *   textfield/invalid          story Invalid
 *   textfield/disabled         story Disabled
 *   textfield/input-types      story InputTypes: number / password / email
 *   textfield/controlled       story Controlled: two signals and the character
 *                              counts
 *   textfield/with-validation  story WithValidation: FieldError while invalid,
 *                              Description otherwise
 *   textfield/render-props.split
 *                              the function form of `children`; HeroUI passes
 *                              values and this side passes accessors (D17)
 *
 * The stories' `name` props are kept: HeroUI accepts them, and this library
 * accepts them with no effect (port sheet §1.2 / §8).
 */

function Default() {
  return (
    <Stage>
      <TextField name="name" onChange={probe("onChange")}>
        <Label>Your name</Label>
        <Input className="w-[280px]" placeholder="John" onFocus={probe("onFocus")} />
      </TextField>
    </Stage>
  );
}

function FullWidth() {
  return (
    <View class="flex w-[400px] flex-col gap-4">
      <TextField fullWidth name="name">
        <Label>Your name</Label>
        <Input placeholder="John" />
      </TextField>
      <TextField fullWidth name="productDescription">
        <Label>Describe your product</Label>
        <TextArea placeholder="My product is..." />
      </TextField>
      <TextField fullWidth isInvalid isRequired name="password" type="password">
        <Label>Password</Label>
        <Input />
        <FieldError>Password must be longer than 8 characters</FieldError>
      </TextField>
    </View>
  );
}

function WithTextArea() {
  return (
    <View class="flex flex-col gap-4">
      <TextField name="productDescription">
        <Label>Describe your product</Label>
        <TextArea className="w-[280px]" placeholder="My product is..." />
      </TextField>
      <TextField name="detailedDescription">
        <Label>Detailed description</Label>
        <TextArea className="w-[280px]" placeholder="Provide more details..." rows={4} />
        <Description>Minimum 4 rows</Description>
      </TextField>
      <TextField name="review">
        <Label>Review</Label>
        <TextArea
          className="w-[280px]"
          placeholder="Share your experience..."
          rows={6}
          style={{ resize: "vertical" }}
        />
        <Description>Resizable vertically</Description>
      </TextField>
    </View>
  );
}

function Required() {
  return (
    <View class="flex flex-col gap-4">
      <TextField isRequired name="email" type="email">
        <Label>Email</Label>
        <Input className="w-[280px]" placeholder="john@example.com" />
      </TextField>
      <TextField isRequired name="address">
        <Label>Delivery address</Label>
        <TextArea className="w-[280px]" placeholder="123 Main St, Anytown, USA" />
        <Description>Make sure to include the zip code</Description>
      </TextField>
    </View>
  );
}

function WithDescription() {
  return (
    <View class="flex flex-col gap-4">
      <TextField name="name">
        <Label>Your name</Label>
        <Input className="w-[280px]" placeholder="John" />
        <Description>We'll never share this with anyone else</Description>
      </TextField>
      <TextField name="address">
        <Label>Delivery address</Label>
        <TextArea className="w-[280px]" placeholder="123 Main St, Anytown, USA" />
        <Description>Make sure to include the zip code</Description>
      </TextField>
    </View>
  );
}

function Invalid() {
  return (
    <View class="flex flex-col gap-4">
      <TextField isInvalid isRequired name="password" type="password">
        <Label>Your password</Label>
        <Input className="w-[280px]" />
        <FieldError>Password must be longer than 8 characters</FieldError>
      </TextField>
      <TextField isInvalid isRequired name="address">
        <Label>Delivery address</Label>
        <TextArea className="w-[280px]" placeholder="123 Main St, Anytown, USA" />
        <FieldError>The address is invalid</FieldError>
      </TextField>
    </View>
  );
}

function Disabled() {
  return (
    <View class="flex flex-col gap-4">
      <TextField isDisabled name="name">
        <Label>Your name</Label>
        <Input className="w-[280px]" placeholder="John" />
        <Description>We'll never share this with anyone else</Description>
      </TextField>
      <TextField isDisabled name="message">
        <Label>Your message</Label>
        <TextArea className="w-[280px]" placeholder="Tell us more about yourself..." />
        <Description>Min 50 characters</Description>
      </TextField>
    </View>
  );
}

function InputTypes() {
  return (
    <View class="flex w-80 flex-col gap-4">
      <TextField name="age" type="number">
        <Label>Your age</Label>
        <Input className="w-[280px]" placeholder="18" />
      </TextField>
      <TextField name="password" type="password">
        <Label>Your password</Label>
        <Input className="w-[280px]" placeholder="••••••••" />
      </TextField>
      <TextField name="email" type="email">
        <Label>Your email</Label>
        <Input className="w-[280px]" placeholder="john@example.com" />
      </TextField>
    </View>
  );
}

function Controlled() {
  const inputValue = signal("");
  const textAreaValue = signal("");

  return (
    <View class="flex flex-col gap-4">
      <TextField name="name" value={inputValue()} onChange={(next) => inputValue.set(next)}>
        <Label>Your name</Label>
        <Input className="w-[280px]" placeholder="John" />
        <Description>{`Character count: ${inputValue().length}`}</Description>
      </TextField>
      <TextField name="bio" value={textAreaValue()} onChange={(next) => textAreaValue.set(next)}>
        <Label>Your bio</Label>
        <TextArea className="w-[280px]" placeholder="Tell us about yourself..." />
        <Description>{`Character count: ${textAreaValue().length} / 500`}</Description>
      </TextField>
    </View>
  );
}

function WithValidation() {
  const username = signal("");
  const bio = signal("");
  const isUsernameInvalid = () => username().length > 0 && username().length < 3;
  const isBioInvalid = () => bio().length > 0 && bio().length < 20;

  return (
    <View class="flex flex-col gap-4">
      <TextField
        isRequired
        isInvalid={isUsernameInvalid()}
        name="username"
        value={username()}
        onChange={(next) => username.set(next)}
      >
        <Label>Username</Label>
        <Input className="w-[280px]" placeholder="john_doe" />
        <If when={isUsernameInvalid()}>
          <FieldError>Username must be at least 3 characters</FieldError>
        </If>
        <If when={!isUsernameInvalid()}>
          <Description>Choose a unique username</Description>
        </If>
      </TextField>
      <TextField
        isRequired
        isInvalid={isBioInvalid()}
        name="bio"
        value={bio()}
        onChange={(next) => bio.set(next)}
      >
        <Label>Bio</Label>
        <TextArea className="w-[280px]" placeholder="Tell us about yourself..." />
        <If when={isBioInvalid()}>
          <FieldError>Bio must be at least 20 characters</FieldError>
        </If>
        <If when={!isBioInvalid()}>
          <Description>{`Min 20 characters (${bio().length}/20)`}</Description>
        </If>
      </TextField>
    </View>
  );
}

type ChildrenValues = {
  isDisabled: () => boolean;
  isInvalid: () => boolean;
  isReadOnly: () => boolean;
  isRequired: () => boolean;
};

/*
 * The function form of `children` (T-013). HeroUI passes plain booleans; this
 * side passes accessors (D17), so the entry carries the `.split` suffix.
 */
function RenderPropsSplit() {
  return (
    <Stage>
      <TextField isRequired>
        {(values: ChildrenValues) => (
          <>
            <Label>Your name</Label>
            <Input className="w-[280px]" />
            <Description>{values.isRequired() ? "Required" : "Optional"}</Description>
          </>
        )}
      </TextField>
    </Stage>
  );
}

export const textFieldScenarios = {
  "textfield/default": Default,
  "textfield/full-width": FullWidth,
  "textfield/with-textarea": WithTextArea,
  "textfield/required": Required,
  "textfield/with-description": WithDescription,
  "textfield/invalid": Invalid,
  "textfield/disabled": Disabled,
  "textfield/input-types": InputTypes,
  "textfield/controlled": Controlled,
  "textfield/with-validation": WithValidation,
  "textfield/render-props.split": RenderPropsSplit,
} satisfies Record<string, Component>;
