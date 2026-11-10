import { host, mount, View } from "nsh";
import { Card } from "@heroui/react";

/*
 * NSH-only Card fixture (port sheet 4b, T-002 and T-005), not a shared
 * scenario: the upstream cases assert `data-slot` on the root and on each
 * sub-part, which D18 drops, so this fixture puts `testID` on the parts that
 * carried a slot and the tests read those instead.
 *
 * host.params.case picks the shape:
 *   basic      the upstream T-002 JSX with `testID="card"` on the root
 *   structure  the upstream T-005 JSX with a test id on every part
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function Basic() {
  return (
    <View class="p-4">
      <Card testID="card">Body</Card>
    </View>
  );
}

function Structure() {
  return (
    <View class="p-4">
      <Card testID="card">
        <Card.Header testID="card-header">
          <Card.Title testID="card-title">Slot title</Card.Title>
          <Card.Description testID="card-description">Slot description</Card.Description>
        </Card.Header>
        <Card.Content testID="card-content">Slot content</Card.Content>
        <Card.Footer testID="card-footer">Slot footer</Card.Footer>
      </Card>
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");

  return name === "structure" ? <Structure /> : <Basic />;
}

mount(Fixture);
