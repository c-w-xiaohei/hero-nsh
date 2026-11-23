import { host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, Label, Radio, RadioGroup } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only RadioGroup fixture for the adapt unit (adapt-sheets/radio-group.md
 * §4). The group is an action-B container: it adds no press surface of its
 * own, so the fixture exercises the *group contract* (single-write select,
 * focus-within, layout) while the press surface stays on each
 * `Radio.Content` row, which the radio unit already adapted.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * `groupBody` is called at the children position, as `radio.fixtures.tsx`'s
 * `Group` does — the call runs where `props.children` is placed inside the
 * group's context providers; items materialized ahead of that placement
 * mount without the group context and lose the `select` path.
 *
 * host.params (the shape radio-group.mobile.test.tsx opens with):
 *   scope        "" = host default pointer environment, "touch" =
 *                `EnvironmentScope input="touch"`
 *   testInput    "pointer"/"touch" — an outer EnvironmentScope input so the
 *                pointer baseline is host-independent
 *   default      the group's defaultValue ("dogs" when absent)
 *   orientation  "vertical" (default) / "horizontal"
 *   disabled     group `isDisabled`
 *   readonly     group `isReadOnly`
 *   gap          "1" inserts a bare `id:group-gap` spacer between items —
 *                a plain View with no press handling (M-002 / M-003)
 *
 * Probes in app.storage():
 *   onChange  the group's single commit channel
 *   press     each row's Content onPress, recording the item's value — the
 *             "a press landed" channel for cases where no onChange may
 *             follow (read-only, same-value re-press)
 *   layout    { part: "group" | "radio" | "content", name, x, y, width,
 *             height } — the group root, each item root and each Content row
 *   onFocus / onBlur / groupFocus / groupBlur / groupFocusChange  (reserved;
 *             the focus-within sample reuses radio.fixtures.tsx's
 *             `group-focus` case)
 *
 * The "<name>:selected" markers stand in for aria-checked.
 */

type Option = { value: string; label: string };

const PETS: Option[] = [
  { value: "dogs", label: "Dogs" },
  { value: "cats", label: "Cats" },
  { value: "dragons", label: "Dragons" },
];

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function boolParam(name: string): boolean | undefined {
  const value = host.params[name];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "1" || value === "true" ? true : undefined;
  }

  return undefined;
}

function textParam(name: string): string | undefined {
  const value = host.params[name];

  return typeof value === "string" ? value : undefined;
}

function layoutProbe(part: string, name?: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      part,
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/* -------------------------------------------------------------------------------------------------
 * Building blocks
 * -----------------------------------------------------------------------------------------------*/

type RowProps = {
  option: Option;
  layout?: boolean;
};

function Row(props: RowProps) {
  return (
    <Radio
      aria-label={props.option.label}
      onLayout={props.layout ? layoutProbe("radio", props.option.label) : undefined}
      value={props.option.value}
    >
      <Radio.Content
        testID={`row-${props.option.value}`}
        onLayout={props.layout ? layoutProbe("content", props.option.label) : undefined}
        onPress={() => probe("press")(props.option.value)}
      >
        {({ isSelected }) => (
          <View class="flex-row items-center gap-3">
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Text>{props.option.label}</Text>
            <Text>{`${props.option.label}:${isSelected() ? "selected" : "unselected"}`}</Text>
          </View>
        )}
      </Radio.Content>
    </Radio>
  );
}

type GroupProps = {
  options: Option[];
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  readonly?: boolean;
  gap?: boolean;
  layout?: boolean;
};

// Evaluated at the `<RadioGroup>` children position — see the file header.
function groupBody(props: GroupProps) {
  const nodes: JSX.Element[] = [<Label testID="group-label">Favorite Pet</Label>];

  props.options.forEach((option, index) => {
    if (props.gap && index === 1) {
      // The group's bare surface between items: a plain View, not a component
      // part. It hears no presses, so `app.press("id:group-gap")` fails to
      // resolve — the observable form of "组容器无按压面".
      nodes.push(<View testID="group-gap" class="h-6 w-full" />);
    }

    nodes.push(<Row layout={props.layout} option={option} />);
  });

  return nodes;
}

function groupAttrs(props: GroupProps) {
  return {
    "aria-label": "Favorite Pet",
    defaultValue: props.defaultValue,
    isDisabled: props.disabled,
    isReadOnly: props.readonly,
    onChange: probe("onChange"),
    onLayout: props.layout ? layoutProbe("group") : undefined,
    orientation: props.orientation,
    testID: "group",
  };
}

function PetGroup(props: GroupProps) {
  return <RadioGroup {...groupAttrs(props)}>{groupBody(props)}</RadioGroup>;
}

/* -------------------------------------------------------------------------------------------------
 * Environment scope
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  // Test-harness environment param (only the mobile tests set it —
  // absent keeps the host-derived default): `testInput` injects an outer
  // EnvironmentScope input so the pointer baseline is host-independent
  // (inner `scope` overrides still win).
  const testInput = String(host.params.testInput ?? "");

  const body =
    String(host.params.scope ?? "") === "touch" ? (
      <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
    ) : (
      <>{props.children}</>
    );

  return testInput === "pointer" || testInput === "touch" ? (
    <EnvironmentScope input={testInput}>{body}</EnvironmentScope>
  ) : (
    body
  );
}

function Fixture() {
  return (
    <Scoped>
      <Stage>
        <PetGroup
          defaultValue={textParam("default") ?? "dogs"}
          disabled={boolParam("disabled")}
          gap={boolParam("gap")}
          layout
          options={PETS}
          orientation={
            textParam("orientation") === "horizontal" ? "horizontal" : "vertical"
          }
          readonly={boolParam("readonly")}
        />
      </Stage>
    </Scoped>
  );
}

mount(Fixture);
