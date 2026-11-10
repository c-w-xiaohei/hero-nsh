import { host, mount, View } from "nsh";
import { Button, Tooltip } from "@heroui/react";
import { probe } from "./probe";

/*
 * NSH-only fixture for the Tooltip unit (port sheet 4b, T-003 / T-006 / T-008).
 *
 * The shared scenarios cannot reach these cases: T-003 needs a `closeDelay`
 * timer observed on a manual clock and the `onOpenChange` values it reports,
 * and T-006 / T-008 need a tooltip that is open without a pointer or a focused
 * trigger. `host.params.case` picks the state:
 *
 *   close-delay  delay 0, closeDelay 300, uncontrolled, with an `away` Button
 *                to move the pointer off the trigger (the default);
 *   default-open `defaultOpen`, so Escape is the only thing that closes it.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function Fixture() {
  const name = String(host.params.case ?? "close-delay");

  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {name === "close-delay" ? (
        <Tooltip delay={0} closeDelay={300} onOpenChange={probe("openChange")}>
          <Button>Hover me</Button>
          <Tooltip.Content>Closable tip</Tooltip.Content>
        </Tooltip>
      ) : (
        <Tooltip defaultOpen delay={0}>
          <Button>Hover me</Button>
          <Tooltip.Content>Hover tip</Tooltip.Content>
        </Tooltip>
      )}
      <Button testID="away">Elsewhere</Button>
    </View>
  );
}

mount(Fixture);
