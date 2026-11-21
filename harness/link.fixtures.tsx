import { effect, host, mount, View } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, Link, LinkContext } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the Link mobile adaptation unit
 * (adapt-sheets/link.md §2 A-001…A-004, §4 M-001…M-006).
 *
 * `host.params.case` picks the link shape:
 *
 *   basic     Absolute-URL link ("https://example.com"), under 44 pt tall —
 *             press completes `onPress`/`onClick` and hands the URL to the
 *             host (`app.openedUrls()`); its small box makes the touch
 *             `hitSlop` expansion non-zero (M-002).
 *   relative  `href="./docs"`: a relative path fires the handlers and never
 *             reaches `openUrl` (M-005).
 *   anchor    `href="#section"`: same rule as `relative`.
 *   disabled  `isDisabled`: press and hover are refused, `enabled()` false,
 *             and the feedback seam's `hitSlop` stays undefined even under
 *             touch (M-002's `enabled=false` half).
 *
 * `host.params.scope` picks the environment ("" = host default, "touch" =
 * `EnvironmentScope input="touch"`), same convention as
 * `pressable.fixtures.tsx`.
 *
 * Probes (`app.storage()`, PROBE_KEY):
 *
 *   hitSlop    the seam accessor published on `LinkContext` — a view prop has
 *              no read-back, so a child inside the link reports it on every
 *              change (`undefined` → null). Asserts A-003's computed expansion
 *              and its absence under pointer / disabled.
 *   onPress    the caller's press handler, recording `e.position` so the
 *              press that lands still carries a real payload (M-001).
 *   onHover    start/end flags — the hover roundtrip the `pointer` cell keeps.
 */

type Scope = "" | "touch";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" ? (
    <EnvironmentScope input="touch">{props.children}</EnvironmentScope>
  ) : (
    <>{props.children}</>
  );
}

function Frame(props: { children?: JSX.Element }) {
  return (
    <View class="flex-1 items-start gap-4 bg-background p-6">
      {props.children}
    </View>
  );
}

/** Reads `LinkContext` from inside the link and reports the seam channels. */
function SeamProbe() {
  const ctx = LinkContext();
  const report = probe("hitSlop");

  effect(() => {
    report(ctx?.hitSlop() ?? null);
  });

  return null;
}

function LinkCase() {
  const name = String(host.params.case ?? "basic");
  const reportPress = probe("onPress");
  const reportHover = probe("onHover");

  const href = {
    basic: "https://example.com",
    relative: "./docs",
    anchor: "#section",
    disabled: "https://example.com/disabled",
  }[name];

  return (
    <Link
      testID="link-under-test"
      href={href}
      isDisabled={name === "disabled"}
      onPress={(e) =>
        reportPress({ x: e.position.x, y: e.position.y })}
      onHoverStart={() => reportHover("start")}
      onHoverEnd={() => reportHover("end")}
    >
      {name === "disabled" ? "Disabled link" : "Link label"}
      <SeamProbe />
    </Link>
  );
}

function Fixture() {
  return (
    <Frame>
      <Scoped>
        <LinkCase />
      </Scoped>
    </Frame>
  );
}

mount(Fixture);
