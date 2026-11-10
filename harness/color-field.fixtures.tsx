import { host, mount, signal, Text, View } from "nsh";
import { Input } from "nsh/base";
import { ColorField, Description, FieldError, Label, parseColor } from "@heroui/react";
import type { ColorValue } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only ColorField fixture (port sheet 4b.3), not a shared scenario.
 *
 * The stories carry no callbacks and no test ids, and the shared scenarios use
 * `defaultValue` / a static `value` so the reference side can render the same
 * JSX; every regression case that reads a callback back, needs a writable
 * controlled value, moves the focus away from the field or targets one part by
 * `testID` opens this file instead.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `host.params.case` picks the shape:
 *   basic              Label "Color" + Group + Input, defaultValue #0485F7,
 *                      no test id: the `label:` selector reaches the input
 *                      (T-001)
 *   aria               Label + Input + Description "Enter your brand's primary
 *                      color" (T-009)
 *   required-invalid   isRequired + isInvalid + FieldError "Please enter a
 *                      valid hex color" (T-008)
 *   disabled           isDisabled, defaultValue #0485F7, onChange probe, input
 *                      testID color-input (T-010)
 *   prefix-suffix      Prefix "#", Suffix "%" as raw strings (T-011)
 *   controlled         `value` lives in a signal; onChange records the hex
 *                      string; the `set-value` button swaps #0485F7 for
 *                      #EF4444; the `outside` input is the blur target
 *                      (T-005, T-006, S-003)
 *   channel-hue        channel="hue" colorSpace="hsl", controlled
 *                      hsl(200, 50%, 50%), onChange records the hue channel
 *                      (T-007)
 *   channel-saturation channel="saturation" colorSpace="hsl", an uncontrolled
 *                      initial hsl(200, 50%, 50%): stepping a controlled value
 *                      would report onChange and snap the text back (S-002)
 *   keys-hex           defaultValue #0485F7, only the input carries a test id,
 *                      for the arrow / Home / End cases (S-001)
 *   full-width         a 400-point column with one `fullWidth` field and one
 *                      default field, each root measured through onLayout
 *                      (T-004)
 *   focus-probe        onFocus / onBlur probes and the input's test id (T-012,
 *                      used by the `.web` file only)
 */
function BasicCase() {
  return (
    <Stage>
      <ColorField name="color" defaultValue={parseColor("#0485F7")}>
        <Label>Color</Label>
        <ColorField.Group>
          <ColorField.Input />
        </ColorField.Group>
      </ColorField>
    </Stage>
  );
}

function AriaCase() {
  return (
    <Stage>
      <ColorField name="color">
        <Label>Color</Label>
        <ColorField.Group>
          <ColorField.Input />
        </ColorField.Group>
        <Description>Enter your brand's primary color</Description>
      </ColorField>
    </Stage>
  );
}

function RequiredInvalidCase() {
  return (
    <Stage>
      <ColorField isInvalid isRequired name="color">
        <Label>Color</Label>
        <ColorField.Group>
          <ColorField.Input />
        </ColorField.Group>
        <FieldError>Please enter a valid hex color</FieldError>
      </ColorField>
    </Stage>
  );
}

function DisabledCase() {
  return (
    <Stage>
      <ColorField
        isDisabled
        defaultValue={parseColor("#0485F7")}
        name="color"
        onChange={(color: ColorValue | null) => probe("onChange")(color ? color.toString("hex") : null)}
      >
        <Label>Color</Label>
        <ColorField.Group>
          <ColorField.Input testID="color-input" />
        </ColorField.Group>
      </ColorField>
    </Stage>
  );
}

function PrefixSuffixCase() {
  return (
    <Stage>
      <ColorField name="color">
        <Label>Color</Label>
        <ColorField.Group>
          <ColorField.Prefix>#</ColorField.Prefix>
          <ColorField.Input />
          <ColorField.Suffix>%</ColorField.Suffix>
        </ColorField.Group>
      </ColorField>
    </Stage>
  );
}

function ControlledCase() {
  const value = signal(parseColor("#0485F7"));

  return (
    <Stage>
      <ColorField
        name="color"
        value={value()}
        onChange={(color: ColorValue | null) => probe("onChange")(color ? color.toString("hex") : null)}
      >
        <Label>Color</Label>
        <ColorField.Group>
          <ColorField.Input testID="color-input" />
        </ColorField.Group>
      </ColorField>
      <View
        testID="set-value"
        role="button"
        class="px-3 py-1 bg-default"
        onPress={() => value.set(parseColor("#EF4444"))}
      >
        <Text>set value</Text>
      </View>
      <Input testID="outside" placeholder="outside" />
    </Stage>
  );
}

function ChannelCase(props: { channel: "hue" | "saturation"; label: string; controlled?: boolean }) {
  const color = parseColor("hsl(200, 50%, 50%)");

  return (
    <Stage>
      <ColorField
        channel={props.channel}
        colorSpace="hsl"
        name={props.channel}
        value={props.controlled === false ? undefined : color}
        defaultValue={props.controlled === false ? color : undefined}
        onChange={(color: ColorValue | null) =>
          probe("onChange")(color ? color.getChannelValue(props.channel) : null)
        }
      >
        <Label>{props.label}</Label>
        <ColorField.Group>
          <ColorField.Input testID="color-input" />
        </ColorField.Group>
      </ColorField>
      <Input testID="outside" placeholder="outside" />
    </Stage>
  );
}

function KeysHexCase() {
  return (
    <Stage>
      <ColorField defaultValue={parseColor("#0485F7")} name="color">
        <ColorField.Group>
          <ColorField.Input testID="color-input" />
        </ColorField.Group>
      </ColorField>
    </Stage>
  );
}

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "full" | "default") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function FullWidthCase() {
  return (
    <Stage>
      <View class="w-[400px] flex-col items-start gap-4">
        <ColorField
          fullWidth
          defaultValue={parseColor("#10B981")}
          name="full"
          onLayout={layoutProbe("full")}
        >
          <Label>Brand Color</Label>
          <ColorField.Group>
            <ColorField.Input />
          </ColorField.Group>
        </ColorField>
        <ColorField
          defaultValue={parseColor("#8B5CF6")}
          name="default"
          onLayout={layoutProbe("default")}
        >
          <Label>Theme Color</Label>
          <ColorField.Group>
            <ColorField.Input />
          </ColorField.Group>
        </ColorField>
      </View>
    </Stage>
  );
}

function FocusProbeCase() {
  return (
    <Stage>
      <ColorField name="color" onBlur={probe("onBlur")} onFocus={probe("onFocus")}>
        <Label>Color</Label>
        <ColorField.Group>
          <ColorField.Input testID="color-input" />
        </ColorField.Group>
      </ColorField>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");

  if (name === "aria") return <AriaCase />;
  if (name === "required-invalid") return <RequiredInvalidCase />;
  if (name === "disabled") return <DisabledCase />;
  if (name === "prefix-suffix") return <PrefixSuffixCase />;
  if (name === "controlled") return <ControlledCase />;
  if (name === "channel-hue") return <ChannelCase channel="hue" label="Hue" />;
  if (name === "channel-saturation") {
    return <ChannelCase channel="saturation" label="Saturation" controlled={false} />;
  }
  if (name === "keys-hex") return <KeysHexCase />;
  if (name === "full-width") return <FullWidthCase />;
  if (name === "focus-probe") return <FocusProbeCase />;

  return <BasicCase />;
}

mount(Fixture);
