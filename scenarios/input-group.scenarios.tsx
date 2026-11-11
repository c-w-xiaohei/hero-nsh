import { signal, View } from "nsh";
import { Button, Chip, Description, FieldError, InputGroup, Kbd, Label, Spinner, TextField } from "@heroui/react";
import { Stage } from "@scenario/stage";
import type { Component } from "./types";

/*
 * Shared InputGroup scenarios, written with HeroUI 3.2.7's API only, so the
 * reference app and this library render the same JSX. The story file is
 * input-group.stories.tsx; every entry below is one story except the splits
 * (port sheet 4b, "需要的共享场景").
 *
 *   input-group/default            story Default, without the envelope icon
 *                                  (icons cannot be shared; the icon stories
 *                                  below are the splits)
 *   input-group/variants           story Variants: primary and secondary
 *   input-group/full-width         story FullWidth, without the icons
 *   input-group/prefix-icon.split  story WithPrefixIcon: svg -> Glyph
 *   input-group/suffix-icon.split  story WithSuffixIcon: svg -> Glyph
 *   input-group/prefix-and-suffix.split
 *                                  story WithPrefixAndSuffix: "$" / "USD" text,
 *                                  type="number" (kept as the story has it)
 *   input-group/text-prefix        story WithTextPrefix: "https://"
 *   input-group/text-suffix        story WithTextSuffix: ".com"
 *   input-group/icon-prefix-text-suffix.split
 *                                  story WithIconPrefixAndTextSuffix
 *   input-group/copy-suffix.split  story WithCopySuffix: a copy Button
 *   input-group/password-toggle.split
 *                                  story PasswordWithToggle: a signal for
 *                                  `isVisible` (D17 / SOP 3.3.3)
 *   input-group/loading-suffix.split
 *                                  story WithLoadingSuffix: a Spinner
 *   input-group/keyboard-shortcut.split
 *                                  story WithKeyboardShortcut: a Kbd
 *   input-group/badge-suffix.split story WithBadgeSuffix: a Chip
 *   input-group/required           story Required: two fields
 *   input-group/invalid            story Invalid: two fields
 *   input-group/disabled           story Disabled: two fields
 *   input-group/text-area.split    story WithTextArea: the prompt composer
 *                                  without its Tooltips and with a signal for
 *                                  the text (D17)
 *
 * The stories' `name` props are kept: HeroUI accepts them, and this library
 * accepts them with no effect (port sheet §1.2 / §8). Icons have no NSH
 * equivalent (@iconify is absent), so every story that draws one is a split
 * and the library side renders a View stand-in here (time-field's precedent).
 * Tooltip is not ported yet (no src/components/tooltip), so the text-area
 * scenario keeps the buttons and drops the tooltips around them.
 */

/* A View stand-in for an svg glyph: NSH draws no svg (port sheet §3). The
 * reference side draws the story's paths. */
function Glyph(props: { class?: string }) {
  return <View class={props.class ?? "size-4 rounded-sm bg-field-foreground"} />;
}

function Default() {
  return (
    <Stage>
      <TextField className="w-[280px]" name="email">
        <Label>Email address</Label>
        <InputGroup>
          <InputGroup.Input className="w-[280px]" placeholder="name@email.com" />
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function Variants() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <TextField className="w-[280px]" name="primary">
          <Label>Primary variant</Label>
          <InputGroup variant="primary">
            <InputGroup.Input placeholder="name@email.com" />
          </InputGroup>
        </TextField>
        <TextField className="w-[280px]" name="secondary">
          <Label>Secondary variant</Label>
          <InputGroup variant="secondary">
            <InputGroup.Input placeholder="name@email.com" />
          </InputGroup>
        </TextField>
      </View>
    </Stage>
  );
}

function FullWidth() {
  return (
    <Stage>
      <View class="w-[400px] flex-col gap-4">
        <TextField fullWidth name="email">
          <Label>Email address</Label>
          <InputGroup fullWidth>
            <InputGroup.Input placeholder="name@email.com" />
          </InputGroup>
        </TextField>
        <TextField fullWidth name="password">
          <Label>Password</Label>
          <InputGroup fullWidth>
            <InputGroup.Input placeholder="Enter password" type="password" />
          </InputGroup>
        </TextField>
      </View>
    </Stage>
  );
}

/* NSH side of the split: the story's envelope svg becomes a Glyph. */
function WithPrefixIconSplit() {
  return (
    <Stage>
      <TextField className="w-[280px]" name="email">
        <Label>Email address</Label>
        <InputGroup>
          <InputGroup.Prefix>
            <Glyph />
          </InputGroup.Prefix>
          <InputGroup.Input className="w-[280px]" placeholder="name@email.com" />
        </InputGroup>
        <Description>We'll never share this with anyone else</Description>
      </TextField>
    </Stage>
  );
}

