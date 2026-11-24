import { host, mount, platform, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Input } from "nsh/base";
import {
  ColorField,
  Description,
  EnvironmentScope,
  FieldError,
  Label,
  parseColor,
} from "@heroui/react";
import type { ColorValue } from "@heroui/react";
import type { ColorInputGroupEnterKeyHint } from "../src/components/color-input-group/context";
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
 *   controlled         `value` lives in a signal and onChange writes it back,
 *                      a real controlled field; onChange also records the hex
 *                      string; the `set-value` button swaps #0485F7 for
 *                      #EF4444; the `outside` input is the blur target
 *                      (T-005, T-006, S-003, X-001)
 *   controlled-reject  the same shape, but nothing writes the signal: a
 *                      controlled parent that ignores every edit, so the text
 *                      only changes through the field's own writes
 *                      (X-001, X-002)
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
 *
 * A-010's mobile cases (sheet §2):
 *   layout         the `ColorField.Group` reports `onLayout` bounds; run once
 *                  per `scope` (touch lifts the 36 pt row past 44 pt, pointer
 *                  keeps 36). `host.params.ekh` feeds the Root's
 *                  `enterKeyHint` so the hint rides along while bounds are
 *                  read ("" = unset)
 *   submit         onChange (Root) / onSubmit / blur / focus (Input) probes
 *                  plus an `outside` blur target; `host.params.sb` feeds the
 *                  Input's `submitBehavior` ("" = unset → the field's
 *                  keep-focus `"submit"` default)
 *   kbd            one field per Root `enterKeyHint` value (seven mounts)
 *                  and one per Input `returnKeyType` value (five mounts) —
 *                  mounting is the channel assertion (sheet §6)
 *   hover          the Group's `isHovered` render-prop record plus
 *                  `onHover*` / `onMouse*` probes on Group and Input, a
 *                  `root-press` probe making the Group pressable so M-002's
 *                  touch press has a target, and `onPress` probes on the
 *                  affixes for the no-press-channel contract
 *                  (color-input-group's `hover` case precedent)
 *   baseline       M-010's whole default-environment surface in ONE app —
 *                  the commit-boundary controlled field (Label + isRequired
 *                  + isInvalid + FieldError + affixes + Description + focus
 *                  probes + an outside blur target), a hue channel field, a
 *                  hex step field, a saturation channel field, a disabled
 *                  field and the fullWidth/default width pair — so the
 *                  baseline row needs a single open (sequential web hosts
 *                  exhaust the target)
 *
 * `host.params.scope` wraps every case: "" = the host's default environment
 * (pointer — the desktop-parity side), "touch" = `EnvironmentScope
 * input="touch"`, the same convention switch/date-input-group use.
 * The test-only params `testInput` ("pointer"/"touch") inject an outer
 * EnvironmentScope input.
 */

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  // Test-harness environment params (only the mobile tests set them —
  // absent keeps the host-derived default): `scope="touch"` is the inner
  // override, `testInput` ("pointer"/"touch") injects the scope so the
  // pointer baseline is host-independent (the inner `scope` still wins).
  // One provider only: `props.children` is placed inside it directly —
  // pre-building a fragment first would mount the children under this
  // component's own creation scope instead of the provider.
  const input =
    String(host.params.scope ?? "") === "touch"
      ? "touch"
      : ((v) => (v === "pointer" || v === "touch" ? v : undefined))(
          String(host.params.testInput ?? ""),
        );

  return input !== undefined ? (
    <EnvironmentScope input={input}>{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}function BasicCase() {
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
      <ColorField name="color" testID="field-root">
        <Label>Color</Label>
        <ColorField.Group testID="group">
          <ColorField.Prefix>#</ColorField.Prefix>
          <ColorField.Input />
          <ColorField.Suffix>%</ColorField.Suffix>
        </ColorField.Group>
      </ColorField>
    </Stage>
  );
}

function ControlledCase(props: { writes: boolean }) {
  const value = signal<ColorValue | null>(parseColor("#0485F7"));

  return (
    <Stage>
      <ColorField
        name="color"
        value={value()}
        onChange={(color: ColorValue | null) => {
          if (props.writes) value.set(color);
          probe("onChange")(color ? color.toString("hex") : null);
        }}
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

/* A-010: the Group's `onLayout` bounds — M-001 reads `height` under both
 * environments (the inherited `min-h-11` lifts the 36 pt row past 44 pt under
 * touch). `ekh` carries the Root's `enterKeyHint` so the hint channel mounts
 * on the same surface. */
function LayoutCase() {
  const reportLayout = probe("layout");
  const ekh = String(host.params.ekh ?? "");

  return (
    <Stage>
      <ColorField
        name="color"
        defaultValue={parseColor("#0485F7")}
        enterKeyHint={ekh === "" ? undefined : (ekh as ColorInputGroupEnterKeyHint)}
      >
        <Label>Color</Label>
        <ColorField.Group
          testID="group"
          onLayout={(e) =>
            reportLayout({ width: e.bounds.size.width, height: e.bounds.size.height })
          }
        >
          <ColorField.Input testID="color-input" />
        </ColorField.Group>
      </ColorField>
    </Stage>
  );
}

/* A-010: the field submit chain — Enter runs `field.onSubmit` →
 * `handle.commit()` and keeps the focus (the field's `submitBehavior` default
 * `"submit"`); `sb` feeds the Input's explicit `submitBehavior`, which wins
 * (M-003, M-004). The `outside` input is the blur target. */
function SubmitCase() {
  const sb = String(host.params.sb ?? "");

  return (
    <Stage>
      <ColorField
        name="color"
        defaultValue={parseColor("#0485F7")}
        onChange={(color: ColorValue | null) =>
          probe("onChange")(color ? color.toString("hex") : null)
        }
      >
        <Label>Color</Label>
        <ColorField.Group>
          <ColorField.Input
            testID="color-input"
            submitBehavior={
              sb === "" ? undefined : (sb as "submit" | "blurAndSubmit" | "newline")
            }
            onSubmit={probe("onSubmit")}
            onBlur={probe("blur")}
            onFocus={probe("focus")}
          />
        </ColorField.Group>
      </ColorField>
      <Input testID="outside" placeholder="outside" />
    </Stage>
  );
}

/* A-010: every Root `enterKeyHint` (the seven useTextField values) and Input
 * `returnKeyType` value mounts — mounting is the channel assertion (M-005);
 * what the soft keyboard labels with them is a real-device item (sheet §6). */
function KbdCase() {
  return (
    <Stage>
      <View class="flex-col gap-2">
        {(["enter", "done", "go", "next", "previous", "search", "send"] as const).map(
          (hint) => (
            <ColorField name={`kh-${hint}`} enterKeyHint={hint}>
              <ColorField.Group>
                <ColorField.Input testID={`kh-${hint}`} />
              </ColorField.Group>
            </ColorField>
          ),
        )}
        {(["done", "go", "next", "search", "send"] as const).map((kind) => (
          <ColorField name={`kr-${kind}`}>
            <ColorField.Group>
              <ColorField.Input testID={`kr-${kind}`} returnKeyType={kind} />
            </ColorField.Group>
          </ColorField>
        ))}
      </View>
    </Stage>
  );
}

/* A-010: the inherited hover face — the Group's `isHovered` render-prop
 * record and `onHover*` / `onMouse*` callbacks plus the Input's own pair;
 * touch gates all of it (M-002). The affix `onPress` probes keep the
 * no-press-channel contract visible: they record only what the caller wires,
 * the component builds none (M-006's bare affixes live in prefix-suffix). */
function HoverCase() {
  const reportRoot = probe("root-class");

  return (
    <Stage>
      <ColorField name="color" defaultValue={parseColor("#0485F7")}>
        <Label>Color</Label>
        <ColorField.Group
          testID="group"
          className={({ isHovered }) => {
            reportRoot({ isHovered: isHovered() });
            return "";
          }}
          onHoverStart={probe("root-hover-start")}
          onHoverEnd={probe("root-hover-end")}
          onHoverChange={probe("root-hover-change")}
          onMouseEnter={probe("root-mouse-enter")}
          onMouseLeave={probe("root-mouse-leave")}
          onPress={probe("root-press")}
        >
          <ColorField.Prefix onPress={probe("prefix-press")}>#</ColorField.Prefix>
          <ColorField.Input
            testID="color-input"
            onHoverStart={probe("input-hover-start")}
            onHoverEnd={probe("input-hover-end")}
            onHoverChange={probe("input-hover-change")}
          />
          <ColorField.Suffix onPress={probe("suffix-press")}>%</ColorField.Suffix>
        </ColorField.Group>
      </ColorField>
    </Stage>
  );
}

/* M-010: the whole default-environment contract in ONE app — a dozen
 * sequential web hosts in a single test exhausts the `--target web`
 * browser pool, so the baseline row mounts every face it reads at once
 * (color-input-group's `baseline` precedent). `b-`-prefixed testIDs
 * distinguish the fields; probe names stay the per-case ones (`onChange`,
 * `layout`, `b-focus` / `b-blur`). */
function BaselineCase() {
  const value = signal<ColorValue | null>(parseColor("#0485F7"));

  return (
    <View class="flex-col gap-3 p-4">
      <ColorField
        isInvalid
        isRequired
        name="b-main"
        value={value()}
        onChange={(color: ColorValue | null) => {
          value.set(color);
          probe("onChange")(color ? color.toString("hex") : null);
        }}
      >
        <Label>Brand Color</Label>
        <ColorField.Group>
          <ColorField.Prefix>#</ColorField.Prefix>
          <ColorField.Input
            testID="b-input"
            onBlur={probe("b-blur")}
            onFocus={probe("b-focus")}
          />
          <ColorField.Suffix>%</ColorField.Suffix>
        </ColorField.Group>
        <FieldError>Bad color</FieldError>
      </ColorField>
      <Input testID="b-outside" placeholder="outside" />

      <ColorField
        channel="hue"
        colorSpace="hsl"
        name="b-hue"
        defaultValue={parseColor("hsl(200, 50%, 50%)")}
      >
        <Label>Hue</Label>
        <ColorField.Group>
          <ColorField.Input testID="b-hue" />
        </ColorField.Group>
        <Description>Pick a hue</Description>
      </ColorField>

      <ColorField
        channel="saturation"
        colorSpace="hsl"
        name="b-saturation"
        defaultValue={parseColor("hsl(200, 50%, 50%)")}
      >
        <Label>Saturation</Label>
        <ColorField.Group>
          <ColorField.Input testID="b-saturation" />
        </ColorField.Group>
      </ColorField>

      <ColorField defaultValue={parseColor("#0485F7")} name="b-keys">
        <ColorField.Group>
          <ColorField.Input testID="b-keys" />
        </ColorField.Group>
      </ColorField>

      {/* controlled-reject: a fixed `value` the parent never rewrites, so
       * commits report but the displayed text only moves through the
       * field's own writes (X-001 / X-002 semantics). */}
      <ColorField
        value={parseColor("#0485F7")}
        name="b-reject"
        onChange={(color: ColorValue | null) =>
          probe("onChange-reject")(color ? color.toString("hex") : null)
        }
      >
        <ColorField.Group>
          <ColorField.Input testID="b-reject" />
        </ColorField.Group>
      </ColorField>

      <ColorField isDisabled defaultValue={parseColor("#0485F7")} name="b-disabled">
        <Label>Disabled</Label>
        <ColorField.Group>
          <ColorField.Input testID="b-disabled" />
        </ColorField.Group>
      </ColorField>

      <View class="w-[400px] flex-col items-start gap-4">
        <ColorField
          fullWidth
          defaultValue={parseColor("#10B981")}
          name="b-full"
          onLayout={layoutProbe("full")}
        >
          <Label>Full</Label>
          <ColorField.Group>
            <ColorField.Input />
          </ColorField.Group>
        </ColorField>
        <ColorField
          defaultValue={parseColor("#8B5CF6")}
          name="b-plain"
          onLayout={layoutProbe("default")}
        >
          <Label>Plain</Label>
          <ColorField.Group>
            <ColorField.Input />
          </ColorField.Group>
        </ColorField>
      </View>
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");

  // The host OS the app itself reports (the table/tabs convention): the
  // mobile tests branch on it to register degraded acceptance where a
  // native host gap (iOS press resolving through the ancestor hit test on
  // M-006) makes the driver's NOT_FOUND path unobservable — never a
  // silent skip.
  probe("platform")(platform.os);

  if (name === "aria") return <Scoped><AriaCase /></Scoped>;
  if (name === "required-invalid") return <Scoped><RequiredInvalidCase /></Scoped>;
  if (name === "disabled") return <Scoped><DisabledCase /></Scoped>;
  if (name === "prefix-suffix") return <Scoped><PrefixSuffixCase /></Scoped>;
  if (name === "controlled") return <Scoped><ControlledCase writes /></Scoped>;
  if (name === "controlled-reject") return <Scoped><ControlledCase writes={false} /></Scoped>;
  if (name === "channel-hue") return <Scoped><ChannelCase channel="hue" label="Hue" /></Scoped>;
  if (name === "channel-saturation") {
    return <Scoped><ChannelCase channel="saturation" label="Saturation" controlled={false} /></Scoped>;
  }
  if (name === "keys-hex") return <Scoped><KeysHexCase /></Scoped>;
  if (name === "full-width") return <Scoped><FullWidthCase /></Scoped>;
  if (name === "focus-probe") return <Scoped><FocusProbeCase /></Scoped>;
  if (name === "layout") return <Scoped><LayoutCase /></Scoped>;
  if (name === "submit") return <Scoped><SubmitCase /></Scoped>;
  if (name === "kbd") return <Scoped><KbdCase /></Scoped>;
  if (name === "hover") return <Scoped><HoverCase /></Scoped>;
  if (name === "baseline") return <Scoped><BaselineCase /></Scoped>;

  return <Scoped><BasicCase /></Scoped>;
}

mount(Fixture);
