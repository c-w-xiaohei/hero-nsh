import { host, keymap, Text, View, signal } from "nsh";
import { Input } from "nsh/base";
import {
  createControllableSignal,
  createDisclosureState,
  createInteractionModality,
  createToggleState,
  type InteractionModality,
  type InteractionPointerType,
} from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

/*
 * Scenarios for the L0 primitives. Each primitive is a pure function, so a test
 * opens the app on one case, presses "run" and reads the result the probe wrote
 * to Storage. Nothing here is HeroUI API; these scenarios exist only so the
 * primitive tests run on a real NSH engine.
 */

function unknownCase(name: string) {
  return <Text>{`unknown case: ${name}`}</Text>;
}

function Row(props: { id: string; label: string; onPress?: () => void }) {
  return (
    <View testID={props.id} role="button" onPress={props.onPress} class="p-2">
      <Text>{props.label}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * createControllableSignal
 * -----------------------------------------------------------------------------------------------*/

function UncontrolledSet() {
  const changes: string[] = [];
  const [value, setValue] = createControllableSignal<string | undefined>({
    defaultValue: () => "defaultValue",
    onChange: (next) => changes.push(String(next)),
  });
  const initialValue = value();
  const report = probe("result");

  const run = () => {
    setValue("newValue");
    const afterFirst = { value: value(), changes: [...changes] };
    setValue("newValue");
    report({
      initialValue,
      afterFirst,
      afterSecondValue: value(),
      afterSecondChanges: [...changes],
    });
  };

  return (
    <Stage>
      <Row id="run" label="run" onPress={run} />
      <Text>{String(value())}</Text>
    </Stage>
  );
}

function UncontrolledCallback() {
  const prevSeen: unknown[] = [];
  const changes: string[] = [];
  const [value, setValue] = createControllableSignal<string | undefined>({
    defaultValue: () => "defaultValue",
    onChange: (next) => changes.push(String(next)),
  });
  const report = probe("result");

  const run = () => {
    setValue((previous) => {
      prevSeen.push(previous);
      return "newValue";
    });
    setValue((previous) => {
      prevSeen.push(previous);
      return "newValue";
    });
    report({ prevSeen, value: value(), changes: [...changes] });
  };

  return (
    <Stage>
      <Row id="run" label="run" onPress={run} />
      <Text>{String(value())}</Text>
    </Stage>
  );
}

function ControlledSet() {
  const controlled = signal<string | undefined>("controlledValue");
  const changes: string[] = [];
  const [value, setValue] = createControllableSignal<string | undefined>({
    value: controlled,
    onChange: (next) => changes.push(String(next)),
  });
  const report = probe("result");

  const run = () => {
    setValue("newValue");
    const afterFirst = { value: value(), changes: [...changes] };
    setValue("controlledValue");
    report({
      afterFirst,
      afterSecondValue: value(),
      afterSecondChanges: [...changes],
    });
  };

  return (
    <Stage>
      <Row id="run" label="run" onPress={run} />
      <Text>{String(value())}</Text>
    </Stage>
  );
}

function ControlledCallback() {
  const controlled = signal<string | undefined>("controlledValue");
  const prevSeen: unknown[] = [];
  const changes: string[] = [];
  const [value, setValue] = createControllableSignal<string | undefined>({
    value: controlled,
    onChange: (next) => changes.push(String(next)),
  });
  const report = probe("result");

  const run = () => {
    setValue((previous) => {
      prevSeen.push(previous);
      return "newValue";
    });
    setValue((previous) => {
      prevSeen.push(previous);
      return "controlledValue";
    });
    report({ prevSeen, value: value(), changes: [...changes] });
  };

  return (
    <Stage>
      <Row id="run" label="run" onPress={run} />
      <Text>{String(value())}</Text>
    </Stage>
  );
}

function ControlledUpdate() {
  const controlled = signal<string | undefined>("controlledValue");
  const changes: string[] = [];
  const [value] = createControllableSignal<string | undefined>({
    value: controlled,
    onChange: (next) => changes.push(String(next)),
  });

  return (
    <Stage>
      <Row id="update" label="update" onPress={() => controlled.set("updated")} />
      <Text>{`${String(value())} changes ${changes.length}`}</Text>
    </Stage>
  );
}

function NanOnce() {
  const changes: (number | undefined)[] = [];
  const [value, setValue] = createControllableSignal<number | undefined>({
    onChange: (next) => changes.push(next),
  });
  const initialDefined = value() !== undefined;
  const report = probe("result");

  const run = () => {
    setValue(Number.NaN);
    const afterFirst = {
      isNaN: Number.isNaN(Number(value())),
      changes: changes.length,
    };
    setValue(Number.NaN);
    report({
      initialDefined,
      afterFirst,
      finalIsNaN: Number.isNaN(Number(value())),
      finalChanges: changes.length,
    });
  };

  return (
    <Stage>
      <Row id="run" label="run" onPress={run} />
      <Text>{value() === undefined ? "undefined" : "defined"}</Text>
    </Stage>
  );
}

const controllableCases: Record<string, Component> = {
  "uncontrolled-set": UncontrolledSet,
  "uncontrolled-callback": UncontrolledCallback,
  "controlled-set": ControlledSet,
  "controlled-callback": ControlledCallback,
  "controlled-update": ControlledUpdate,
  nan: NanOnce,
};

function ControllableSignalScenario() {
  const name = String(host.params.case ?? "");
  const Case = controllableCases[name];
  return Case ? <Case /> : unknownCase(name);
}

/* -------------------------------------------------------------------------------------------------
 * createToggleState
 * -----------------------------------------------------------------------------------------------*/

function ToggleCase() {
  const name = String(host.params.case ?? "");
  const changes: boolean[] = [];
  const report = probe("result");

  const state =
    name === "controlled"
      ? createToggleState({
          isSelected: () => true,
          onSelectedChange: (next) => changes.push(next),
        })
      : name === "readonly-set" || name === "readonly-toggle"
        ? createToggleState({
            defaultIsSelected: () => false,
            isReadOnly: () => true,
            onSelectedChange: (next) => changes.push(next),
          })
        : createToggleState({
            defaultIsSelected: () => name === "default-selected",
            onSelectedChange: (next) => changes.push(next),
          });

  const initial = state.isSelected();

  const run = () => {
    switch (name) {
      case "default-selected":
      case "controlled":
        if (name === "controlled") state.toggle();
        report({ initial, isSelected: state.isSelected(), changes: [...changes] });
        break;
      case "set":
        state.setIsSelected(true);
        const afterTrue = state.isSelected();
        state.setIsSelected(false);
        report({ initial, afterTrue, afterFalse: state.isSelected(), changes: [...changes] });
        break;
      case "readonly-set":
        state.setIsSelected(true);
        report({ initial, isSelected: state.isSelected(), changes: [...changes] });
        break;
      case "toggle":
        state.toggle();
        const afterOnce = state.isSelected();
        state.toggle();
        report({ initial, afterOnce, afterTwice: state.isSelected(), changes: [...changes] });
        break;
      case "readonly-toggle":
        state.toggle();
        report({ initial, isSelected: state.isSelected(), changes: [...changes] });
        break;
    }
  };

  return (
    <Stage>
      <Row id="run" label="run" onPress={run} />
      <Text>{state.isSelected() ? "selected" : "not selected"}</Text>
    </Stage>
  );
}

const toggleCases: Record<string, Component> = {
  "default-selected": ToggleCase,
  controlled: ToggleCase,
  set: ToggleCase,
  "readonly-set": ToggleCase,
  toggle: ToggleCase,
  "readonly-toggle": ToggleCase,
};

function ToggleStateScenario() {
  const name = String(host.params.case ?? "");
  return toggleCases[name] ? <ToggleCase /> : unknownCase(name);
}

/* -------------------------------------------------------------------------------------------------
 * createDisclosureState
 * -----------------------------------------------------------------------------------------------*/

function DisclosureCase() {
  const name = String(host.params.case ?? "");
  const changes: boolean[] = [];
  const report = probe("result");

  const state =
    name === "controlled"
      ? createDisclosureState({
          open: () => true,
          onOpenChange: (next) => changes.push(next),
        })
      : createDisclosureState({
          defaultOpen: () => name === "default-open" || name === "close",
          onOpenChange: (next) => changes.push(next),
        });

  const initial = state.isOpen();

  const run = () => {
    switch (name) {
      case "default-open":
      case "controlled":
        if (name === "controlled") state.toggle();
        report({ initial, isOpen: state.isOpen(), changes: [...changes] });
        break;
      case "set":
        state.setIsOpen(true);
        const afterTrue = state.isOpen();
        state.setIsOpen(false);
        report({ initial, afterTrue, afterFalse: state.isOpen(), changes: [...changes] });
        break;
      case "open":
        state.open();
        report({ initial, isOpen: state.isOpen(), changes: [...changes] });
        break;
      case "close":
        state.close();
        report({ initial, isOpen: state.isOpen(), changes: [...changes] });
        break;
      case "toggle":
        state.toggle();
        const afterOnce = state.isOpen();
        state.toggle();
        report({ initial, afterOnce, afterTwice: state.isOpen(), changes: [...changes] });
        break;
    }
  };

  return (
    <Stage>
      <Row id="run" label="run" onPress={run} />
      <Text>{state.isOpen() ? "open" : "closed"}</Text>
    </Stage>
  );
}

const disclosureCases: Record<string, Component> = {
  "default-open": DisclosureCase,
  controlled: DisclosureCase,
  set: DisclosureCase,
  open: DisclosureCase,
  close: DisclosureCase,
  toggle: DisclosureCase,
};

function DisclosureStateScenario() {
  const name = String(host.params.case ?? "");
  return disclosureCases[name] ? <DisclosureCase /> : unknownCase(name);
}

/* -------------------------------------------------------------------------------------------------
 * createInteractionModality
 * -----------------------------------------------------------------------------------------------*/

function ModalityCase() {
  const name = String(host.params.case ?? "");
  const changes: [InteractionModality, InteractionPointerType][] = [];
  const report = probe("result");

  const state = createInteractionModality({
    defaultModality: () => (name === "default-keyboard" ? "keyboard" : null),
    onChange: (modality, pointerType) => changes.push([modality, pointerType]),
  });

  const initial = {
    modality: state.modality(),
    pointerType: state.pointerType(),
    isKeyboard: state.isKeyboard(),
    isPointer: state.isPointer(),
  };

  const run = () => {
    switch (name) {
      case "initial":
      case "default-keyboard":
        break;
      case "pointer":
        state.setPointerModality();
        break;
      case "pointer-touch":
        state.setPointerModality("touch");
        break;
      case "keyboard":
        state.setKeyboardModality();
        break;
      case "focus":
        state.onFocus();
        break;
      case "change-once":
        state.setPointerModality();
        state.setPointerModality();
        state.setKeyboardModality();
        break;
      case "reset":
        state.setKeyboardModality();
        state.reset();
        break;
    }

    report({
      initial,
      modality: state.modality(),
      pointerType: state.pointerType(),
      isKeyboard: state.isKeyboard(),
      isPointer: state.isPointer(),
      changes: [...changes],
    });
  };

  return (
    <Stage>
      <Row id="run" label="run" onPress={run} />
      <Text>{String(state.modality())}</Text>
    </Stage>
  );
}

const modalityCases: Record<string, Component> = {
  initial: ModalityCase,
  pointer: ModalityCase,
  "pointer-touch": ModalityCase,
  keyboard: ModalityCase,
  focus: ModalityCase,
  "change-once": ModalityCase,
  reset: ModalityCase,
  "default-keyboard": ModalityCase,
};

function InteractionModalityScenario() {
  const name = String(host.params.case ?? "");
  return modalityCases[name] ? <ModalityCase /> : unknownCase(name);
}

/* -------------------------------------------------------------------------------------------------
 * V4: the key and focus events NSH exposes (research section 10)
 * -----------------------------------------------------------------------------------------------*/

function EventsCase() {
  const report = probe("event");

  // A view has no key handler; the app's only keyboard entry points are
  // shortcuts and inputs. Both are bound here to see what a test can drive.
  keymap.bind("down", () => report("keymap", { keystroke: "down" }), { when: "always" });
  keymap.bind("shift+k", () => report("keymap", { keystroke: "shift+k" }), { when: "always" });
  keymap.bind("k", () => report("keymap", { keystroke: "k" }), { when: "always" });

  return (
    <Stage>
      <View
        testID="stop-a"
        role="button"
        focusable
        onPress={() => report("press", "a")}
        onFocus={() => report("focus", "a")}
        onBlur={() => report("blur", "a")}
        class="p-2"
      >
        <Text>stop a</Text>
      </View>
      <View
        testID="stop-b"
        role="button"
        focusable
        onPress={() => report("press", "b")}
        onFocus={() => report("focus", "b")}
        onBlur={() => report("blur", "b")}
        class="p-2"
      >
        <Text>stop b</Text>
      </View>
      <Input
        testID="field"
        accessibilityLabel="field"
        onKeyPress={(e: { key: string }) => report("keypress", e.key)}
        onFocus={() => report("focus", "field")}
        onBlur={() => report("blur", "field")}
      />
      <View
        testID="outside"
        role="button"
        focusable
        onPress={() => report("press", "outside")}
        class="p-2"
      >
        <Text>outside</Text>
      </View>
    </Stage>
  );
}

const v4Cases: Record<string, Component> = {
  events: EventsCase,
};

function V4Scenario() {
  const name = String(host.params.case ?? "");
  const Case = v4Cases[name];
  return Case ? <Case /> : unknownCase(name);
}

/* -------------------------------------------------------------------------------------------------
 * Registration
 * -----------------------------------------------------------------------------------------------*/

export const primitivesScenarios = {
  "primitives/controllable-signal": ControllableSignalScenario,
  "primitives/toggle-state": ToggleStateScenario,
  "primitives/disclosure-state": DisclosureStateScenario,
  "primitives/interaction-modality": InteractionModalityScenario,
  "v4/events": V4Scenario,
};
