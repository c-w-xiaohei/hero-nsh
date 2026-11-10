import { host, mount, signal, Text, View } from "nsh";
import type { InputRef } from "nsh";
import { ColorInputGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorInputGroup fixture (port sheet 4b.3), not a shared scenario.
 *
 * HeroUI 3.2.7's package entry does not export ColorInputGroup: the four parts
 * reach the public API only as `ColorField.Group / Input / Prefix / Suffix`, and
 * ColorField is a later unit. A shared scenario built on `@heroui/react` would
 * therefore fail to compile against the reference package, so the upstream
 * module has no shared scene and no screenshots of its own; this fixture
 * exercises the parts through our public entry instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the shape:
 *   basic          the minimal group with one Input (the default)
 *   variants       primary, secondary, fullWidth and a prefixed group together,
 *                  for the "every variant mounts with its parts" case
 *   full-width     a single fullWidth group
 *   prefix-suffix  Prefix "#", Suffix "%", both as raw strings
 *   disabled       the Input's own disabled, with an onChange probe
 *   readonly       the Input's own readOnly and a default value, with a probe
 *   controlled     the value lives in a signal; onChange records the payload
 *                  and writes it back, so every keystroke is reported
 *   render-props   the Root className function records the rendered accessors;
 *                  a `blur` button unfocuses the input through its ref
 */

function BasicCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Input testID="group-input" placeholder="#000000" />
      </ColorInputGroup>
    </Stage>
  );
}

function VariantsCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group" variant="primary">
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
      <ColorInputGroup testID="group" variant="secondary">
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
      <ColorInputGroup testID="group" fullWidth>
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Prefix>prefix</ColorInputGroup.Prefix>
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
    </Stage>
  );
}

function FullWidthCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group" fullWidth>
        <ColorInputGroup.Input testID="group-input" />
      </ColorInputGroup>
    </Stage>
  );
}

function PrefixSuffixCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Prefix>#</ColorInputGroup.Prefix>
        <ColorInputGroup.Input testID="group-input" />
        <ColorInputGroup.Suffix>%</ColorInputGroup.Suffix>
      </ColorInputGroup>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Input disabled testID="group-input" onChange={probe("onChange")} />
      </ColorInputGroup>
    </Stage>
  );
}

function ReadonlyCase() {
  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Input
          readOnly
          defaultValue="#ff0000"
          testID="group-input"
          onChange={probe("onChange")}
        />
      </ColorInputGroup>
    </Stage>
  );
}

function ControlledCase() {
  const value = signal("");

  return (
    <Stage>
      <ColorInputGroup testID="group">
        <ColorInputGroup.Input
          value={value()}
          testID="group-input"
          onChange={(event) => {
            probe("onChange")(event);
            value.set(event.value);
          }}
        />
      </ColorInputGroup>
    </Stage>
  );
}

function RenderPropsCase() {
  const record = probe("root-class");
  let input: InputRef | undefined;

  return (
    <Stage>
      <ColorInputGroup
        testID="group"
        className={({ isHovered, isFocusWithin, isFocusVisible }) => {
          record({
            isHovered: isHovered(),
            isFocusWithin: isFocusWithin(),
            isFocusVisible: isFocusVisible(),
          });

          return "";
        }}
      >
        <ColorInputGroup.Input
          testID="group-input"
          ref={(node) => {
            input = node;
          }}
          onBlur={probe("input-blur")}
          onFocus={probe("input-focus")}
        />
      </ColorInputGroup>
      <View testID="blur" role="button" class="px-3 py-1 bg-default" onPress={() => input?.blur()}>
        <Text>blur</Text>
      </View>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");

  if (name === "variants") return <VariantsCase />;
  if (name === "full-width") return <FullWidthCase />;
  if (name === "prefix-suffix") return <PrefixSuffixCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "readonly") return <ReadonlyCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "render-props") return <RenderPropsCase />;

  return <BasicCase />;
}

mount(Fixture);
