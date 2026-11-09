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
 *   geometry-grid     isGrid vs. clip in a 224pt row of five md avatars: the grid
 *                     group wraps (fifth at y = first + 52, x = first), the clip
 *                     group keeps one row (fifth at y = first)
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

type LayoutName =
  | "first"
  | "second"
  | "sm"
  | "md"
  | "lg"
  | "grid-first"
  | "grid-second"
  | "grid-fifth"
  | "clip-first"
  | "clip-fifth";

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

/*
 * Five md avatars (40pt) in a 224pt group. HeroUI's grid group is
 * `flex-wrap gap-3`, so 4 * 40 + 3 * 12 = 196 fits and the fifth avatar starts
 * the next row at y = 40 + 12 = 52, back at x = 0. The same five avatars
 * without `isGrid` overlap by 8pt (5 * 32 = 160) and stay on one row; that is
 * the one observable the `avatar-group--grid` class alone cannot show.
 *
 * The 224pt width is an inline style rather than `w-56`: the group's base
 * `w-fit` wins over the appended width utility (measured group width 248 with
 * `class="w-56"`), and this fixture only needs a bounded row.
 */
function GridWrap() {
  return (
    <View class="flex-col items-start gap-4 p-6">
      <AvatarGroup isGrid style={{ width: 224 }}>
        <Avatar onLayout={layoutProbe("grid-first")} testID="grid-first">
          <Avatar.Fallback>1</Avatar.Fallback>
        </Avatar>
        <Avatar onLayout={layoutProbe("grid-second")} testID="grid-second">
          <Avatar.Fallback>2</Avatar.Fallback>
        </Avatar>
        <Avatar testID="grid-third">
          <Avatar.Fallback>3</Avatar.Fallback>
        </Avatar>
        <Avatar testID="grid-fourth">
          <Avatar.Fallback>4</Avatar.Fallback>
        </Avatar>
        <Avatar onLayout={layoutProbe("grid-fifth")} testID="grid-fifth">
          <Avatar.Fallback>5</Avatar.Fallback>
        </Avatar>
      </AvatarGroup>
      <AvatarGroup style={{ width: 224 }}>
        <Avatar onLayout={layoutProbe("clip-first")} testID="clip-first">
          <Avatar.Fallback>1</Avatar.Fallback>
        </Avatar>
        <Avatar testID="clip-second">
          <Avatar.Fallback>2</Avatar.Fallback>
        </Avatar>
        <Avatar testID="clip-third">
          <Avatar.Fallback>3</Avatar.Fallback>
        </Avatar>
        <Avatar testID="clip-fourth">
          <Avatar.Fallback>4</Avatar.Fallback>
        </Avatar>
        <Avatar onLayout={layoutProbe("clip-fifth")} testID="clip-fifth">
          <Avatar.Fallback>5</Avatar.Fallback>
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
  "geometry-grid": GridWrap,
  "geometry-sizes": Sizes,
};

function Fixture() {
  const name = String(host.params.fixture ?? "");
  const Entry = entries[name as Entry];

  if (!Entry) return <Text>{`unknown fixture: ${name}`}</Text>;

  return <Entry />;
}

mount(Fixture);
