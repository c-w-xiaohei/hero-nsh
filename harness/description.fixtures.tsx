import { host, mount, signal, Text, View } from "nsh";
import type { Component, JSX } from "nsh";
import { createInput, Description, EnvironmentScope } from "@heroui/react";
import { DescriptionContext } from "../src/components/description/context";
import type { DescriptionContextValue } from "../src/components/description/context";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the description adapt unit (adapt-sheets/description.md
 * §2 A-006, §4 M-001…M-007).
 *
 * `host.params.case` picks the shape:
 *
 *   basic  Three plain `Description`s inside a `w-40` column: a default one
 *          (M-001, M-003, M-004, M-006), one with a caller `className` that
 *          must win over the variant classes (M-002), and a long sentence
 *          that exercises `text-wrap` (M-002). Every root carries an
 *          `onLayout` box probe so the cross-environment comparisons of
 *          M-003/M-004 can read identical bounds. No description carries a
 *          press handler: M-006 presses the text and asserts the probe
 *          channel stays silent — the component owns no press path.
 *   ctx    A handwritten `DescriptionContext.Provider` mirroring the
 *          textfield's own provider (`src/components/textfield/textfield.tsx`
 *          descriptionState): `registerDescription` probes the registered
 *          text once, `partClass` is a reactive getter that returns
 *          `"hidden"` while the `invalid` signal is on (initial value from
 *          `host.params.invalid`, toggled by the `id:toggle-invalid`
 *          press target) — M-005.
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper (same convention
 * as `pressable.fixtures.tsx` / `environment.fixtures.tsx`):
 *
 *   (absent)/""  no scope — the host-derived environment (pointer + default
 *                density on the desktop pin), the M-001/M-002 baseline
 *   "touch"      EnvironmentScope input="touch"            — M-003, M-006
 *   "density"    EnvironmentScope density="compact"        — M-004
 *   "touch,density"  input="touch" density="compact"       — M-004's alt form
 *
 * An `EnvProbe` inside every case reports the resolved `input` as a Text, so
 * M-007 can prove the scope actually wrapped ("input=touch") or did not
 * ("input=pointer").
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... would find
 * no nsh.json and lose the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box: name → x/y/width/height, the M-003/M-004 comparison surface. */
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

/* -------------------------------------------------------------------------------------------------
 * Scope wrapper (A-006): "" = no wrapper, "touch" = input, "density" = compact
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "");
  const tokens = scope.split(",");
  const touch = tokens.includes("touch");
  const pointer = tokens.includes("pointer");
  const density = tokens.includes("density");

  if (!touch && !pointer && !density) {
    return <>{props.children}</>;
  }

  return (
    <EnvironmentScope
      input={touch ? "touch" : pointer ? "pointer" : undefined}
      density={density ? "compact" : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
}

/** Reports the scope-resolved input axis so the test can see the wrapper worked. */
function EnvProbe() {
  const input = createInput();

  return <Text>{`input=${input()}`}</Text>;
}

function Frame(props: { children?: JSX.Element }) {
  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {props.children}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * basic case (M-001…M-004, M-006): default / caller-className / long-token
 * -----------------------------------------------------------------------------------------------*/

function BasicCase() {
  return (
    <View class="w-40 flex-col gap-3">
      <Description testID="desc-basic" onLayout={boxProbe("basic")}>
        Save changes
      </Description>
      <Description
        testID="desc-custom"
        className="font-semibold text-accent"
        onLayout={boxProbe("custom")}
      >
        Custom tone
      </Description>
      <Description testID="desc-long" onLayout={boxProbe("long")}>
        A long description sentence that keeps going until it wraps onto the
        next line inside this narrow column
      </Description>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ctx case (M-005): handwritten provider, registerDescription + reactive partClass
 * -----------------------------------------------------------------------------------------------*/

function CtxCase() {
  const report = probe("register");
  const invalid = signal(String(host.params.invalid ?? "") === "1");

  // The same shape the textfield hands its own Descriptions: registration
  // reports the text once (probe), and `partClass` is a live getter the
  // Description re-reads — "hidden" mirrors `.textfield[data-invalid]
  // [data-slot="description"] { display: none }`.
  const value: DescriptionContextValue = {
    registerDescription: (read) => {
      report(read());

      return () => undefined;
    },
    partClass: () => (invalid() ? "hidden" : undefined),
  };

  return (
    <View class="w-40 flex-col gap-3">
      <DescriptionContext.Provider value={value}>
        <Description testID="desc-ctx" onLayout={boxProbe("ctx")}>
          Registered description
        </Description>
      </DescriptionContext.Provider>
      <View
        testID="toggle-invalid"
        role="button"
        onPress={() => invalid.set(!invalid())}
        class="p-2"
      >
        <Text>toggle</Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  basic: BasicCase,
  ctx: CtxCase,
};

function Fixture() {
  const name = String(host.params.case ?? "basic");
  const Case = cases[name] ?? BasicCase;

  return (
    <Frame>
      <Scoped>
        <EnvProbe />
        <Case />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
