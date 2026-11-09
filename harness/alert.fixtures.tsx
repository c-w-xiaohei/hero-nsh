import { host, mount, View } from "nsh";
import { Alert } from "@heroui/react";

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

function Fixture() {
  const name = String(host.params.case ?? "basic-structure");

  return name === "no-description" ? <NoDescription /> : <BasicStructure />;
}

mount(Fixture);