/* NSH side of the split: the story's envelope svg becomes a Glyph. */
function WithSuffixIconSplit() {
  return (
    <Stage>
      <TextField className="w-[280px]" name="email">
        <Label>Email address</Label>
        <InputGroup>
          <InputGroup.Input className="w-[280px]" placeholder="name@email.com" />
          <InputGroup.Suffix>
            <Glyph />
          </InputGroup.Suffix>
        </InputGroup>
        <Description>We don't send spam</Description>
      </TextField>
    </Stage>
  );
}

function WithPrefixAndSuffixSplit() {
  return (
    <Stage>
      <TextField className="w-[280px]" defaultValue="10" name="price">
        <Label>Set a price</Label>
        <InputGroup>
          <InputGroup.Prefix>$</InputGroup.Prefix>
          <InputGroup.Input className="w-[200px]" type="number" />
          <InputGroup.Suffix>USD</InputGroup.Suffix>
        </InputGroup>
        <Description>What customers would pay</Description>
      </TextField>
    </Stage>
  );
}

function WithTextPrefix() {
  return (
    <Stage>
      <TextField className="w-[280px]" defaultValue="heroui.com" name="website">
        <Label>Website</Label>
        <InputGroup>
          <InputGroup.Prefix>https://</InputGroup.Prefix>
          <InputGroup.Input className="w-[280px]" />
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function WithTextSuffix() {
  return (
    <Stage>
      <TextField className="w-[280px]" defaultValue="heroui" name="website">
        <Label>Website</Label>
        <InputGroup>
          <InputGroup.Input className="w-[280px]" />
          <InputGroup.Suffix>.com</InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

/* NSH side of the split: the story's globe svg becomes a Glyph. */
function WithIconPrefixAndTextSuffixSplit() {
  return (
    <Stage>
      <TextField className="w-[280px]" defaultValue="heroui" name="website">
        <Label>Website</Label>
        <InputGroup>
          <InputGroup.Prefix>
            <Glyph />
          </InputGroup.Prefix>
          <InputGroup.Input className="w-[280px]" />
          <InputGroup.Suffix>.com</InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

/* NSH side of the split: the story's copy svg becomes a Glyph. */
function WithCopySuffixSplit() {
  return (
    <Stage>
      <TextField className="w-[280px]" defaultValue="heroui.com" name="website">
        <Label>Website</Label>
        <InputGroup>
          <InputGroup.Input className="w-[280px]" />
          <InputGroup.Suffix className="pe-0">
            <Button isIconOnly aria-label="Copy" size="sm" variant="ghost">
              <Glyph />
            </Button>
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

/* NSH side of the split: `useState` becomes a signal, and the eye svg a Glyph
 * (D17 / SOP 3.3.3). */
function PasswordWithToggleSplit() {
  const isVisible = signal(false);

  return (
    <Stage>
      <TextField className="w-[280px]" name="password">
        <Label>Password</Label>
        <InputGroup>
          <InputGroup.Input
            className="w-[280px]"
            type={isVisible() ? "text" : "password"}
            value={isVisible() ? "87$2h.3diua" : "••••••••"}
          />
          <InputGroup.Suffix className="pe-0">
            <Button
              isIconOnly
              aria-label={isVisible() ? "Hide password" : "Show password"}
              size="sm"
              variant="ghost"
              onPress={() => isVisible.set(!isVisible())}
            >
              <Glyph />
            </Button>
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

/* NSH side of the split: the story's Spinner needs no svg, but the entry is a
 * split because its suffix is a component, not a glyph. */
function WithLoadingSuffixSplit() {
  return (
    <Stage>
      <TextField
        aria-label="Sending status"
        className="w-[280px]"
        defaultValue="Sending..."
        name="status"
      >
        <InputGroup>
          <InputGroup.Input className="w-[280px]" />
          <InputGroup.Suffix>
            <Spinner className="size-4" />
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function WithKeyboardShortcutSplit() {
  return (
    <Stage>
      <TextField aria-label="Command" className="w-[280px]" name="command">
        <InputGroup>
          <InputGroup.Input className="w-[280px]" placeholder="Command" />
          <InputGroup.Suffix className="pe-2">
            <Kbd>
              <Kbd.Abbr keyValue="command" />
              <Kbd.Content>K</Kbd.Content>
            </Kbd>
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function WithBadgeSuffixSplit() {
  return (
    <Stage>
      <TextField aria-label="Email address" className="w-[280px]" name="email">
        <InputGroup>
          <InputGroup.Input className="w-[280px]" placeholder="Email address" />
          <InputGroup.Suffix className="pe-2">
            <Chip color="accent" size="md" variant="soft">
              Pro
            </Chip>
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

function Required() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <TextField isRequired className="w-[280px]" name="email">
          <Label>Email address</Label>
          <InputGroup>
            <InputGroup.Input className="w-[280px]" placeholder="name@email.com" />
          </InputGroup>
        </TextField>
        <TextField isRequired name="price">
          <Label>Set a price</Label>
          <InputGroup>
            <InputGroup.Prefix>$</InputGroup.Prefix>
            <InputGroup.Input className="w-[200px]" placeholder="0" type="number" />
            <InputGroup.Suffix>USD</InputGroup.Suffix>
          </InputGroup>
          <Description>What customers would pay</Description>
        </TextField>
      </View>
    </Stage>
  );
}

function Invalid() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <TextField isInvalid isRequired className="w-[280px]" name="email">
          <Label>Email address</Label>
          <InputGroup>
            <InputGroup.Input className="w-[280px]" placeholder="name@email.com" />
          </InputGroup>
          <FieldError>Please enter a valid email address</FieldError>
        </TextField>
        <TextField isInvalid isRequired className="w-[280px]" name="price">
          <Label>Set a price</Label>
          <InputGroup>
            <InputGroup.Prefix>$</InputGroup.Prefix>
            <InputGroup.Input className="w-[200px]" placeholder="0" type="number" />
            <InputGroup.Suffix>USD</InputGroup.Suffix>
          </InputGroup>
          <FieldError>Price must be greater than 0</FieldError>
        </TextField>
      </View>
    </Stage>
  );
}

function Disabled() {
  return (
    <Stage>
      <View class="flex-col gap-4">
        <TextField isDisabled className="w-[280px]" defaultValue="name@email.com" name="email">
          <Label>Email address</Label>
          <InputGroup>
            <InputGroup.Input className="w-[280px]" />
          </InputGroup>
        </TextField>
        <TextField isDisabled className="w-[280px]" defaultValue="10" name="price">
          <Label>Set a price</Label>
          <InputGroup>
            <InputGroup.Prefix>$</InputGroup.Prefix>
            <InputGroup.Input className="w-[200px]" type="number" />
            <InputGroup.Suffix>USD</InputGroup.Suffix>
          </InputGroup>
        </TextField>
      </View>
    </Stage>
  );
}

/* NSH side of the split: `useState` becomes a signal, the onChange payload is
 * `{ value }` (NSH has no ChangeEvent), and the Tooltips around the buttons are
 * dropped because Tooltip is not ported yet (port sheet §1.5, text-control). */
function WithTextAreaSplit() {
  const value = signal("");

  return (
    <Stage>
      <TextField
        fullWidth
        aria-label="Prompt input"
        className="flex w-sm flex-col sm:w-lg"
        name="prompt"
      >
        <InputGroup fullWidth className="flex flex-col gap-2 rounded-3xl py-2">
          <InputGroup.Prefix className="px-3 py-0">
            <Button aria-label="Add context" size="sm" variant="outline">
              Add Context
            </Button>
          </InputGroup.Prefix>
          <InputGroup.TextArea
            className="w-full resize-none px-3.5 py-0"
            placeholder="Assign tasks or ask anything..."
            rows={5}
            value={value()}
            onChange={(event) => value.set(event.value)}
          />
          <InputGroup.Suffix className="flex w-full items-center gap-1.5 px-3 py-0">
            <Button isIconOnly aria-label="Attach file" size="sm" variant="tertiary">
              <Glyph />
            </Button>
            <Button isIconOnly aria-label="Connect Apps" size="sm" variant="tertiary">
              <Glyph />
            </Button>
            <View class="ms-auto flex-row items-center gap-1.5">
              <Button isIconOnly aria-label="Voice input" size="sm" variant="ghost">
                <Glyph />
              </Button>
              <Button
                isIconOnly
                aria-label="Send prompt"
                isDisabled={!value().trim()}
                variant="primary"
                onPress={() => value.set("")}
              >
                <Glyph />
              </Button>
            </View>
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </Stage>
  );
}

export const inputGroupScenarios: Record<string, Component> = {
  "input-group/default": Default,
  "input-group/variants": Variants,
  "input-group/full-width": FullWidth,
  "input-group/prefix-icon.split": WithPrefixIconSplit,
  "input-group/suffix-icon.split": WithSuffixIconSplit,
  "input-group/prefix-and-suffix.split": WithPrefixAndSuffixSplit,
  "input-group/text-prefix": WithTextPrefix,
  "input-group/text-suffix": WithTextSuffix,
  "input-group/icon-prefix-text-suffix.split": WithIconPrefixAndTextSuffixSplit,
  "input-group/copy-suffix.split": WithCopySuffixSplit,
  "input-group/password-toggle.split": PasswordWithToggleSplit,
  "input-group/loading-suffix.split": WithLoadingSuffixSplit,
  "input-group/keyboard-shortcut.split": WithKeyboardShortcutSplit,
  "input-group/badge-suffix.split": WithBadgeSuffixSplit,
  "input-group/required": Required,
  "input-group/invalid": Invalid,
  "input-group/disabled": Disabled,
  "input-group/text-area.split": WithTextAreaSplit,
};
