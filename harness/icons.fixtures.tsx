import { host, mount, Text, View } from "nsh";
import {
  CircleDashedIcon,
  CloseIcon,
  DangerIcon,
  ExternalLinkIcon,
  IconCalendar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconMinus,
  IconPlus,
  IconSearch,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only icons fixture (port sheet 4b.2), not a shared scenario.
 *
 * `testID` and `onLayout` are not HeroUI props, so the geometry cases cannot
 * live in a scenario the reference package renders too. `colors` renders the
 * seven token paints next to a literal `paint`, for the screenshot comparison
 * §5 asks for; `nsh test` cannot read canvas pixels, so it carries no
 * assertion.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 *
 * host.params.case: defaults (all fifteen with layout probes), size (width and
 * height props), class-name (className override), test-id (custom identity),
 * colors (visual only).
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

function Defaults() {
  return (
    <Stage>
      <IconChevronDown onLayout={layoutProbe("icon-chevron-down")} />
      <IconChevronUp onLayout={layoutProbe("icon-chevron-up")} />
      <IconChevronLeft onLayout={layoutProbe("icon-chevron-left")} />
      <IconChevronRight onLayout={layoutProbe("icon-chevron-right")} />
      <ExternalLinkIcon onLayout={layoutProbe("icon-external-link")} />
      <CircleDashedIcon onLayout={layoutProbe("icon-circle-dashed")} />
      <CloseIcon onLayout={layoutProbe("icon-close")} />
      <InfoIcon onLayout={layoutProbe("icon-info")} />
      <WarningIcon onLayout={layoutProbe("icon-warning")} />
      <DangerIcon onLayout={layoutProbe("icon-danger")} />
      <SuccessIcon onLayout={layoutProbe("icon-success")} />
      <IconMinus onLayout={layoutProbe("icon-minus")} />
      <IconPlus onLayout={layoutProbe("icon-plus")} />
      <IconSearch onLayout={layoutProbe("icon-search")} />
      <IconCalendar onLayout={layoutProbe("icon-calendar")} />
    </Stage>
  );
}

function SizeProps() {
  return (
    <Stage>
      <IconChevronDown width={24} height={12} onLayout={layoutProbe("size-props")} />
    </Stage>
  );
}

function ClassNameSize() {
  return (
    <Stage>
      <IconChevronDown className="size-3" onLayout={layoutProbe("class-name")} />
    </Stage>
  );
}

function TestID() {
  return (
    <Stage>
      <CloseIcon testID="custom-close" aria-hidden={false} />
    </Stage>
  );
}

function Colors() {
  return (
    <Stage>
      <View class="flex-row items-center gap-4">
        <InfoIcon color="foreground" />
        <InfoIcon color="muted" />
        <InfoIcon color="field-placeholder" />
        <InfoIcon color="accent-soft-foreground" />
        <InfoIcon color="danger-soft-foreground" />
        <InfoIcon color="overlay-foreground" />
        <ExternalLinkIcon color="link" />
        <InfoIcon paint="#7c3aed" />
        <Text>foreground · muted · field-placeholder · accent-soft · danger-soft · overlay · link · #7c3aed</Text>
      </View>
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "defaults");

  if (name === "size") return <SizeProps />;
  if (name === "class-name") return <ClassNameSize />;
  if (name === "test-id") return <TestID />;
  if (name === "colors") return <Colors />;
  return <Defaults />;
}

mount(Fixture);
