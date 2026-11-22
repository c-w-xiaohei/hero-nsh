import { host, mount, View } from "nsh";
import type { JSX } from "nsh";
import { Alert, EnvironmentScope } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Alert fixture (port sheet 4b, T-001 and T-006), not a shared
 * scenario: the upstream cases assert `data-slot` attributes, which D18 drops,
 * so this fixture puts `testID` on the parts that carried a slot and the tests
 * count those instead.
 *
 * host.params.case picks the shape:
 *   basic-structure  the upstream T-001 JSX with a test id on every part
 *   no-description   the upstream T-006 JSX without an Alert.Description
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function BasicStructure() {
  return (
    <View class="p-4">
      <Alert testID="alert-root">
        <Alert.Indicator testID="alert-indicator" />
        <Alert.Content testID="alert-content">
          <Alert.Title testID="alert-title">New features available</Alert.Title>
          <Alert.Description testID="alert-description">
            Check out our latest updates.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    </View>
  );
}

function NoDescription() {
  return (
    <View class="p-4">
      <Alert status="success" testID="alert-root">
        <Alert.Indicator testID="alert-indicator" />
        <Alert.Content testID="alert-content">
          <Alert.Title testID="alert-title">Profile updated successfully</Alert.Title>
        </Alert.Content>
      </Alert>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile-environment case (adapt-sheets/alert.md §4 M-001…M-004)
 * -----------------------------------------------------------------------------------------------*/

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box on the probe channel, one call per onLayout firing. */
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
 * The row the mobile assertions drive: the same five parts as
 * `basic-structure`, each with `onLayout` reporting its box so the density
 * and input checks can read the gap, padding and height off `app.storage()`.
 * `status="warning"` gives M-002/M-004 a non-default `spanStyle` to compare.
 * No `onPress` is installed anywhere: Alert has no interaction surface, and
 * M-004 asserts a press under touch records no new probe calls.
 */
function MobileCase() {
  return (
    <View class="p-4">
      <Alert status="warning" testID="alert-root" onLayout={boxProbe("root")}>
        <Alert.Indicator testID="alert-indicator" onLayout={boxProbe("indicator")} />
        <Alert.Content testID="alert-content" onLayout={boxProbe("content")}>
          <Alert.Title testID="alert-title">Update available</Alert.Title>
          <Alert.Description testID="alert-description">
            A new version is ready to install.
          </Alert.Description>
        </Alert.Content>
      </Alert>
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
  const name = String(host.params.case ?? "basic-structure");

  if (name === "mobile") {
    return (
      <ScopedMobile>
        <MobileCase />
      </ScopedMobile>
    );
  }

  return name === "no-description" ? <NoDescription /> : <BasicStructure />;
}

mount(Fixture);
