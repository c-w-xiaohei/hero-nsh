import { host, mount, Text, View } from "nsh";
import { EmptyState } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * NSH-only EmptyState fixtures (port sheet 4b, T-003 and X-001).
 *
 * `View` and `accessibilityLabel` are not HeroUI props, so these cases cannot
 * live in a shared scenario: the reference app would receive an unknown
 * element or attribute. `host.params.case` picks the case:
 *
 *   inherited   an EmptyState and a plain Text under class="text-lg"; the
 *               plain child inherits 18, so a 14 on the EmptyState text can
 *               only come from the block's own text-sm (R-002), not from the
 *               harness default
 *   aria-label  aria-label on the root next to a different caller
 *               accessibilityLabel; the aria name must win, as in Skeleton
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

function InheritedCase() {
  return (
    <Stage>
      <View class="text-lg">
        <EmptyState />
        <Text>plain</Text>
      </View>
    </Stage>
  );
}

function AriaLabelCase() {
  return (
    <Stage>
      <EmptyState accessibilityLabel="Fallback name" aria-label="No search results">
        Nothing here
      </EmptyState>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "inherited");

  if (name === "aria-label") return <AriaLabelCase />;

  return <InheritedCase />;
}

mount(Fixture);
