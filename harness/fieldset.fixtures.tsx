import { host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Button, EnvironmentScope, Fieldset } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Fieldset fixture (port sheet 4b, T-003 and regression X-001).
 *
 * The upstream case passes an arbitrary `data-foo` and reads it back; NSH has
 * no data-* channel (D18), so the equivalent channel is `testID` and this
 * fixture is the only place it can live: HeroUI 3.2.7 does not accept
 * `testID`, so the case cannot be a shared scenario.
 *
 * It sits next to harness/nsh.json on purpose. NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json: the `@heroui/react` alias does not resolve and the theme is lost.
 *
 * host.params.case picks the shape:
 * - `attributed`: upstream's own case, a bare string child plus `testID`.
 * - `children`: the child shapes HeroUI accepts (`ReactNode`), a bare string,
 *   a number and an array of strings, kept separate so each is visible.
 * - `mobile`: the adapt sheet's measurement tree (§4 M-001…M-006) — a
 *   Root+Legend+Group(two members)+Actions fieldset whose blocks report
 *   their bounds through `onLayout`, mounted under an `EnvironmentScope`
 *   fed by `host.params.input` / `host.params.density`.
 * - `mobile-disabled`: the same tree with `disabled` on, plus an
 *   always-enabled `toggle-disabled` Button outside the Root that clears
 *   it — the context-propagation and restore halves of M-002/M-005.
 */

function AttributedCase() {
  return (
    <Stage>
      <Fieldset testID="fieldset">Content</Fieldset>
    </Stage>
  );
}

function ChildrenCase() {
  return (
    <Stage>
      <Fieldset testID="fieldset-children">
        {"Bare string"}
        {42}
        {["First", "Second"]}
      </Fieldset>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile-environment cases (adapt-sheets/fieldset.md §4 M-001…M-006)
 * -----------------------------------------------------------------------------------------------*/

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box for every measured block. */
function boxProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/**
 * The tree the mobile assertions drive: a Legend over a two-member Group and
 * an Actions row, so every spacing literal the density axis owns is
 * measurable — legend→group, member→member, group→actions, action→action
 * and the actions' top padding (a filler View's y inside the slot).
 *
 * `member-two` is a real Button — the `FieldsetContext` consumer (OR merge,
 * sheet A-008) M-002/M-005 read `enabled` and the press refusal from. Its
 * own `input` adaptation (a taller touch row) is the button unit's claim,
 * so M-003 compares fieldset-owned spacing around it rather than its box.
 * Everything else is a plain View/Text block. `disabled` starts from the
 * case name; the `toggle-disabled` Button outside the Root clears it, which
 * is the "撤销 disabled 后恢复" half of M-002 on the same tree. The bare
 * `{"Root note"}` string is the root's `renderChildren` path M-001 reads.
 */
function MobileCase(props: { disabled?: boolean }) {
  const disabled = signal(props.disabled === true);

  return (
    <View class="p-6">
      <Fieldset
        disabled={disabled()}
        testID="fieldset-root"
        role="group"
        aria-label="Mobile fieldset"
        onLayout={boxProbe("root")}
      >
        <Fieldset.Legend testID="legend" onLayout={boxProbe("legend")}>
          Settings
        </Fieldset.Legend>
        <Fieldset.Group testID="group" onLayout={boxProbe("group")}>
          <View
            class="px-2 py-1 bg-default"
            testID="member-one"
            onLayout={boxProbe("member-one")}
          >
            <Text>Username</Text>
          </View>
          <Button
            testID="member-two"
            onPress={probe("member-press")}
            onLayout={boxProbe("member-two")}
          >
            Password
          </Button>
        </Fieldset.Group>
        <Fieldset.Actions testID="actions" onLayout={boxProbe("actions")}>
          <View
            class="h-full"
            testID="actions-filler"
            onLayout={boxProbe("actions-filler")}
          />
          <View
            class="px-2 py-1 bg-default"
            testID="action-apply"
            onLayout={boxProbe("action-apply")}
          >
            <Text>Apply</Text>
          </View>
          <View
            class="px-2 py-1 bg-default"
            testID="action-cancel"
            onLayout={boxProbe("action-cancel")}
          >
            <Text>Cancel</Text>
          </View>
        </Fieldset.Actions>
        {"Root note"}
      </Fieldset>
      <Button testID="toggle-disabled" onPress={() => disabled.set(false)}>
        EnableAll
      </Button>
    </View>
  );
}

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline.
 */
function ScopedMobile(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "attributed");

  if (name === "children") return <ChildrenCase />;

  if (name === "mobile" || name === "mobile-disabled") {
    return (
      <ScopedMobile>
        <MobileCase disabled={name === "mobile-disabled"} />
      </ScopedMobile>
    );
  }

  return <AttributedCase />;
}

mount(Fixture);
