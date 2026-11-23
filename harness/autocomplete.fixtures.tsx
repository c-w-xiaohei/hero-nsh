import { effect, host, mount, signal } from "nsh";
import type { JSX } from "nsh";
import {
  Autocomplete,
  EnvironmentScope,
  Label,
  ListBox,
  PressableFeedbackContext,
  SearchField,
} from "@heroui/react";
import type {
  EnvironmentDensity,
  EnvironmentInput,
  EnvironmentWidth,
  PressableFeedbackContextValue,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import { Text, View } from "nsh";
import type { ViewRef } from "nsh";

/*
 * NSH-only Autocomplete fixtures (port sheet 4c, the G-001 geometry case;
 * adapt sheet A-013 for the mobile layer).
 *
 * The shared scenarios cannot carry `onLayout` probes, and G-001 is about
 * measured relations between parts, so this entry renders the G-001 shape and
 * reports each part's box to Storage:
 *   trigger  the field itself, 256pt wide like the reference page's
 *   popover  the overlay's own box
 *   search   the filter's SearchField
 *   list     the ListBox inside the popover
 *
 * Two coordinate spaces meet here and the boxes keep them apart, because NSH
 * reports them differently:
 *   trigger / popover  page space, through `measure()` (`pagePosition` is a
 *                      view's corner in the root view it is in), so their
 *                      relation — same x and width, popover below the field —
 *                      is measurable. `onLayout` alone cannot do it: inside
 *                      the overlay the probe would be in the overlay's space.
 *   search / list      their `onLayout` boxes, which inside a `Scroll` are the
 *                      scroll content's own coordinates. Fine for their widths
 *                      and for which one is above the other; not comparable
 *                      with the page-space boxes.
 *
 * host.params.case picks the fixture:
 *   layout         three options (the reference page's shape)
 *   layout-scroll  forty options, so the popover's growth and its cap by the
 *                  room the overlay has can be measured (port sheet §6.3: the
 *                  list cannot hold upstream's own 320pt scroll)
 *   m*             the mobile layer's Autocomplete (adapt sheet §4): an
 *                  items-driven single-select field with the ClearButton seam
 *                  probe, parameterized presentation / non-modal /
 *                  keyboard-dismiss / empty / disabled / controlled-input.
 *
 * `host.params.input` / `host.params.width` / `host.params.density` feed the
 * `EnvironmentScope` `Scoped` always mounts (absent fields inherit the host
 * baseline — the popover A-010 convention; a no-param fragment would break
 * the popover presence chain).
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

function report(name: string, x: number, y: number, width: number, height: number) {
  probe("layout")({ name, x, y, width, height });
}

/**
 * A view's box in the root view it is in, once the frame settles: `measure()`
 * answers "where the view is once this turn's changes are laid out", and the
 * overlay is placed a frame after it mounts.
 */
function measurePage(name: "trigger" | "popover", node: ViewRef | undefined) {
  if (!node) return;

  requestAnimationFrame(() => {
    void node.measure().then((measured) => {
      if (!measured) return;

      report(
        name,
        measured.pagePosition.x,
        measured.pagePosition.y,
        measured.bounds.size.width,
        measured.bounds.size.height,
      );
    });
  });
}

function layoutProbe(name: string) {
  return (event: LayoutEvent) =>
    report(
      name,
      event.bounds.origin.x,
      event.bounds.origin.y,
      event.bounds.size.width,
      event.bounds.size.height,
    );
}

const ANIMALS = [
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "panda", name: "Panda" },
];

const MANY = Array.from({ length: 40 }, (_, index) => ({
  id: `option-${index}`,
  name: `Animal ${index}`,
}));

/** RAC's default `contains` filter with `sensitivity: "base"`. */
function contains(textValue: string, inputValue: string): boolean {
  return textValue.toLowerCase().includes(inputValue.toLowerCase());
}

/* -------------------------------------------------------------------------------------------------
 * ClearButton seam probe (adapt sheet A-003/A-004, the ctx-* convention)
 * -----------------------------------------------------------------------------------------------*/

/** The live `PressableFeedbackContext` the sibling `ctx-sample` button reads. */
let clearCtx: PressableFeedbackContextValue | null = null;

