import { host, mount, platform, Text, View, windowSize } from "nsh";
import type { Component, JSX, PressEvent } from "nsh";
import {
  createDensity,
  createInput,
  createInteractionModality,
  createListState,
  createSelectableItem,
  densityKey,
  Environment,
  EnvironmentScope,
} from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only fixture for the environment unit (adapt-sheets/environment.md §2
 * A-009, §4 M-001…M-010).
 *
 * `host.params.case` picks the shape:
 *
 *   fields     FieldProbe reads the environment's three axes through the
 *              public entry — `createInput()`, `createDensity()` and
 *              `Environment().width()` — as Texts, plus `densityKey(...)` to
 *              prove the tokens/density query entry sees the context-fed
 *              value (M-001…M-004, M-009, M-010).
 *   selection  SelectionInner owns a multiple-mode `createListState` +
 *              `createSelectableItem` on "banana" (pre-selected); `press`
 *              runs one pointer press and the probe reports the selection
 *              (M-005, M-006, M-008's selectable half). `host.params.pointer`
 *              forces the item's explicit `pointerType` prop.
 *   modality   ModalityInner owns a `createInteractionModality`; `press-pointer`
 *              calls `setPointerModality()` with no argument (the environment
 *              supplies the type — M-007) and `press-explicit` calls
 *              `setPointerModality("pen")` (the override — M-008).
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper the case mounts:
 *   (absent)   no scope — the host-derived default environment
 *   "touch"    EnvironmentScope input="touch" — a partial override
 *   "pointer"  EnvironmentScope input="pointer" — the explicit pointer half
 *              of pointer/touch comparisons (a real phone's default is
 *              touch, so pointer is injected, never assumed)
 *   "density"  EnvironmentScope density="compact" — the non-default preset
 *   "nested"   EnvironmentScope input="touch" around an inner
 *              EnvironmentScope input="pointer" width="regular", with a second
 *              FieldProbe in the outer scope so both merged values show
 *              (fields case only, M-003)
 *
 * The factories that read `Environment()` (`createSelectableItem`,
 * `createInteractionModality`) run inside SelectionInner / ModalityInner —
 * components the scope actually wraps — because a context resolves against
 * the owner that called the factory, not the JSX around its output.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

/* -------------------------------------------------------------------------------------------------
 * Shared bits
 * -----------------------------------------------------------------------------------------------*/

type Fruit = { key: string; textValue: string };

const FRUITS: Fruit[] = [
  { key: "apple", textValue: "Apple" },
  { key: "banana", textValue: "Banana" },
  { key: "cherry", textValue: "Cherry" },
];

/** A pointer press payload: non-zero page position, so it is not a keyboard activation. */
function pointerEvent(): PressEvent {
  return {
    position: { x: 4, y: 4 },
    pagePosition: { x: 40, y: 40 },
    modifiers: { control: false, alt: false, shift: false, platform: false },
    clickCount: 1,
  };
}

function keysOf(keys: Iterable<string>): string[] {
  return [...keys];
}

/* -------------------------------------------------------------------------------------------------
 * Scope wrapper (M-002, M-003, M-004 and the injected half of the rest)
 * -----------------------------------------------------------------------------------------------*/

function Scoped(props: { children?: JSX.Element }) {
  const scope = String(host.params.scope ?? "");

  switch (scope) {
    case "touch":
      return <EnvironmentScope input="touch">{props.children}</EnvironmentScope>;
    case "pointer":
      return (
        <EnvironmentScope input="pointer">{props.children}</EnvironmentScope>
      );
    case "density":
      return (
        <EnvironmentScope density="compact">{props.children}</EnvironmentScope>
      );
    case "nested":
      // Fields-only shape: the case's own probe sits inside the inner scope
      // (input=pointer, width=regular win there), and a second probe sits in
      // the outer scope (input=touch survives, width falls back to the host).
      return (
        <EnvironmentScope input="touch">
          <EnvironmentScope input="pointer" width="regular">
            {props.children}
          </EnvironmentScope>
          <FieldProbe />
        </EnvironmentScope>
      );
    default:
      return <>{props.children}</>;
  }
}

function Frame(props: { children?: JSX.Element }) {
  return <View class="flex-1 items-start gap-4 bg-background p-6">{props.children}</View>;
}

/* -------------------------------------------------------------------------------------------------
 * Fields case (M-001, M-002, M-003, M-004, M-009, M-010)
 * -----------------------------------------------------------------------------------------------*/

/**
 * Reads the environment once per render through the public entry points. The
 * texts are the assertion surface: `input=…`, `density=…`, `densityKey=…`,
 * `width=…`.
 */
function FieldProbe() {
  const input = createInput();
  const density = createDensity();
  const env = Environment();

  return (
    <View class="flex-col gap-1">
      <Text>{`input=${input()}`}</Text>
      <Text>{`density=${density()}`}</Text>
      <Text>{`densityKey=${densityKey(density())}`}</Text>
      <Text>{`width=${env.width()}`}</Text>
    </View>
  );
}

function FieldsCase() {
  return (
    <Frame>
      <Scoped>
        <FieldProbe />
      </Scoped>
    </Frame>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Selection case (M-005, M-006, M-008 selectable half)
 * -----------------------------------------------------------------------------------------------*/

/**
 * Owns the selection state, so it must sit under the `EnvironmentScope` the
 * case mounts: `createSelectableItem` reads `Environment().input` when the
 * factory runs, and the factory's owner is this component.
 *
 * A `press` runs one full pointer press on the pre-selected "banana". Under
 * an injected `input="touch"` environment the derived pointerType takes the
 * touch path — toggle — so the press clears the selection. Under the default
 * pointer environment the same press takes the mouse path — replace — and
 * banana stays selected.
 */
function SelectionInner() {
  const report = probe("selection");
  const explicitPointer = String(host.params.pointer ?? "");

  const list = createListState({
    dataSource: () => FRUITS,
    getKey: () => "key",
    getTextValue: () => "textValue",
    selectionMode: () => "multiple",
    selectionBehavior: () => "replace",
    defaultSelectedKeys: () => ["banana"],
  });

  const item = createSelectableItem({
    selectionManager: list.selectionManager,
    key: () => "banana",
    // `pointer` param forces the explicit prop; absent means the environment
    // decides (M-008).
    pointerType: () =>
      explicitPointer === "touch"
        ? "touch"
        : explicitPointer === "pen"
          ? "pen"
          : explicitPointer === "mouse"
            ? "mouse"
            : undefined,
  });

  const press = () => {
    const event = pointerEvent();
    item.onPressDown(event);
    item.onPressUp(event);
    item.onPress(event);

    report({
      selected: keysOf(list.selectionManager().selectedKeys()),
      focusedKey: list.selectionManager().focusedKey() ?? null,
    });
  };

  return (
    <View class="flex-col gap-2">
      <Text>{`selected=${keysOf(list.selectionManager().selectedKeys()).join(",")}`}</Text>
      <View testID="press" role="button" onPress={press} class="p-2">
        <Text>press</Text>
      </View>
    </View>
  );
}

function SelectionCase() {
  return (
    <Frame>
      <Scoped>
        <SelectionInner />
      </Scoped>
    </Frame>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Modality case (M-007, M-008 modality half)
 * -----------------------------------------------------------------------------------------------*/

/**
 * Owns the modality state for the same reason SelectionInner owns its item:
 * `createInteractionModality` resolves `Environment().input` at factory time.
 *
 * `press-pointer` calls `setPointerModality()` with no argument — the
 * environment supplies `"touch"` or `"mouse"`. `press-explicit` calls
 * `setPointerModality("pen")` — the explicit argument must win over an
 * injected touch environment.
 */
function ModalityInner() {
  const report = probe("modality");

  const state = createInteractionModality();

  const run = (action: "press-pointer" | "press-explicit") => {
    if (action === "press-pointer") {
      state.setPointerModality();
    } else {
      state.setPointerModality("pen");
    }

    report({
      pointerType: state.pointerType(),
      modality: state.modality(),
    });
  };

  return (
    <View class="flex-col gap-2">
      <View
        testID="press-pointer"
        role="button"
        onPress={() => run("press-pointer")}
        class="p-2"
      >
        <Text>pointer</Text>
      </View>
      <View
        testID="press-explicit"
        role="button"
        onPress={() => run("press-explicit")}
        class="p-2"
      >
        <Text>explicit</Text>
      </View>
    </View>
  );
}

function ModalityCase() {
  return (
    <Frame>
      <Scoped>
        <ModalityInner />
      </Scoped>
    </Frame>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases table
 * -----------------------------------------------------------------------------------------------*/

const cases: Record<string, Component> = {
  fields: FieldsCase,
  selection: SelectionCase,
  modality: ModalityCase,
};

function Fixture() {
  const name = String(host.params.case ?? "fields");
  const Case = cases[name] ?? FieldsCase;

  // The host's own report — platform facts and the real window size — so
  // tests derive the expected default environment (input follows
  // `platform.desktop`, width the window's short side) instead of pinning
  // a desktop baseline a native phone cannot provide.
  probe("env")({
    os: platform.os,
    desktop: platform.desktop,
    idiom: platform.idiom,
    w: windowSize().width,
    h: windowSize().height,
  });

  return <Case />;
}

mount(Fixture);
