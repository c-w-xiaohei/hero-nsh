import { host, mount } from "nsh";
import { Header } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * NSH-only Header fixture (port sheet 4b, T-003).
 *
 * `testID` is not a HeroUI prop, so the case that checks the passthrough
 * channel cannot live in a shared scenario: the reference app would receive an
 * unknown attribute. `host.params.case` picks the case:
 *
 *   attributed  the Header carries testID="section-header"
 *   basic       the same Header with no testID (default)
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function Fixture() {
  const name = String(host.params.case ?? "basic");
  const testID = name === "attributed" ? "section-header" : undefined;

  return (
    <Stage>
      <Header testID={testID}>Actions</Header>
    </Stage>
  );
}

mount(Fixture);
