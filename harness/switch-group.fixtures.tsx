import { host, mount, Text, View } from "nsh";
import { Switch, SwitchGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only SwitchGroup fixtures (port sheet 4b), not shared scenarios.
 *
 * `nsh/test` cannot read DOM class names, data-slot or an input's checked
 * state, so these entries make the upstream facts visible: the root's presence
 * through `testID`, the two switches' geometry through `onLayout`, and each
 * switch's own selection through its content text.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * host.params.case picks the fixture:
 *   layout       (default) two 80pt-wide switches, each reporting its box to
 *                `probe("layout")`, and the group root reporting its own box;
 *                host.params.orientation sets the group's orientation (omitted
 *                means the component default, vertical)
 *   class-name   the layout case with `className="w-40"` on the group root, so
 *                the public className prop has a measurable effect (a caller
 *                class that never reaches the root leaves it at the children's
 *                80pt)
 *   independent  two switches whose content text shows their own state, so a
 *                press on one is visible and its sibling's state stays visible
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: "group" | "wifi" | "bluetooth") {
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
 * Layout case (T-001 … T-003)
 * -----------------------------------------------------------------------------------------------*/

function LayoutCase(props: { groupClass?: string }) {
  const param = host.params.orientation;
  const orientation = param === "horizontal" || param === "vertical" ? param : undefined;

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
          onLayout={layoutProbe("wifi")}
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
          onLayout={layoutProbe("bluetooth")}
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
 * Independent toggles case (T-005)
 * -----------------------------------------------------------------------------------------------*/

function IndependentSwitch(props: { name: string }) {
  return (
    <Switch aria-label={props.name}>
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
        <IndependentSwitch name="Bluetooth" />
      </SwitchGroup>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "layout");

  if (name === "independent") return <IndependentCase />;
  if (name === "class-name") return <LayoutCase groupClass="w-40" />;

  return <LayoutCase />;
}

mount(Fixture);
