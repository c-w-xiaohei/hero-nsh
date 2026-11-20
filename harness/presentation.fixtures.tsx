import { host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  createPresentation,
  EnvironmentScope,
  type Presentation,
} from "@heroui/react";

/*
 * NSH-only fixture for the create-presentation mechanism unit
 * (adapt-sheets/create-presentation.md §2 A-005, §4 M-001…M-011).
 *
 * `ProbeInner` owns the signals and calls `createPresentation` itself — the
 * factory reads `Environment()` in its owner scope, so the probe must sit
 * under the `EnvironmentScope` `host.params.scope` mounts (same rule as
 * `environment.fixtures.tsx`'s SelectionInner).
 *
 * `host.params.case` picks the shape:
 *
 *   probe       pin=undefined (auto), allowed from `host.params.allowed`
 *   allowed2    same as probe; the case name marks the §4 M-010 rows that
 *               drive the `allowed` param
 *   pin         pin="panel" fixed — pin beats the auto rule (M-009)
 *   pin-toggle  pin starts "panel"; `id:pin-toggle` flips it to "sheet" so a
 *               test can prove the open-time latch covers pin changes (M-009)
 *   illegal-pin pin="sheet" with allowed=["panel"] — pin outside the allowed
 *               set still wins (§1 rule 1, §5: no assertion row)
 *
 * `host.params.allowed` narrows the allowed set for probe/allowed2:
 *   "ps" → ["panel","sheet","fullscreen"]   (Select's three-state domain)
 *   "pf" → ["panel","fullscreen"]          (two-state domain without sheet)
 *   absent → the factory default ["panel","sheet"]
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper:
 *   (absent)       no scope — the host-derived default environment
 *   "touch"        input="touch"; width still follows the host window, so the
 *                  tests exercise the real windowSize → width derivation
 *   "touch-compact" input="touch" width="compact" pinned
 *   "regular"      input="touch" width="regular" pinned (touch tablet)
 *
 * Observable surface: `open=…`, `presentation=…`, `pin=…` Texts plus the
 * `id:toggle` / `id:pin-toggle` press controls. Tests resize the window with
 * `app.setViewport` to prove the latch (M-005…M-008).
 *
 * It sits directly in harness/ for the same reason environment.fixtures.tsx
 * does: NSH takes the entry's own directory as the app root, so an entry
 * under harness/tests/... would find no nsh.json.
 */

/* -------------------------------------------------------------------------------------------------
 * Params → props
 * -----------------------------------------------------------------------------------------------*/

type Pin = Presentation | "auto" | undefined;

/** `host.params.allowed` → the `allowed` accessor, or undefined for the default. */
function allowedAccessor(
  raw: string,
): (() => readonly Presentation[]) | undefined {
  switch (raw) {
    case "ps": {
      const list: readonly Presentation[] = [
        "panel",
        "sheet",
        "fullscreen",
      ];
      return () => list;
    }
    case "pf": {
      const list: readonly Presentation[] = ["panel", "fullscreen"];
      return () => list;
    }
    default:
      return undefined;
  }
}

/* -------------------------------------------------------------------------------------------------
 * Scope wrapper
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "");

  switch (scope) {
    case "touch":
      return <EnvironmentScope input="touch">{props.children}</EnvironmentScope>;
    case "touch-compact":
      return (
        <EnvironmentScope input="touch" width="compact">
          {props.children}
        </EnvironmentScope>
      );
    case "regular":
      return (
        <EnvironmentScope input="touch" width="regular">
          {props.children}
        </EnvironmentScope>
      );
    default:
      return <>{props.children}</>;
  }
}

/* -------------------------------------------------------------------------------------------------
 * Probe
 * -----------------------------------------------------------------------------------------------*/

function ProbeInner() {
  const caseName = String(host.params.case ?? "probe");

  const isOpen = signal(false);
  const pin = signal<Pin>(
    caseName === "pin" || caseName === "pin-toggle"
      ? "panel"
      : caseName === "illegal-pin"
        ? "sheet"
        : undefined,
  );

  const allowed =
    caseName === "illegal-pin"
      ? (): readonly Presentation[] => ["panel"]
      : allowedAccessor(String(host.params.allowed ?? ""));

  // Explicit <Presentation> keeps P wide enough for every case (illegal-pin
  // pairs pin="sheet" with allowed=["panel"], which a narrower P could not
  // express). The factory still applies the pin > auto > panel rule at
  // runtime; the type parameter only bounds the accessor's codomain.
  const presentation = createPresentation<Presentation>({
    pin,
    isOpen,
    ...(allowed === undefined ? {} : { allowed }),
  });

  const toggleOpen = () => isOpen.update((value) => !value);
  const togglePin = () =>
    pin.update((value) => (value === "panel" ? "sheet" : "panel"));

  return (
    <View class="flex-col gap-2">
      <Text>{`open=${isOpen() ? "true" : "false"}`}</Text>
      <Text>{`presentation=${presentation()}`}</Text>
      <Text>{`pin=${pin() ?? "auto"}`}</Text>
      <View
        testID="toggle"
        role="button"
        onPress={toggleOpen}
        class="p-2"
      >
        <Text>toggle</Text>
      </View>
      {caseName === "pin-toggle" ? (
        <View
          testID="pin-toggle"
          role="button"
          onPress={togglePin}
          class="p-2"
        >
          <Text>pin</Text>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Entry
 * -----------------------------------------------------------------------------------------------*/

function Fixture() {
  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      <Scoped>
        <ProbeInner />
      </Scoped>
    </View>
  );
}

mount(Fixture);