function CtxProbe() {
  const ctx = PressableFeedbackContext();
  const reportPressed = probe("ctx-pressed");
  const reportState = probe("ctx-state");
  const reportEnv = probe("ctx-env");

  effect(() => {
    clearCtx = ctx;
  });

  // Mount-time environment of the seam: the effective gate and the computed
  // hitSlop (undefined until `onLayout` reports the bounds, so this effect
  // re-reports on the layout edge too).
  effect(() => {
    void ctx.bounds();
    reportEnv({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
      bounds: ctx.bounds(),
    });
  });

  const sample = (seamPressed = ctx.isPressed()) => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        reportState({
          seamPressed,
          pressed,
          scale,
          origin: ctx.pressOrigin(),
          hitSlop: ctx.hitSlop() ?? null,
          bounds: ctx.bounds(),
          enabled: ctx.enabled(),
          allDisabled: ctx.isAllAnimationsDisabled(),
        });
      });
    });
  };

  // The edge sample carries the flag's snapshot: `pressed`/`scale` resolve a
  // tick later, by which time `isPressed()` may already be back at rest.
  effect(() => {
    const seam = ctx.isPressed();
    reportPressed({ seam });
    sample(seam);
    setTimeout(() => sample(), 600);
    setTimeout(() => sample(), 1500);
  });

  // Polling sampler for hosts that batch the edge effect into the settled
  // flag (the web half of the mobile files).
  effect(() => {
    const timer = setInterval(() => {
      if (ctx.isPressed()) {
        sample();
      }
    }, 200);

    return () => clearInterval(timer);
  });

  return null;
}

/* On-demand channel read for the negative half: a gated press never raises
 * the seam's `isPressed` edge, so `ctx-state` alone cannot prove the channels
 * stayed at rest — `ctx-sample` samples them after the press instead. */
function sampleChannels() {
  const reportChannels = probe("ctx-channels");
  const ctx = clearCtx;
  if (ctx === null) {
    return;
  }
  void ctx.pressed.getValue().then((pressed) => {
    void ctx.scale.getValue().then((scale) => {
      reportChannels({
        seamPressed: ctx.isPressed(),
        pressed,
        scale,
        origin: ctx.pressOrigin(),
        hitSlop: ctx.hitSlop() ?? null,
        enabled: ctx.enabled(),
      });
    });
  });
}

/* -------------------------------------------------------------------------------------------------
 * G-001 layout cases (unchanged)
 * -----------------------------------------------------------------------------------------------*/

