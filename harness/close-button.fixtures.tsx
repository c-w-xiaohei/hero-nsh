import { host, mount, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import { CloseButton, EnvironmentScope } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only CloseButton fixture (port sheet 4b), not a shared scenario.
 *
 * `attributed` renders a CloseButton with `testID="close"`, which is how this
 * host identifies a view for a test (D18: `data-testid` is not projected).
 * `testID` is not a HeroUI prop, so the case cannot live in a shared scenario
 * the reference package renders too.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 *
 * Mobile layer (adapt-sheets/close-button.md §4 M-001…M-006):
 *
 *   events    A CloseButton (`testID="cb-probe"`) wired to the press/hover/
 *             layout probes under their own names, so `calls(app)` keeps the
 *             verbatim firing order. Params: `scope` ("touch" wraps the case
 *             in `EnvironmentScope input="touch"`), `slop` (explicit
 *             `hitSlop`, M-002), `pending` ("1" → `isPending`, M-006).
 *   disabled  Same probes on an `isDisabled` button whose render-prop child
 *             prints the disabled state (M-003). Params: `scope`.
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

/** The probe set M-001…M-006 read: press sequence, hover pair, layout bounds. */
function pressProbes() {
  return {
    onPressDown: probe("pressDown"),
    onPressStart: probe("pressStart"),
    onPressChange: probe("pressChange"),
    onPressUp: probe("pressUp"),
    onPressEnd: probe("pressEnd"),
    onPress: probe("press"),
    onClick: probe("click"),
    onHoverStart: probe("onHoverStart"),
    onHoverEnd: probe("onHoverEnd"),
    onHoverChange: probe("onHoverChange"),
    onLayout: probe("layout"),
  };
}

function AttributedCase() {
  return (
    <View class="p-4">
      <CloseButton testID="close" />
    </View>
  );
}

function EventsCase() {
  const slop = String(host.params.slop ?? "");
  const pending = String(host.params.pending ?? "") === "1";

  return (
    <View class="p-4">
      <CloseButton
        testID="cb-probe"
        aria-label="Probe close"
        hitSlop={slop === "" ? undefined : Number(slop)}
        isPending={pending}
        {...pressProbes()}
      />
      <View testID="hover-away" class="p-4">
        <Text>away</Text>
      </View>
    </View>
  );
}

function DisabledCase() {
  return (
    <View class="p-4">
      <CloseButton
        testID="cb-probe"
        aria-label="Disabled close"
        isDisabled
        {...pressProbes()}
      >
        {(values) => (
          <Text>{values.isDisabled() ? "Disabled close" : "Enabled close"}</Text>
        )}
      </CloseButton>
    </View>
  );
}

const cases: Record<string, Component> = {
  attributed: AttributedCase,
  events: EventsCase,
  disabled: DisabledCase,
};

function Fixture() {
  const name = String(host.params.case ?? "attributed");
  const Case = cases[name];

  if (Case === undefined) {
    return <Text>{`unknown case: ${name}`}</Text>;
  }

  return (
    <Scoped>
      <Case />
    </Scoped>
  );
}

mount(Fixture);
