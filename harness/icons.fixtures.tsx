import { host, mount, Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  CircleDashedIcon,
  CloseIcon,
  DangerIcon,
  EnvironmentScope,
  ExternalLinkIcon,
  IconCalendar,
  IconCheck,
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
  createDensity,
  createInput,
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
 * host.params.case: defaults (all sixteen with layout probes), size (width and
 * height props), class-name (className override), test-id (custom identity),
 * colors (visual only), mobile (the dual-environment row the
 * `icons.mobile.test.tsx` assertions drive).
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

/* -------------------------------------------------------------------------------------------------
 * Mobile-environment case (adapt-sheets/icons.md §4 M-001…M-006)
 * -----------------------------------------------------------------------------------------------*/

/**
 * Textual environment witness: `createInput()` / `createDensity()` read the
 * scope the tree was mounted under, so the string records which environment
 * the icons rendered in (M-003…M-006).
 */
function EnvText() {
  const input = createInput();
  const density = createDensity();

  return <Text testID="env-readout">{`env:input=${input()} density=${density()}`}</Text>;
}

/**
 * `host.params.input` / `host.params.density` feed `EnvironmentScope`; an
 * absent param keeps the host-derived value, so a case opened without them
 * is the desktop-parity baseline.
 */
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

/**
 * The mobile row: all sixteen icons under the same layout probes as
 * `defaults` (IconCheck joins the row here, so the existing case is
 * untouched), plus the `size`/`class-name` override boxes the M-002
 * comparison needs in the same environment.
 */
function MobileCase() {
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
      <IconCheck onLayout={layoutProbe("icon-check")} />
      <IconChevronDown
        testID="size-props"
        width={24}
        height={12}
        onLayout={layoutProbe("size-props")}
      />
      <IconChevronDown
        testID="class-name"
        className="size-3"
        onLayout={layoutProbe("class-name")}
      />
      <EnvText />
    </Stage>
  );
}

function Fixture() {
  const name = String(host.params.case ?? "defaults");

  if (name === "mobile") {
    return (
      <ScopedMobile>
        <MobileCase />
      </ScopedMobile>
    );
  }
  if (name === "size") return <SizeProps />;
  if (name === "class-name") return <ClassNameSize />;
  if (name === "test-id") return <TestID />;
  if (name === "colors") return <Colors />;
  return <Defaults />;
}

mount(Fixture);
