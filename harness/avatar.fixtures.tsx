import { host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Avatar, AvatarGroup } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only Avatar / AvatarGroup fixture (port sheet 4b), not a shared scenario.
 *
 * HeroUI's group cases assert BEM modifier classes (`avatar-group--clip`,
 * `avatar-group--ring`, `avatar-group--grid`) and the child Avatar's `avatar--sm`
 * class. NSH does not project class names (D18) and `nsh test` cannot read them,
 * so this fixture renders the same JSX and records each Avatar root's onLayout
 * box. The tests then read the visible contract those classes carry:
 *
 *   geometry-overlap  default clip group, two md avatars: second.x - first.x = 32
 *   geometry-ring     overlap="ring": the same 8pt overlap, second.x - first.x = 32
 *   geometry-grid     isGrid: gap-3 instead of overlap, second.x - first.x = 52
 *   geometry-sizes    group size sm / md / lg: avatar widths 32 / 40 / 48
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

type Entry = "geometry-overlap" | "geometry-ring" | "geometry-grid" | "geometry-sizes";

type LayoutName = "first" | "second" | "sm" | "md" | "lg";

function layoutProbe(name: LayoutName) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function Pair(props: { overlap?: "clip" | "ring"; isGrid?: boolean }) {
  return (
    <View class="flex-col items-start p-6">
      <AvatarGroup isGrid={props.isGrid} overlap={props.overlap}>
        <Avatar onLayout={layoutProbe("first")} testID="first">
          <Avatar.Fallback>A</Avatar.Fallback>
        </Avatar>
        <Avatar onLayout={layoutProbe("second")} testID="second">
          <Avatar.Fallback>B</Avatar.Fallback>
        </Avatar>
      </AvatarGroup>
    </View>
  );
}

function Sizes() {
  return (
    <View class="flex-col items-start gap-4 p-6">
      <AvatarGroup size="sm">
        <Avatar onLayout={layoutProbe("sm")} testID="sm">
          <Avatar.Fallback>S</Avatar.Fallback>
        </Avatar>
      </AvatarGroup>
      <AvatarGroup size="md">
        <Avatar onLayout={layoutProbe("md")} testID="md">
          <Avatar.Fallback>M</Avatar.Fallback>
        </Avatar>
      </AvatarGroup>
      <AvatarGroup size="lg">
        <Avatar onLayout={layoutProbe("lg")} testID="lg">
          <Avatar.Fallback>L</Avatar.Fallback>
        </Avatar>
      </AvatarGroup>
    </View>
  );
}

const entries: Record<Entry, () => JSX.Element> = {
  "geometry-overlap": () => <Pair />,
  "geometry-ring": () => <Pair overlap="ring" />,
  "geometry-grid": () => <Pair isGrid />,
  "geometry-sizes": Sizes,
};

function Fixture() {
  const name = String(host.params.fixture ?? "");
  const Entry = entries[name as Entry];

  if (!Entry) return <Text>{`unknown fixture: ${name}`}</Text>;

  return <Entry />;
}

mount(Fixture);
