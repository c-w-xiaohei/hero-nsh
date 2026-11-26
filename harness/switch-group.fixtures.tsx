import { host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  ControlField,
  EnvironmentScope,
  Label,
  Switch,
  SwitchGroup,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only SwitchGroup fixtures (port sheet 4b), not shared scenarios.
 *
 * `nsh/test` cannot read DOM class names, data-slot or an input's checked
 * state, so these entries make the upstream facts visible: the root's presence
 * through `testID`, the two switches' geometry through `onLayout`, each
 * switch's own selection through its content text, and every commit through
 * `probe("change")` / `probe("row-change")`.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the fixture:
 *   layout       (default) two 80pt-wide switches, each reporting its box to
 *                `probe("layout")`, the group root reporting its own box, and
 *                each switch reporting commits to `probe("change")` as
 *                `(name, isSelected)`; host.params.orientation sets the
 *                group's orientation (omitted means the component default,
 *                vertical), host.params.disabled="1" disables the bluetooth
 *                switch, host.params.still="1" pins both switches to a fixed
 *                48pt height so the mobile layer can compare group and child
 *                bounds across environments without the switches' own
 *                `input` axis (touch `min-h-11`) moving them
 *   class-name   the layout case with `className="w-40"` on the group root, so
 *                the public className prop has a measurable effect (a caller
 *                class that never reaches the root leaves it at the children's
 *                80pt)
 *   independent  two switches whose content text shows their own state, so a
 *                press on one is visible and its sibling's state stays visible;
 *                a `testID="gap"` spacer sits between them as the bare group
 *                surface the mobile layer presses (M-002/M-003), and each
 *                switch reports commits to `probe("change")` as
 *                `(name, isSelected)`
 *   control-field  a `ControlField` row (Label + default switch Indicator)
 *                inside the group, controlled by a signal so the indicator
 *                follows the row's committed value; the row reports its box
 *                to `probe("layout")` as `name:"cf-row"` and commits to
 *                `probe("row-change")` (M-006)
 *   text         a bare string child, which `renderChildren` must turn into a
 *                `Text` (M-007)
 *
 * host.params.scope picks the environment wrapper ("" = host default,
 * "touch" = `EnvironmentScope input="touch"`), the same convention as
 * `switch.fixtures.tsx`. The test-only params `testInput`
 * ("pointer"/"touch") inject an outer EnvironmentScope input.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "group" | "wifi" | "bluetooth" | "cf-row") {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/* -------------------------------------------------------------------------------------------------
 * Environment injection (the mobile layer's scope param)
 * -----------------------------------------------------------------------------------------------*/

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
}
/* -------------------------------------------------------------------------------------------------
 * Layout case (T-001 … T-003, mobile M-004/M-005/M-007)
 * -----------------------------------------------------------------------------------------------*/

function LayoutCase(props: { groupClass?: string }) {
  const param = host.params.orientation;
  const orientation = param === "horizontal" || param === "vertical" ? param : undefined;
  const disabled = String(host.params.disabled ?? "") === "1";
  const still = String(host.params.still ?? "") === "1";
  const reportChange = probe("change");

  return (
    <Stage>
      <SwitchGroup
        className={props.groupClass}
        orientation={orientation}
        onLayout={layoutProbe("group")}
        testID="group"
      >
        <Switch
          aria-label="Wifi"
          className="w-20"
          onChange={(isSelected) => reportChange("wifi", isSelected)}
          onLayout={layoutProbe("wifi")}
          style={still ? { height: 48 } : undefined}
          testID="wifi"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
        <Switch
          aria-label="Bluetooth"
          className="w-20"
          isDisabled={disabled}
          onChange={(isSelected) => reportChange("bluetooth", isSelected)}
          onLayout={layoutProbe("bluetooth")}
          style={still ? { height: 48 } : undefined}
          testID="bluetooth"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </SwitchGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Independent toggles case (T-005, mobile M-001/M-002/M-003)
 * -----------------------------------------------------------------------------------------------*/

function IndependentSwitch(props: { name: string }) {
  const reportChange = probe("change");

  return (
    <Switch
      aria-label={props.name}
      onChange={(isSelected) => reportChange(props.name, isSelected)}
    >
      <Switch.Content>
        {({ isSelected }) => (
          <View class="flex-row items-center gap-3">
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Text>{`${props.name} ${isSelected() ? "On" : "Off"}`}</Text>
          </View>
        )}
      </Switch.Content>
    </Switch>
  );
}

function IndependentCase() {
  return (
    <Stage>
      <SwitchGroup>
        <IndependentSwitch name="Wifi" />
        {/* The bare group surface between the items: it owns no press path,
            so a press on it must reach no child (M-002/M-003). */}
        <View testID="gap" style={{ width: 64, height: 12 }} />
        <IndependentSwitch name="Bluetooth" />
      </SwitchGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ControlField row inside the group (mobile M-006)
 * -----------------------------------------------------------------------------------------------*/

function ControlFieldCase() {
  const selected = signal(false);
  const reportChange = probe("row-change");

  return (
    <Stage>
      <SwitchGroup testID="cf-group">
        <ControlField
          testID="cf-row"
          isSelected={selected()}
          onSelectedChange={(value) => {
            reportChange(value);
            selected.set(value);
          }}
          onLayout={layoutProbe("cf-row")}
        >
          <View class="flex-1 flex-col gap-0.5">
            <Label>Row label</Label>
          </View>
          <ControlField.Indicator />
        </ControlField>
      </SwitchGroup>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Bare string child (mobile M-007)
 * -----------------------------------------------------------------------------------------------*/

function TextCase() {
  return (
    <Stage>
      <SwitchGroup testID="text-group">{"Just a label"}</SwitchGroup>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "layout");

  if (name === "independent") return <Scoped><IndependentCase /></Scoped>;
  if (name === "class-name") return <Scoped><LayoutCase groupClass="w-40" /></Scoped>;
  if (name === "control-field") return <Scoped><ControlFieldCase /></Scoped>;
  if (name === "text") return <Scoped><TextCase /></Scoped>;

  return <Scoped><LayoutCase /></Scoped>;
}

mount(Fixture);
