import { host, mount, Text, View } from "nsh";
import { CloseButton } from "@heroui/react";

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
 */

function Fixture() {
  const name = String(host.params.case ?? "attributed");

  if (name !== "attributed") {
    return <Text>{`unknown case: ${name}`}</Text>;
  }

  return (
    <View class="p-4">
      <CloseButton testID="close" />
    </View>
  );
}

mount(Fixture);
