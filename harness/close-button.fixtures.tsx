import { host, mount, Text, View } from "nsh";
import type { Component, JSX, PressEvent } from "nsh";
import { CloseButton, EnvironmentScope } from "@heroui/react";
import type { CloseButtonRenderProps } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only CloseButton fixture (port sheet 4b), not a shared scenario.
 *
 * `host.params.case` picks the shape:
 *
 *   attributed  the original case: a bare `CloseButton` (`testID="close"`,
 *               default `CloseIcon`) whose press, hover and layout callbacks
 *               report through the `events`/`hover`/`layout` probes.
 *   probe       `CloseButton` (`testID="cb-probe"`) with a render-prop child
 *               that spells the render state into text, wired to the same
 *               probes — the assertion surface of adapt sheet §4
 *               (M-001…M-005).
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper ("" = host
 * default, "touch" = `input="touch"`), the same convention
 * `control-field.fixtures.tsx` uses. Other params: `slop`="1" gives the
 * button an explicit `hitSlop={6}` (the Tag remove-button value), and
 * `disabled`="1" sets `isDisabled`.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find
 * no nsh.json and lose the `@heroui/react` alias and the theme.
 */

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

/** The press/hover/layout wiring both cases share — one probe set, verbatim kinds. */
function useProbes() {
  const reportEvent = probe("events");
  const reportHover = probe("hover");
  const reportLayout = probe("layout");

  return {
    onPressDown: (e: PressEvent) => reportEvent("pressDown"),
    onPressStart: (e: PressEvent) => reportEvent("pressStart"),
    onPressChange: (isPressed: boolean) => reportEvent(`pressChange(${isPressed})`),
    onPressUp: (e: PressEvent) => reportEvent("pressUp"),
    onPressEnd: (e: PressEvent) => reportEvent("pressEnd"),
    onPress: (e: PressEvent) => reportEvent("press"),
    onClick: (e: PressEvent) => reportEvent("click"),
    onHoverChange: (isHovered: boolean) => reportHover(`hoverChange(${isHovered})`),
    onLayout: (e: { bounds: { size: { width: number; height: number } } }) =>
      reportLayout({ width: e.bounds.size.width, height: e.bounds.size.height }),
  };
}

function AttributedCase() {
  const probes = useProbes();

  return (
    <View class="p-4">
      <CloseButton testID="close" {...probes} />
    </View>
  );
}

function ProbeCase() {
  const probes = useProbes();
  const slop = String(host.params.slop ?? "") === "1";
  const disabled = String(host.params.disabled ?? "") === "1";

  return (
    <View class="p-4">
      <CloseButton
        testID="cb-probe"
        hitSlop={slop ? 6 : undefined}
        isDisabled={disabled}
        {...probes}
      >
        {(values: CloseButtonRenderProps) => (
          <Text>
            {`dis=${values.isDisabled() ? "1" : "0"},pr=${values.isPressed() ? "1" : "0"},hov=${values.isHovered() ? "1" : "0"},foc=${values.isFocused() ? "1" : "0"},pen=${values.isPending() ? "1" : "0"}`}
          </Text>
        )}
      </CloseButton>
    </View>
  );
}

const cases: Record<string, Component> = {
  attributed: AttributedCase,
  probe: ProbeCase,
};

function Fixture() {
  const name = String(host.params.case ?? "attributed");
  const Case = cases[name] ?? AttributedCase;

  return (
    <Scoped>
      <Case />
    </Scoped>
  );
}

mount(Fixture);
