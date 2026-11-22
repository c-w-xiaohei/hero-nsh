import { host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, Label } from "@heroui/react";
import { probe } from "@scenario/probe";
import { FieldContext } from "../src/components/label/context";
import type { FieldState } from "../src/components/label/context";

/*
 * NSH-only fixture for the Label mobile adaptation unit
 * (adapt-sheets/label.md §2 A-007, §4 M-001…M-009), not a shared scenario.
 *
 * `host.params.case` picks the tree:
 *
 *   basic    A bare Label ("Mobile label") with an `onLayout` probe — the
 *            rendering baseline M-001/M-004/M-005 compare across environments.
 *   states   Three Labels — `isRequired` / `isDisabled` / `isInvalid` — each
 *            with its own `onLayout` probe, for the appearance-state rows.
 *   field    A Label inside a hand-written `FieldContext.Provider` (the
 *            field-error fixture precedent: the field root belongs to another
 *            unit). `registerLabel` / `focusField` / `pressFieldStart` /
 *            `pressFieldUp` all report into `app.storage()` probes; the
 *            provider's `isRequired`/`isDisabled`/`isInvalid` getters read
 *            `host.params.fieldRequired` / `fieldDisabled` / `fieldInvalid`
 *            ("1" enables, M-008). A pressable `Text` with
 *            `testID="field-target"` stands in for the field's control: its
 *            press reports through the same FieldState methods, so M-006 can
 *            assert the channel's order is identical no matter which pressable
 *            reports it — the "shared B" half of the action line.
 *   no-field A bare Label with caller `onPress*`/`onFocus`/`onBlur` probes and
 *            a `focusable` sibling View, for the context-free press path and
 *            the `focusable ?? false` contract (M-007).
 *   all      Every case tree mounted together in one scope — the M-009
 *            delivery sweep's aggregate form, so the web target pays three
 *            `open()` calls (one per scope) instead of twelve. Only landmark
 *            `shows` assertions read it; the per-case probes it also fires
 *            are ignored there.
 *
 * `host.params.scope` picks the environment ("" = host default, "touch" =
 * `EnvironmentScope input="touch"`, "density" = `EnvironmentScope
 * density="compact"`), the link/close-button fixtures' convention.
 *
 * Probes (`app.storage()`, PROBE_KEY):
 *
 *   layout         `[tag, bounds]` per `onLayout` firing — the bounds half of
 *                  the cross-environment comparisons.
 *   registerLabel  the text the provider's `registerLabel` getter resolved,
 *                  recorded once at registration (M-003, M-008).
 *   pressFieldStart / pressFieldUp / focusField
 *                  the FieldContext channel the Label forwards its press
 *                  through, in firing order (M-003, M-006).
 *   pressDown / pressUp / press
 *                  the caller-side press triple on the field Label (M-003).
 *   targetDown / targetUp / targetPress
 *                  the stand-in control's own caller triple (M-006).
 *   pressDown / pressUp / press / focus / blur / sibFocus / sibBlur
 *                  the no-field case's caller probes (M-007).
 */

type Scope = "" | "touch" | "density";

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  if (scope === "touch") {
    return <EnvironmentScope input="touch">{props.children}</EnvironmentScope>;
  }

  if (scope === "density") {
    return (
      <EnvironmentScope density="compact">{props.children}</EnvironmentScope>
    );
  }

  return <>{props.children}</>;
}

function Frame(props: { children?: JSX.Element }) {
  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {props.children}
    </View>
  );
}

