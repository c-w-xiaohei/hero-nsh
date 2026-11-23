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
 *   nav       Three links side by side — absolute URL, relative path and
 *             `#anchor` — each reporting `press`/`click` through the shared
 *             `nav` probe, so M-005 covers both environments in two opens
 *             instead of six.
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
 *   onClick    the caller's click alias, same payload (M-001, M-005).
 *   onHover    start/end flags — the hover roundtrip the `pointer` cell keeps.
 *   nav        the `nav` case's per-link `press`/`click` reports, args
 *              `[testID, event]` (M-005).
 */

type Scope = "" | "touch" | "pointer";

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "") as Scope;

  return scope === "touch" || scope === "pointer" ? (
    <EnvironmentScope input={scope}>{props.children}</EnvironmentScope>
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
  const reportClick = probe("onClick");
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
      onClick={(e) =>
        reportClick({ x: e.position.x, y: e.position.y })}
      onHoverStart={() => reportHover("start")}
      onHoverEnd={() => reportHover("end")}
    >
      {name === "disabled" ? "Disabled link" : "Link label"}
      <SeamProbe />
    </Link>
  );
}

/**
 * The three navigation shapes in one mount: an absolute URL reaches `openUrl`,
 * a relative path and a `#anchor` only fire the press/click callbacks (M-005).
 * Each link reports `[testID, "press"|"click"]` through the shared `nav` probe.
 */
function NavCase() {
  const reportNav = probe("nav");

  const navLink = (id: string, href: string, label: string) => (
    <Link
      testID={id}
      href={href}
      onPress={() => reportNav(id, "press")}
      onClick={() => reportNav(id, "click")}
    >
      {label}
    </Link>
  );

  return (
    <View class="flex-col gap-2">
      {navLink("link-nav-abs", "https://example.com/nav", "Absolute")}
      {navLink("link-nav-rel", "./nav-docs", "Relative")}
      {navLink("link-nav-anchor", "#nav-section", "Anchor")}
    </View>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");

  return (
    <Frame>
      <Scoped>{name === "nav" ? <NavCase /> : <LinkCase />}</Scoped>
    </Frame>
  );
}

mount(Fixture);
