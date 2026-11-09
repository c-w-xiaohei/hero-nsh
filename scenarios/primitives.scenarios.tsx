import { cleanup, effect, host, keymap, Text, View, signal } from "nsh";
import type { Accessor, Bounds, PressEvent, ViewRef } from "nsh";
import { Input } from "nsh/base";
import {
  ListCollection,
  SelectionManager,
  buildNodes,
  createCollection,
  createControllableSignal,
  createDisclosureState,
  createInteractionModality,
  createKeymapScope,
  createListState,
  createMultipleSelectionState,
  createSelectableItem,
  createSelectableList,
  createSingleSelectListState,
  createToggleState,
  getItemCount,
  type InteractionModality,
  type InteractionPointerType,
  type MultipleSelectionManager,
  type SelectionBehavior,
  type SelectionMode,
  type SelectableListState,
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
 * selection / list: the state and keyboard primitives ported from Kobalte
 * -----------------------------------------------------------------------------------------------*/

type Fruit = { key: string; textValue: string };

const FRUITS: Fruit[] = [
  { key: "apple", textValue: "Apple" },
  { key: "apricot", textValue: "Apricot" },
  { key: "banana", textValue: "Banana" },
  { key: "blueberry", textValue: "Blueberry" },
  { key: "cherry", textValue: "Cherry" },
  { key: "date", textValue: "Date" },
];

function paramList(name: string): string[] {
  const value = host.params[name];
  if (value == null || value === "") {
    return [];
  }

  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function paramFlag(name: string): boolean {
  const value = host.params[name];
  return value === true || value === "1" || value === 1;
}

function paramString(name: string): string {
  return String(host.params[name] ?? "");
}

/** Reports a `Selection`/`Set` as a stable, assertable array. */
function keysOf(keys: Iterable<string>): string[] {
  return [...keys];
}

/* ---- createMultipleSelectionState + SelectionManager ------------------------ */

function MultipleSelectionCase() {
  const mode = (paramString("mode") || "multiple") as SelectionMode;
  const behavior = (paramString("behavior") || "toggle") as SelectionBehavior;
  const disallowEmpty = paramFlag("disallowEmpty");
  const allowDuplicate = paramFlag("allowDuplicate");
  const controlled = paramFlag("controlled");
  const target = paramString("target") || "banana";
  const disabledKeys = new Set(paramList("disabled"));
  const initialKeys = paramList("selected");
  const all = paramFlag("all");
  const disabledBehavior = paramString("disabledBehavior") === "selection"
    ? "selection"
    : "all";

  const report = probe("result");
  const changes: string[][] = [];

  const controlledKeys = signal<string[] | "all">(all ? "all" : initialKeys);

  const state = createMultipleSelectionState({
    selectionMode: () => mode,
    selectionBehavior: () => behavior,
    disallowEmptySelection: () => disallowEmpty,
    allowDuplicateSelectionEvents: () => allowDuplicate,
    disabledBehavior: () => disabledBehavior,
    selectedKeys: controlled ? () => controlledKeys() : undefined,
    defaultSelectedKeys: () => (all ? "all" : initialKeys),
    onSelectionChange: (keys) =>
      changes.push(keys === "all" ? ["all"] : keysOf(keys)),
  });

  const collection = createCollection({
    dataSource: () => FRUITS,
    getKey: () => "key",
    getTextValue: () => "textValue",
    getDisabled: () => (data: Fruit) => disabledKeys.has(data.key),
    factory: (nodes) => new ListCollection(nodes),
  });

  const manager = new SelectionManager(collection, state);

  const snapshot = () => ({
    selected: keysOf(manager.selectedKeys()),
    focusedKey: manager.focusedKey() ?? null,
    isFocused: manager.isFocused(),
    isEmpty: manager.isEmpty(),
    isSelectAll: manager.isSelectAll(),
    firstSelected: manager.firstSelectedKey() ?? null,
    lastSelected: manager.lastSelectedKey() ?? null,
    rawAll: state.selectedKeys() === "all",
    disabledBehavior: manager.disabledBehavior(),
    disabledBanana: manager.isDisabled("banana"),
    canSelectBanana: manager.canSelectItem("banana"),
    changes: changes.slice(),
  });

  const run = (action: string) => {
    switch (action) {
      case "toggle":
        manager.toggleSelection(target);
        break;
      case "replace":
        manager.replaceSelection(target);
        break;
      case "replace-anchor":
        manager.replaceSelection(paramString("anchor") || target);
        break;
      case "extend":
        manager.extendSelection(target);
        break;
      case "select-toggle":
        manager.select(target);
        break;
      case "select-touch":
        manager.select(target, "touch");
        break;
      case "select-mouse":
        manager.select(target, "mouse");
        break;
      case "select-all":
        manager.selectAll();
        break;
      case "clear":
        manager.clearSelection();
        break;
      case "toggle-select-all":
        manager.toggleSelectAll();
        break;
      case "set-keys":
        manager.setSelectedKeys(paramList("keys"));
        break;
      case "set-all":
        manager.setSelectedKeys("all");
        break;
      case "focus":
        manager.setFocused(true);
        break;
      case "blur":
        manager.setFocused(false);
        break;
      case "focus-key":
        manager.setFocusedKey(target);
        break;
      case "focus-missing":
        manager.setFocusedKey("missing");
        break;
      case "equal": {
        const equals = manager.isSelectionEqual(
          new Set(paramList("keys")),
        );
        report({ ...snapshot(), equals });
        return;
      }
      case "apply":
        controlledKeys.set(changes.length ? changes[changes.length - 1] : []);
        break;
      case "apply-all":
        controlledKeys.set("all");
        break;
    }

    report(snapshot());
  };

  return (
    <Stage>
      <View class="flex-row flex-wrap gap-2">
        {[
          "toggle",
          "replace",
          "replace-anchor",
          "extend",
          "select-toggle",
          "select-touch",
          "select-mouse",
          "select-all",
          "clear",
          "toggle-select-all",
          "set-keys",
          "set-all",
          "apply-all",
          "focus",
          "blur",
          "focus-key",
          "focus-missing",
          "equal",
          "apply",
          "snapshot",
        ].map((action) => (
          <Row
            id={`action-${action}`}
            label={action}
            onPress={() => run(action)}
          />
        ))}
      </View>
      <Text>
        {state.selectedKeys() === "all"
          ? "all"
          : keysOf(state.selectedKeys() as Set<string>).join(",")}
      </Text>
    </Stage>
  );
}

/* ---- createListState / createSingleSelectListState -------------------------- */

function ListStateCase() {
  const caseName = paramString("case") || "state";
  const disabledKeys = new Set(paramList("disabled"));
  const initialKeys = paramList("selected");
  const report = probe("result");

  if (caseName === "single") {
    const changes: string[] = [];
    const single = createSingleSelectListState({
      dataSource: () => FRUITS,
      getKey: () => "key",
      getTextValue: () => "textValue",
      getDisabled: () => (data: Fruit) => disabledKeys.has(data.key),
      defaultSelectedKey: () => initialKeys[0],
      onSelectionChange: (key) => changes.push(key),
    });

    const snapshot = () => ({
      selectedKey: single.selectedKey() ?? null,
      selectedItem: single.selectedItem()?.key ?? null,
      selectedText: single.selectedItem()?.textValue ?? null,
      managerSelected: keysOf(single.selectionManager().selectedKeys()),
      changes: changes.slice(),
    });

    const run = (action: string) => {
      switch (action) {
        case "select-banana":
          single.selectionManager().replaceSelection("banana");
          break;
        case "select-banana-again":
          single.selectionManager().replaceSelection("banana");
          break;
        case "clear":
          single.selectionManager().clearSelection();
          break;
        case "set-cherry":
          single.setSelectedKey("cherry");
          break;
        case "select-disabled":
          single.selectionManager().replaceSelection(
            paramString("target") || "banana",
          );
          break;
      }

      report(snapshot());
    };

    return (
      <Stage>
        {[
          "select-banana",
          "select-banana-again",
          "clear",
          "set-cherry",
          "select-disabled",
          "snapshot",
        ].map((action) => (
          <Row
            id={`action-${action}`}
            label={action}
            onPress={() => run(action)}
          />
        ))}
        <Text>{single.selectedKey() ?? "none"}</Text>
      </Stage>
    );
  }

  if (caseName === "dynamic" || caseName === "filter") {
    const dataSource = signal<Fruit[]>(FRUITS);
    const filtered = signal(false);

    const list = createListState({
      dataSource,
      getKey: () => "key",
      getTextValue: () => "textValue",
      getDisabled: () => (data: Fruit) => disabledKeys.has(data.key),
      selectionMode: () => "multiple",
      filter:
        caseName === "filter"
          ? () =>
              filtered()
                ? (nodes: Iterable<any>) =>
                    [...nodes].filter((node) =>
                      String(node.textValue).toLowerCase().startsWith("b"),
                    )
                : undefined
          : undefined,
      defaultSelectedKeys: () => initialKeys,
    });

    const snapshot = () => ({
      keys: keysOf(list.collection().getKeys()),
      size: list.collection().getSize(),
      itemCount: getItemCount(list.collection()),
      selected: keysOf(list.selectionManager().selectedKeys()),
      focusedKey: list.selectionManager().focusedKey() ?? null,
    });

    const run = (action: string) => {
      switch (action) {
        case "focus-banana":
          list.selectionManager().setFocusedKey("banana");
          break;
        case "remove-banana":
          dataSource.set(FRUITS.filter((fruit) => fruit.key !== "banana"));
          break;
        case "add-banana":
          dataSource.set(FRUITS);
          break;
        case "filter-on":
          filtered.set(true);
          break;
        case "filter-off":
          filtered.set(false);
          break;
      }

      report(snapshot());
    };

    return (
      <Stage>
        {[
          "focus-banana",
          "remove-banana",
          "add-banana",
          "filter-on",
          "filter-off",
          "snapshot",
        ].map((action) => (
          <Row
            id={`action-${action}`}
            label={action}
            onPress={() => run(action)}
          />
        ))}
        <Text>{keysOf(list.collection().getKeys()).join(",")}</Text>
      </Stage>
    );
  }

  const list = createListState({
    dataSource: () => FRUITS,
    getKey: () => "key",
    getTextValue: () => "textValue",
    getDisabled: () => (data: Fruit) => disabledKeys.has(data.key),
    selectionMode: () => (paramString("mode") || "multiple") as SelectionMode,
    defaultSelectedKeys: () => initialKeys,
  });

  const snapshot = () => ({
    keys: keysOf(list.collection().getKeys()),
    size: list.collection().getSize(),
    at1: list.collection().at(1)?.key ?? null,
    first: list.collection().getFirstKey() ?? null,
    last: list.collection().getLastKey() ?? null,
    itemCount: getItemCount(list.collection()),
    selected: keysOf(list.selectionManager().selectedKeys()),
    focusedKey: list.selectionManager().focusedKey() ?? null,
  });

  const run = (action: string) => {
    switch (action) {
      case "toggle":
        list.selectionManager().toggleSelection(
          paramString("target") || "banana",
        );
        break;
      case "focus-date":
        list.selectionManager().setFocusedKey("date");
        break;
    }

    report(snapshot());
  };

  return (
    <Stage>
      {["toggle", "focus-date", "snapshot"].map((action) => (
        <Row
          id={`action-${action}`}
          label={action}
          onPress={() => run(action)}
        />
      ))}
      <Text>{keysOf(list.collection().getKeys()).join(",")}</Text>
    </Stage>
  );
}

/* ---- buildNodes / ListCollection -------------------------------------------- */

function CollectionCase() {
  const report = probe("result");

  const sectioned = [
    { key: "fruits", textValue: "Fruits", children: FRUITS.slice(0, 2) },
    { key: "others", textValue: "Others", children: FRUITS.slice(2, 4) },
  ];

  const nodes = buildNodes({
    dataSource: sectioned,
    getKey: "key",
    getTextValue: "textValue",
    getSectionChildren: "children",
  });

  const flat = buildNodes({ dataSource: ["one", "two", 3] });
  const collection = new ListCollection(nodes);

  // A second, independent collection: the count cache must key off the
  // collection it was computed for, not the first one.
  const otherCollection = new ListCollection(
    buildNodes({ dataSource: FRUITS.slice(0, 2), getKey: "key" }),
  );

  // A section without a key in its data gets a generated one; an item may
  // legitimately carry that very string, so the generated key must move aside.
  const keyless = [
    { textValue: "No key", children: [{ key: "x", textValue: "X" }] },
    { key: "\u0000nsh-section:0:0", textValue: "Collision" },
  ];
  const colliding = buildNodes({
    dataSource: keyless,
    getKey: "key",
    getTextValue: "textValue",
    getSectionChildren: "children",
  });

  const run = () => {
    report({
      nodes: nodes.map((node) => ({
        type: node.type,
        key: node.key,
        textValue: node.textValue,
        level: node.level,
        index: node.index,
      })),
      sectionedSize: collection.getSize(),
      first: collection.getFirstKey() ?? null,
      last: collection.getLastKey() ?? null,
      afterFruits: collection.getKeyAfter("fruits") ?? null,
      beforeOthers: collection.getKeyBefore("others") ?? null,
      atTwo: collection.at(2)?.key ?? null,
      chain: (() => {
        const keys: string[] = [];
        let key = collection.getFirstKey();
        while (key != null) {
          keys.push(key);
          key = collection.getKeyAfter(key);
        }
        return keys;
      })(),
      indexes: [...collection]
        .filter((node) => node.type === "item")
        .map((node) => `${node.key}:${node.index}`),
      disabled: [...collection]
        .filter((node) => node.type === "item")
        .map((node) => `${node.key}:${node.disabled}`),
      sectionCount: getItemCount(collection),
      otherCount: getItemCount(otherCollection),
      otherSize: otherCollection.getSize(),
      sectionCountAfterOther: getItemCount(collection),
      collidingKeys: colliding.map((node) => `${node.type}:${node.key}`),
      flat: flat.map((node) => ({
        type: node.type,
        key: node.key,
        textValue: node.textValue,
      })),
    });
  };

  return (
    <Stage>
      <Row id="action-run" label="run" onPress={run} />
      <Text>{`${nodes.length}`}</Text>
    </Stage>
  );
}

/* ---- createSelectableItem --------------------------------------------------- */

function SelectableItemCase() {
  const mode = (paramString("mode") || "multiple") as SelectionMode;
  const behavior = (paramString("behavior") || "toggle") as SelectionBehavior;
  const disallowEmpty = paramFlag("disallowEmpty");
  const pointerType = paramString("pointerType") || "";
  const target = paramString("target") || "banana";
  const disabledSignal = signal(paramFlag("disabled"));
  const initialKeys = paramList("selected");
  const virtualFocus = paramFlag("virtualFocus");
  const pressUp = paramFlag("pressUp");
  const disabledBehavior = paramString("disabledBehavior") === "selection"
    ? "selection"
    : "all";

  const report = probe("result");
  const reportAction = probe("action");
  const reportSelection = probe("selection");

  const list = createListState({
    dataSource: () => FRUITS,
    getKey: () => "key",
    getTextValue: () => "textValue",
    selectionMode: () => mode,
    selectionBehavior: () => behavior,
    disallowEmptySelection: () => disallowEmpty,
    disabledBehavior: () => disabledBehavior,
    defaultSelectedKeys: () => initialKeys,
    onSelectionChange: (keys) =>
      reportSelection(keys === "all" ? ["all"] : keysOf(keys)),
  });

  const item = createSelectableItem({
    selectionManager: list.selectionManager,
    key: () => target,
    disabled: () => disabledSignal(),
    shouldUseVirtualFocus: () => virtualFocus,
    shouldSelectOnPressUp: () => pressUp,
    pointerType: () =>
      pointerType === "touch"
        ? "touch"
        : pointerType === "pen"
          ? "pen"
          : pointerType === "mouse"
            ? "mouse"
            : undefined,
    onAction: () => reportAction(target),
  });

  const snapshot = () => {
    const manager = list.selectionManager();
    return {
      selected: keysOf(manager.selectedKeys()),
      focusedKey: manager.focusedKey() ?? null,
      isFocused: manager.isFocused(),
      itemSelected: item.isSelected(),
      itemDisabled: item.isDisabled(),
      itemAllowsSelection: item.allowsSelection(),
      itemFocusable: item.focusable(),
      itemIsFocused: item.isFocused(),
    };
  };

  const pointerEvent = (
    modifiers: Partial<PressEvent["modifiers"]> = {},
  ): PressEvent => ({
    position: { x: 4, y: 4 },
    pagePosition: { x: 40, y: 40 },
    modifiers: {
      control: false,
      alt: false,
      shift: false,
      platform: false,
      ...modifiers,
    },
    clickCount: 1,
  });

  const keyboardEvent = (
    modifiers: Partial<PressEvent["modifiers"]> = {},
  ): PressEvent => ({
    position: { x: 0, y: 0 },
    pagePosition: { x: 0, y: 0 },
    modifiers: {
      control: false,
      alt: false,
      shift: false,
      platform: false,
      ...modifiers,
    },
    clickCount: 1,
  });

  const pointerPress = (modifiers: Partial<PressEvent["modifiers"]> = {}) => {
    const event = pointerEvent(modifiers);
    item.onPressDown(event);
    item.onPressUp(event);
    item.onPress(event);
  };

  const run = (action: string) => {
    switch (action) {
      case "press":
        pointerPress();
        break;
      case "press-down":
        item.onPressDown(pointerEvent());
        break;
      case "press-up":
        item.onPressUp(pointerEvent());
        break;
      case "press-keyboard":
        item.onPress(keyboardEvent());
        break;
      case "press-keyboard-alt":
        item.onPress(keyboardEvent({ alt: true }));
        break;
      case "press-shift":
        pointerPress({ shift: true });
        break;
      case "press-ctrl":
        pointerPress({ control: true });
        break;
      case "press-meta":
        pointerPress({ platform: true });
        break;
      case "enter":
        item.onKeyDown("enter");
        break;
      case "space":
        item.onKeyDown("space");
        break;
      case "ctrl-enter":
        item.onKeyDown("enter", { control: true });
        break;
      case "focus":
        item.onFocus();
        break;
      case "disable":
        disabledSignal.set(true);
        break;
      case "blur":
        item.onBlur();
        break;
    }

    report(snapshot());
  };

  return (
    <Stage>
      {[
        "press",
        "press-down",
        "press-up",
        "press-keyboard",
        "press-keyboard-alt",
        "press-shift",
        "press-ctrl",
        "press-meta",
        "enter",
        "space",
        "ctrl-enter",
        "focus",
        "disable",
        "blur",
        "snapshot",
      ].map((action) => (
        <Row
          id={`action-${action}`}
          label={action}
          onPress={() => run(action)}
        />
      ))}
      <Text>{target}</Text>
    </Stage>
  );
}

/* ---- createSelectableList: a real list on the NSH engine -------------------- */

function ListRow(props: {
  itemKey: string;
  textValue: string;
  disabled: boolean;
  manager: Accessor<MultipleSelectionManager>;
  list: SelectableListState;
  sectionKey?: string;
}) {
  const item = createSelectableItem({
    selectionManager: props.manager,
    key: () => props.itemKey,
    disabled: () => props.disabled,
  });

  let element: ViewRef | undefined;

  effect(() => {
    if (item.isFocused()) {
      element?.focus();
    }
  });

  cleanup(() => props.list.unregisterItemLayout(props.itemKey));

  return (
    <View
      testID={`row-${props.itemKey}`}
      role="option"
      accessibilityState={{ selected: item.isSelected(), disabled: item.isDisabled() }}
      focusable={item.focusable()}
      disabled={item.isDisabled()}
      onPressDown={item.onPressDown}
      onPressUp={item.onPressUp}
      onPress={item.onPress}
      onFocus={() => {
        probe("row-focus")(props.itemKey);
        item.onFocus();
      }}
      onBlur={() => {
        probe("row-blur")(props.itemKey);
        item.onBlur();
      }}
      onLayout={(e: { bounds: Bounds }) => {
        props.list.registerItemLayout(props.itemKey, e.bounds, props.sectionKey);
        probe("item-layout")(props.itemKey);
      }}
      ref={(node: ViewRef) => {
        element = node;
      }}
      class="h-10 flex-row items-center px-3"
    >
      <Text>{props.textValue}</Text>
    </View>
  );
}

function SelectableListCase() {
  const mode = (paramString("mode") || "multiple") as SelectionMode;
  const behavior = (paramString("behavior") || "replace") as SelectionBehavior;
  const wrap = paramFlag("wrap");
  const disallowEmpty = paramFlag("disallowEmpty");
  const selectOnFocusParam = host.params.selectOnFocus;
  const selectOnFocus =
    selectOnFocusParam === undefined
      ? undefined
      : selectOnFocusParam === true || selectOnFocusParam === "1";
  const autoFocusParam = paramString("autoFocus");
  const autoFocus =
    autoFocusParam === "first" || autoFocusParam === "last"
      ? autoFocusParam
      : autoFocusParam === "container"
        ? true
        : undefined;
  const disabledKeys = new Set(paramList("disabled"));
  const initialKeys = paramList("selected");
  const disabledBehavior = paramString("disabledBehavior") === "selection"
    ? "selection"
    : "all";

  const reportState = probe("state");
  const reportSelection = probe("selection");
  const reportScroll = probe("scroll");

  const list = createListState({
    dataSource: () => FRUITS,
    getKey: () => "key",
    getTextValue: () => "textValue",
    getDisabled: () => (data: Fruit) => disabledKeys.has(data.key),
    selectionMode: () => mode,
    selectionBehavior: () => behavior,
    disallowEmptySelection: () => disallowEmpty,
    disabledBehavior: () => disabledBehavior,
    defaultSelectedKeys: () => initialKeys,
    onSelectionChange: (keys) =>
      reportSelection(keys === "all" ? ["all"] : keysOf(keys)),
  });

  const collection = createSelectableList({
    collection: list.collection,
    selectionManager: list.selectionManager,
    shouldFocusWrap: () => wrap,
    disallowEmptySelection: () => disallowEmpty,
    disallowTypeAhead: () => paramFlag("disallowTypeAhead"),
    disallowSelectAll: () => paramFlag("disallowSelectAll"),
    selectOnFocus: () => selectOnFocus ?? behavior === "replace",
    autoFocus: () => autoFocus,
    orientation: () =>
      paramString("orientation") === "horizontal" ? "horizontal" : "vertical",
    scrollToItem: (key) => reportScroll(key),
    focusCollection: () => container?.focus(),
    enterFrom: () => (paramString("enterFrom") === "end" ? "end" : "start"),
  });

  let container: ViewRef | undefined;

  effect(() => {
    const manager = list.selectionManager();
    reportState({
      selected: keysOf(manager.selectedKeys()),
      focusedKey: manager.focusedKey() ?? null,
      isFocused: manager.isFocused(),
    });
  });

  // NSH has no key event on a view. The keys are bound only while this list
  // has the focus, so a second list or a text field keeps its own keys.
  const bindings: Record<string, () => void> = {
    down: () => collection.onKeyDown("down"),
    up: () => collection.onKeyDown("up"),
    home: () => collection.onKeyDown("home"),
    end: () => collection.onKeyDown("end"),
    pageup: () => collection.onKeyDown("pageup"),
    pagedown: () => collection.onKeyDown("pagedown"),
    left: () => collection.onKeyDown("left"),
    right: () => collection.onKeyDown("right"),
    a: () => collection.onKeyDown("a"),
    b: () => collection.onKeyDown("b"),
    c: () => collection.onKeyDown("c"),
    d: () => collection.onKeyDown("d"),
    l: () => collection.onKeyDown("l"),
    "ctrl+a": () => collection.onKeyDown("a", { control: true }),
    "shift+down": () => collection.onKeyDown("down", { shift: true }),
    escape: () => collection.onKeyDown("escape"),
  };

  createKeymapScope({
    isActive: () => list.selectionManager().isFocused(),
    bindings,
  });

  return (
    <Stage>
      <Row
        id="focus-container"
        label="focus container"
        onPress={() => container?.focus()}
      />
      <View
        testID="list"
        role="listbox"
        focusable={collection.focusable()}
        onFocus={collection.onFocusIn}
        onBlur={collection.onFocusOut}
        onLayout={(e: { bounds: Bounds }) => {
          collection.registerContainerLayout(e.bounds);
          probe("container-layout")(e.bounds.size.height);
        }}
        ref={(node: ViewRef) => {
          container = node;
        }}
        class="h-40 w-64 flex-col border border-border"
      >
        <Each of={FRUITS} key={(fruit) => fruit.key}>
          {(fruit) => (
            <ListRow
              itemKey={fruit().key}
              textValue={fruit().textValue}
              disabled={disabledKeys.has(fruit().key)}
              manager={list.selectionManager}
              list={collection}
            />
          )}
        </Each>
      </View>
    </Stage>
  );
}

/* ---- sections: frames in two coordinate spaces ------------------------------ */

const SECTIONS = [
  {
    key: "a",
    textValue: "Section A",
    children: [
      { key: "a1", textValue: "A1" },
      { key: "a2", textValue: "A2" },
      { key: "a3", textValue: "A3" },
    ],
  },
  {
    key: "b",
    textValue: "Section B",
    children: [
      { key: "b1", textValue: "B1" },
      { key: "b2", textValue: "B2" },
      { key: "b3", textValue: "B3" },
    ],
  },
];

function SectionView(props: {
  section: { key: string; textValue: string; children: Fruit[] };
  manager: Accessor<MultipleSelectionManager>;
  list: SelectableListState;
}) {
  let element: ViewRef | undefined;

  cleanup(() => props.list.unregisterSectionLayout(props.section.key));

  return (
    <View
      testID={`section-${props.section.key}`}
      role="group"
      onLayout={(e: { bounds: Bounds }) => {
        props.list.registerSectionLayout(props.section.key, e.bounds);
        probe("section-layout")(props.section.key);
      }}
      ref={(node: ViewRef) => {
        element = node;
      }}
      class="flex-col"
    >
      <Each of={props.section.children} key={(fruit) => fruit.key}>
        {(fruit) => (
          <ListRow
            itemKey={fruit().key}
            textValue={fruit().textValue}
            disabled={false}
            manager={props.manager}
            list={props.list}
            sectionKey={props.section.key}
          />
        )}
      </Each>
    </View>
  );
}

function SectionedListCase() {
  const list = createListState({
    dataSource: () => SECTIONS,
    getKey: () => "key",
    getTextValue: () => "textValue",
    getSectionChildren: () => "children",
    selectionMode: () => "multiple",
    selectionBehavior: () => "toggle",
  });

  const collection = createSelectableList({
    collection: list.collection,
    selectionManager: list.selectionManager,
    shouldFocusWrap: () => false,
    focusCollection: () => container?.focus(),
  });

  let container: ViewRef | undefined;

  effect(() => {
    const manager = list.selectionManager();
    probe("state")({
      selected: keysOf(manager.selectedKeys()),
      focusedKey: manager.focusedKey() ?? null,
      isFocused: manager.isFocused(),
    });
  });

  createKeymapScope({
    isActive: () => list.selectionManager().isFocused(),
    bindings: {
      home: () => collection.onKeyDown("home"),
      end: () => collection.onKeyDown("end"),
      pageup: () => collection.onKeyDown("pageup"),
      pagedown: () => collection.onKeyDown("pagedown"),
    },
  });

  return (
    <Stage>
      <Row
        id="focus-container"
        label="focus container"
        onPress={() => container?.focus()}
      />
      <View
        testID="sections"
        role="listbox"
        focusable={collection.focusable()}
        onFocus={collection.onFocusIn}
        onBlur={collection.onFocusOut}
        onLayout={(e: { bounds: Bounds }) => {
          collection.registerContainerLayout(e.bounds);
          probe("container-layout")(e.bounds.size.height);
        }}
        ref={(node: ViewRef) => {
          container = node;
        }}
        class="h-40 w-64 flex-col"
      >
        <Each of={SECTIONS} key={(section) => section.key}>
          {(section) => (
            <SectionView
              section={section()}
              manager={list.selectionManager}
              list={collection}
            />
          )}
        </Each>
      </View>
    </Stage>
  );
}

/* ---- keymap ownership: two lists and a text field --------------------------- */

function ScopedList(props: {
  id: string;
  autoFocus: boolean;
  onReady: (focus: () => void) => void;
}) {
  const list = createListState({
    dataSource: () => FRUITS.slice(0, 3),
    getKey: () => "key",
    getTextValue: () => "textValue",
    selectionMode: () => "multiple",
    selectionBehavior: () => "toggle",
  });

  const collection = createSelectableList({
    collection: list.collection,
    selectionManager: list.selectionManager,
    autoFocus: () => props.autoFocus,
    focusCollection: () => container?.focus(),
  });

  let container: ViewRef | undefined;

  effect(() => {
    const manager = list.selectionManager();
    probe("state")({
      id: props.id,
      focusedKey: manager.focusedKey() ?? null,
      isFocused: manager.isFocused(),
    });
  });

  effect(() => {
    props.onReady(() => container?.focus());
  });

  createKeymapScope({
    isActive: () => list.selectionManager().isFocused(),
    bindings: {
      down: () => collection.onKeyDown("down"),
      b: () => collection.onKeyDown("b"),
    },
  });

  return (
    <View
      testID={`list-${props.id}`}
      role="listbox"
      focusable={collection.focusable()}
      onFocus={collection.onFocusIn}
      onBlur={collection.onFocusOut}
      ref={(node: ViewRef) => {
        container = node;
      }}
      class="h-32 w-48 flex-col border border-border"
    >
      <Each of={FRUITS.slice(0, 3)} key={(fruit) => fruit.key}>
        {(fruit) => (
          <ListRow
            itemKey={fruit().key}
            textValue={fruit().textValue}
            disabled={false}
            manager={list.selectionManager}
            list={collection}
          />
        )}
      </Each>
    </View>
  );
}

function KeymapScopeCase() {
  const focusers: Record<string, (() => void) | undefined> = {};

  return (
    <Stage>
      <Row
        id="focus-a"
        label="focus a"
        onPress={() => focusers.a?.()}
      />
      <Row
        id="focus-b"
        label="focus b"
        onPress={() => focusers.b?.()}
      />
      <Input
        testID="field"
        accessibilityLabel="field"
        onKeyPress={(e: { key: string }) => probe("keypress")(e.key)}
      />
      <ScopedList
        id="a"
        autoFocus
        onReady={(focus) => {
          focusers.a = focus;
        }}
      />
      <ScopedList
        id="b"
        autoFocus={false}
        onReady={(focus) => {
          focusers.b = focus;
        }}
      />
    </Stage>
  );
}

const selectionPrimitiveCases: Record<string, Component> = {
  "primitives/selection": MultipleSelectionCase,
  "primitives/list": ListStateCase,
  "primitives/collection": CollectionCase,
  "primitives/selectable-item": SelectableItemCase,
  "primitives/selectable-list": SelectableListCase,
  "primitives/selectable-sections": SectionedListCase,
  "primitives/keymap-scope": KeymapScopeCase,
};

/* -------------------------------------------------------------------------------------------------
 * Registration
 * -----------------------------------------------------------------------------------------------*/

export const primitivesScenarios = {
  "primitives/controllable-signal": ControllableSignalScenario,
  "primitives/toggle-state": ToggleStateScenario,
  "primitives/disclosure-state": DisclosureStateScenario,
  "primitives/interaction-modality": InteractionModalityScenario,
  "v4/events": V4Scenario,
  ...selectionPrimitiveCases,
};
