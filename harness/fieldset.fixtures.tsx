import { host, mount, Text } from "nsh";
import { Fieldset } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * NSH-only Fieldset fixture (port sheet 4b, T-003).
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
 * host.params.case picks the shape; `attributed` is the only case.
 */

function AttributedCase() {
  return (
    <Stage>
      <Fieldset testID="fieldset">
        <Text>Content</Text>
      </Fieldset>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "attributed");

  if (name === "attributed") return <AttributedCase />;

  return <AttributedCase />;
}

mount(Fixture);
