import { host, mount, signal, Text, View } from "nsh";
import { Button, Popover } from "@heroui/react";

/*
 * NSH-only fixture for the Popover unit (port sheet 4b, T-017 / T-018).
 *
 * These cases drive `isOpen`, `isExiting` and `shouldSkipAnimation` from
 * outside a single render, which a shared scenario cannot do: a scenario is
 * static JSX and reads no host events. `host.params.case` picks the state and
 * `popover.close` / `popover.reopen` move it while the app runs.
 *
 *   retained       isExiting is forced once closed, so the content must stay
 *                  mounted and keep its own state;
 *   skip           shouldSkipAnimation is true: closing unmounts at once;
 *   override-false shouldSkipAnimation is explicitly false: closing still
 *                  runs the exit hold;
 *   auto           uncontrolled (defaultOpen): Escape closes it on its own, so
 *                  the exit hold can be observed without a host event.
 *
 * The counter is a component of its own so that its signal lives only while
 * the content subtree is mounted: if closing and reopening rebuild that
 * subtree, the count drops back to 0.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app's root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function RetainedCounter() {
  const count = signal(0);

  return (
    <Button testID="counter" onPress={() => count.update((value) => value + 1)}>
      {`Count ${count()}`}
    </Button>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "retained");
  const automatic = name === "auto";
  const open = signal(true);
  const exiting = signal(false);
  const skip = name === "skip" ? true : name === "override-false" ? false : undefined;

  host.on("popover.close", () => {
    if (name === "retained") {
      exiting.set(true);
    }
    open.set(false);
  });
  host.on("popover.reopen", () => {
    open.set(true);
    exiting.set(false);
  });

  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      <Popover isOpen={automatic ? undefined : open()} defaultOpen={automatic}>
        <Button>Open popover</Button>
        <Popover.Content isExiting={exiting()} shouldSkipAnimation={skip}>
          <Popover.Dialog>
            <Text>Retained content</Text>
            <RetainedCounter />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </View>
  );
}

mount(Fixture);