function LayoutCase(props: { scrollable: boolean }) {
  const items = props.scrollable ? MANY : ANIMALS;

  let popoverNode: ViewRef | undefined;

  return (
    <Stage>
      <Autocomplete
        className="w-[256px]"
        defaultOpen
        placeholder="Select an animal"
        selectionMode="single"
      >
        <Label>Favorite Animal</Label>
        <Autocomplete.Trigger
          ref={(node) => measurePage("trigger", node)}
          testID="autocomplete-trigger"
        >
          <Autocomplete.Value />
          <Autocomplete.Indicator />
        </Autocomplete.Trigger>
        <Autocomplete.Popover
          // The popover's `onLayout` reaches the `Scroll` viewport it owns, so
          // every settled content size re-measures the overlay's placed box.
          onLayout={() => measurePage("popover", popoverNode)}
          ref={(node) => {
            popoverNode = node;
            measurePage("popover", node);
          }}
        >
          <Autocomplete.Filter filter={contains}>
            <SearchField
              autoFocus
              aria-label="Search animals"
              name="search"
              onLayout={layoutProbe("search")}
              testID="autocomplete-search"
              variant="secondary"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search animals..." />
              </SearchField.Group>
            </SearchField>
            <ListBox onLayout={layoutProbe("list")} testID="autocomplete-list">
              {items.map((item) => (
                <ListBox.Item id={item.id} textValue={item.name}>
                  {item.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Mobile cases (adapt sheet §2 A-013)
 * -----------------------------------------------------------------------------------------------*/

type MobilePresentation = "auto" | "panel" | "sheet";

type MobileCaseProps = {
  presentation?: MobilePresentation;
  isNonModal?: boolean;
  kbDismiss?: boolean;
  hasValue?: boolean;
  disabled?: boolean;
  controlled?: boolean;
  controlledInput?: boolean;
  defaultOpen?: boolean;
};

function MobileCase(props: MobileCaseProps) {
  const hasValue = props.hasValue ?? true;
  const selected = signal<string | null>(hasValue ? "cat" : null);
  const filterText = signal("");

  const events = probe("events");
  const hover = probe("hover");
  const openChange = probe("openChange");
  const change = probe("change");
  const selectionChange = probe("selectionChange");
  const inputChange = probe("inputChange");
  const clear = probe("clear");
  const searchChange = probe("searchChange");
  const searchSubmit = probe("searchSubmit");

  const handleChange = (value: unknown) => {
    change(value);
    if (props.controlled) {
      selected.set(typeof value === "string" ? value : null);
    }
  };

  const handleInputChange = (value: string) => {
    inputChange(value);
    if (props.controlledInput) {
      filterText.set(value);
    }
  };

  return (
    <Stage>
      <Autocomplete
          className="w-[256px]"
          items={ANIMALS}
          placeholder="Select an animal"
          selectionMode="single"
          value={props.controlled ? selected() : undefined}
          defaultValue={props.controlled || !hasValue ? undefined : "cat"}
          onChange={handleChange}
          onSelectionChange={selectionChange}
          onOpenChange={openChange}
          onInputChange={handleInputChange}
          onClear={clear}
          inputValue={props.controlledInput ? filterText() : undefined}
          isDisabled={props.disabled || undefined}
          defaultOpen={props.defaultOpen}
        >
          <Label>Favorite Animal</Label>
          <Autocomplete.Trigger
            testID="ac-trigger"
            onLayout={layoutProbe("trigger")}
            onPress={() => events("trigger-press")}
            onHoverStart={() => hover({ kind: "start" })}
            onHoverEnd={() => hover({ kind: "end" })}
            onHoverChange={(value: boolean) => hover({ kind: "change", value })}
            onMouseEnter={() => events("mouseEnter")}
            onMouseLeave={() => events("mouseLeave")}
          >
            {(values: { isHovered: () => boolean }) => (
              <>
                <Autocomplete.Value />
                <Autocomplete.ClearButton testID="ac-clear">
                  <CtxProbe />
                </Autocomplete.ClearButton>
                <Autocomplete.Indicator />
                <Text>{values.isHovered() ? "trigger-hover" : ""}</Text>
              </>
            )}
          </Autocomplete.Trigger>
          <Autocomplete.Popover
            testID="ac-pop"
            presentation={props.presentation}
            isNonModal={props.isNonModal || undefined}
            isKeyboardDismissDisabled={props.kbDismiss || undefined}
          >
            <Autocomplete.Filter filter={contains}>
              <SearchField
                autoFocus
                aria-label="Search animals"
                name="search"
                onChange={searchChange}
                onSubmit={searchSubmit}
              >
                <SearchField.Group
                  testID="ac-search-group"
                  onLayout={layoutProbe("search-group")}
                >
                  <SearchField.SearchIcon />
                  <SearchField.Input
                    testID="ac-search-input"
                    placeholder="Search animals..."
                  />
                </SearchField.Group>
              </SearchField>
              <ListBox
                items={ANIMALS}
                testID="ac-list"
                onLayout={layoutProbe("list")}
              >
                {(animal: { id: string; name: string }) => (
                  <ListBox.Item id={animal.id} textValue={animal.name}>
                    {animal.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                )}
              </ListBox>
            </Autocomplete.Filter>
          </Autocomplete.Popover>
        </Autocomplete>
      <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
        <Text>ctx-sample</Text>
      </View>
    </Stage>
  );
}

/* -------------------------------------------------------------------------------------------------
 * EnvironmentScope wrapper (adapt sheet A-013): always mounted, fields absent
 * inherit the host baseline.
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  const input = host.params.input;
  const width = host.params.width;
  const density = host.params.density;

  return (
    <EnvironmentScope
      input={input === undefined ? undefined : (String(input) as EnvironmentInput)}
      width={width === undefined ? undefined : (String(width) as EnvironmentWidth)}
      density={
        density === undefined ? undefined : (String(density) as EnvironmentDensity)
      }
    >
      {props.children}
    </EnvironmentScope>
  );
}

function flag(name: string): boolean {
  return String(host.params[name] ?? "") === "1";
}

function Fixture() {
  const name = String(host.params.case ?? "layout");

  if (name === "layout" || name === "layout-scroll") {
    return <LayoutCase scrollable={name === "layout-scroll"} />;
  }

  const presentationParam = String(host.params.presentation ?? "");
  const presentation =
    presentationParam === ""
      ? undefined
      : (presentationParam as MobilePresentation);

  // The `m-pin-*` / `m-kbdismiss` names preset the same knobs the generic
  // `presentation` / `kbDismiss` params expose.
  const presentationFor =
    name === "m-pin-sheet" || name === "m-kbdismiss"
      ? "sheet"
      : name === "m-pin-panel"
        ? "panel"
        : presentation;

  // The case element must be created inside `Scoped`'s children expression:
  // elements built in a detached expression (an IIFE assigned to a variable)
  // bind the environment at creation and never re-parent, so the subtree
  // would read the host default — measured: `input` stayed `"pointer"`
  // through `<Scoped>{mobile}</Scoped>` while siblings inline in the
  // children arg saw `"touch"`.
  return (
    <Scoped>
      <MobileCase
        presentation={presentationFor}
        isNonModal={name === "m-nonmodal" || flag("isNonModal")}
        kbDismiss={name === "m-kbdismiss" || flag("kbDismiss")}
        hasValue={name === "m-empty" ? false : !flag("empty")}
        disabled={name === "m-disabled" || flag("disabled")}
        controlled={flag("controlled")}
        controlledInput={flag("controlledInput")}
        defaultOpen={flag("open")}
      />
    </Scoped>
  );
}

mount(Fixture);
