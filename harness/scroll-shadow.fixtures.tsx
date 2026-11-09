import { mount, Text, View } from "nsh";
import { createScrollShadow } from "@heroui/react";

/*
 * NSH-only ScrollShadow fixture (X-005), not a shared scenario.
 *
 * `nsh/test` cannot read a view's `maskImage` (only character styles), and the
 * one thing X-005 has to prove is the mask the root carries on its very first
 * paint, before any layout event has delivered a size. So this entry drives the
 * same state machine the component drives — `createScrollShadow` is the port's
 * public primitive (src/primitives/index.ts, re-exported by the package) — with
 * no host handlers attached, and prints its mask accessor into a Text. At mount
 * the geometry snapshot is still `{0,0}`, which is exactly the pre-measurement
 * frame the component paints.
 *
 * Two instances: `auto` (detection on, the default) and `controlled`
 * (`visibility="both"`, which upstream still draws while detection is off). Both
 * are accepted by the finding: `maskImage` must be absent or percentage-based
 * until a viewport extent arrives, because a point-based gradient at length 0
 * masks the whole root out.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 */

function MaskProbe(props: { name: string; visibility: "auto" | "both" }) {
  const shadow = createScrollShadow({
    orientation: () => "vertical",
    offset: () => 0,
    size: () => 40,
    visibility: () => props.visibility,
    isEnabled: () => true,
  });

  // Read once, in the body: the readout is the mount value, not a later one.
  const mask = shadow.maskImage() ?? "none";

  return <Text>{`mask:${props.name}:${mask}`}</Text>;
}

function Fixture() {
  return (
    <View class="flex-col gap-1 p-6">
      <MaskProbe name="auto" visibility="auto" />
      <MaskProbe name="controlled" visibility="both" />
    </View>
  );
}

mount(Fixture);
