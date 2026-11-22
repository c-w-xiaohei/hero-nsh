import { host, mount } from "nsh";
import type { JSX } from "nsh";
import { EnvironmentScope, Header } from "@heroui/react";
import { probe } from "@scenario/probe";
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
 * `host.params.input` / `host.params.density` feed `EnvironmentScope` the way
 * breadcrumbs.fixtures does (adapt-sheets/header.md A-005); an absent param
 * keeps the host-derived value, so a case opened without them is the
 * desktop-parity baseline. The root Text reports its laid-out box through
 * `onLayout` so the M-002/M-003/M-005 rows can diff environments bounds for
 * bounds — Header realizes no `input`/`density` cell, so the sets must match.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layoutProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function ScopedMobile(props: { children?: JSX.Element }) {
  const input = String(host.params.input ?? "");
  const density = String(host.params.density ?? "");

  return (
    <EnvironmentScope
      input={input === "touch" || input === "pointer" ? input : undefined}
      density={density === "compact" || density === "default" ? density : undefined}
    >
      {props.children}
    </EnvironmentScope>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "basic");
  const testID = name === "attributed" ? "section-header" : undefined;

  return (
    <Stage>
      <ScopedMobile>
        <Header testID={testID} onLayout={layoutProbe("header")}>
          Actions
        </Header>
      </ScopedMobile>
    </Stage>
  );
}

mount(Fixture);