/** Records `[tag, bounds]` per `onLayout` firing under the shared "layout" name. */
function layoutProbe(tag: string) {
  const report = probe("layout");

  return (event: LayoutEvent) => {
    report(tag, {
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
  };
}

function BasicCase() {
  return (
    <Label testID="label-basic" onLayout={layoutProbe("basic")}>
      Mobile label
    </Label>
  );
}

function StatesCase() {
  return (
    <View class="flex-col gap-2">
      <Label
        testID="label-required"
        isRequired
        onLayout={layoutProbe("required")}
      >
        Required name
      </Label>
      <Label
        testID="label-disabled"
        isDisabled
        onLayout={layoutProbe("disabled")}
      >
        Disabled name
      </Label>
      <Label
        testID="label-invalid"
        isInvalid
        onLayout={layoutProbe("invalid")}
      >
        Invalid name
      </Label>
    </View>
  );
}

function FieldCase() {
  const flag = (key: string) => String(host.params[key] ?? "") === "1";

  const reportRegister = probe("registerLabel");
  const reportFocus = probe("focusField");
  const reportStart = probe("pressFieldStart");
  const reportUp = probe("pressFieldUp");
  const reportDown = probe("pressDown");
  const reportPressUp = probe("pressUp");
  const reportPress = probe("press");
  const reportTargetDown = probe("targetDown");
  const reportTargetUp = probe("targetUp");
  const reportTargetPress = probe("targetPress");

  const field: FieldState = {
    isRequired: () => flag("fieldRequired"),
    isDisabled: () => flag("fieldDisabled"),
    isInvalid: () => flag("fieldInvalid"),
    registerLabel: (text) => {
      reportRegister(text());
      return () => {};
    },
    focusField: () => reportFocus(),
    pressFieldStart: () => reportStart(),
    pressFieldUp: () => reportUp(),
  };

  return (
    <FieldContext.Provider value={field}>
      <View class="flex-col gap-2">
        <Label
          testID="field-label"
          onLayout={layoutProbe("field-label")}
          onPressDown={() => reportDown()}
          onPressUp={() => reportPressUp()}
          onPress={() => reportPress()}
        >
          Field label
        </Label>
        {/*
         * The control stand-in: its press reports through the same
         * FieldState channel the Label forwards to, so the probe order a
         * press produces is identical whichever pressable reports it.
         */}
        <Text
          testID="field-target"
          onLayout={layoutProbe("field-target")}
          onPressDown={(event) => {
            reportTargetDown();
            field.pressFieldStart?.(event);
          }}
          onPressUp={(event) => {
            reportTargetUp();
            field.pressFieldUp?.(event);
          }}
          onPress={(event) => {
            reportTargetPress();
            field.focusField?.(event);
          }}
        >
          Field control
        </Text>
      </View>
    </FieldContext.Provider>
  );
}

function NoFieldCase() {
  const reportDown = probe("pressDown");
  const reportPressUp = probe("pressUp");
  const reportPress = probe("press");
  const reportFocus = probe("focus");
  const reportBlur = probe("blur");
  const reportSibFocus = probe("sibFocus");
  const reportSibBlur = probe("sibBlur");

  return (
    <View class="flex-col gap-2">
      <Label
        testID="plain-label"
        onLayout={layoutProbe("plain")}
        onPressDown={() => reportDown()}
        onPressUp={() => reportPressUp()}
        onPress={() => reportPress()}
        onFocus={() => reportFocus()}
        onBlur={() => reportBlur()}
      >
        Plain label
      </Label>
      {/*
       * The only Tab stop in this case: with the Label's `focusable ?? false`
       * contract intact, Tab lands here and never on the Label.
       */}
      <View
        testID="focus-sibling"
        focusable
        class="p-2"
        onFocus={() => reportSibFocus()}
        onBlur={() => reportSibBlur()}
      >
        <Text>Focusable sibling</Text>
      </View>
    </View>
  );
}

/** All four case trees under one scope — M-009's aggregate mount check. */
function AllCases() {
  return (
    <View class="flex-col gap-4">
      <BasicCase />
      <StatesCase />
      <FieldCase />
      <NoFieldCase />
    </View>
  );
}

const cases: Record<string, () => JSX.Element> = {
  basic: BasicCase,
  states: StatesCase,
  field: FieldCase,
  "no-field": NoFieldCase,
  all: AllCases,
};

function Fixture() {
  const name = String(host.params.case ?? "basic");
  const Case = cases[name];

  if (Case === undefined) {
    return <Text>{`unknown case: ${name}`}</Text>;
  }

  return (
    <Frame>
      <Scoped>
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
