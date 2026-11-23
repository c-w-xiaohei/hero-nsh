import { effect, host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Dialog } from "nsh/base";
import {
  Button,
  ComboBox,
  ComboBoxContext,
  Description,
  EnvironmentScope,
  FieldError,
  Input,
  Label,
  ListBox,
  PressableFeedbackContext,
  TextFieldContext,
} from "@heroui/react";
import type {
  EnvironmentDensity,
  EnvironmentInput,
  EnvironmentWidth,
} from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only ComboBox fixtures (port sheet 4b). Shared scenes cannot carry the
 * probes, the fixed controlled state or the outside press these cases need, so
 * every entry is a named case selected with `host.params.case`.
 *
 * Markers, following the port sheet's tester contract:
 *   - the row label gets a `*` suffix while the row holds the list's virtual
 *     focus, so `role:option[Dog] >> text:Dog*` identifies the highlighted row
 *     (NSH has no activeElement query; the input keeps the real focus);
 *   - `ListBox.ItemIndicator` renders `✓` for a selected row, so
 *     `role:listbox >> text:✓` counts the selection;
 *   - the input records onFocus / onBlur and the trigger its own, which is how
 *     "focus is back on the input" is read (`toHaveFocus` has no query).
 *
 * `aria-label` on every row keeps the accessible name stable while the marker
 * moves, so `role:option[Two]` still names the same row after focus changes.
 *
 * Cases:
 *   log               Cat / Dog / Panda, Label Favorite Animal (T-001 … T-003, T-039 …)
 *   default-key       the same with defaultValue "cat" (T-005, T-031)
 *   controlled-key    One / Two / Three, value "2", records only (T-044)
 *   default-two       One / Two / Three, defaultValue "2" (T-045, T-047)
 *   manual            One / Two / Three, menuTrigger "manual" (T-022 … T-026, T-029)
 *   multiple-log      multiple, empty, Value (T-048)
 *   multiple-default  multiple, defaultValue {"1","2"}, Value (T-049, T-051)
 *   multiple-controlled  multiple, value {"1","2"}, Value (T-050)
 *   disabled          root isDisabled (T-004, T-055, T-056)
 *   disabled-keys     root disabledKeys {"2"} (T-046)
 *   invalid           Label + Description + FieldError (T-006)
 *   error-message     Label + Description + FieldError "ErrorMessage" (T-038)
 *   label-description Label + placeholder Placeholder + Description (T-013, T-034, T-037)
 *   custom-indicator  Trigger with a Text child (screenshots / R-019)
 *   custom-value      allowsCustomValue (section 2 commits)
 *   filter-contains   Apple / Banana / Blueberry / Grapes / Pineapple (T-059)
 *   filter-custom     defaultFilter matches the prefix only
 *   items             items on the root + function children + Value
 *   default-items     defaultItems on the root + function children
 *   empty             typing to an empty collection closes the popover
 *   no-items      an empty items collection (X-004)
 *   no-items-allowed  the same with allowsEmptyCollection (X-005)
 *   read-only         isReadOnly: no typing and no menu (X-009)
 *   wrap              shouldFocusWrap on the root (X-008)
 *   tab-handoff       two comboboxes and a Submit button (T-010)
 *   items-40          forty rows and a Continue button (T-012)
 *   outside           the animals plus an outside view above the field (T-030)
 *   modal             a ComboBox inside an open nsh/base Dialog (T-011)
 *   b-mobile           the mobile probes: `cb` carrier, `ctx` seam reads,
 *                      `trigger-box` bounds, `focusedKey`, `fieldCtx`
 *   b-exit             ownsState `isOpen` + `isExiting`/`shouldSkipAnimation`
 *                      driven by host.send (M-014's presence sample)
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 */

/* -------------------------------------------------------------------------------------------------
 * Mobile layer (adapt sheet A-012)
 *
 * `host.params.input` / `width` / `density` inject an `EnvironmentScope`
 * over the whole app (absent = the host's own environment). The scope always
 * mounts, wrapping every case — a bare fragment broke the popover unit's
 * exit-hold unmount (measured there; the provider is harmless when every
 * field is absent).
 *
 * `host.params.presentation` ∈ "auto"|"panel"|"sheet" pins the Popover's
 * carrier; `modal="1"` passes `isNonModal={false}` (this component's default
 * is the non-modal half, so "open modal" is the half that needs a param);
 * `hide=<key>` gates that row of the `items` path behind `<If>` so it never
 * mounts (the F-consumption regression); `kt`/`rtk`/`ekh`/`im`/`mask` feed
 * the caller `Input`'s `keyboardType`/`returnKeyType`/`enterKeyHint`/
 * `inputMode`/`masked` (the G channel).
 *
 * Case `b-mobile`: the `Combo` plus the probes the mobile assertions read —
 * `trigger-box` (the Trigger's `onLayout` bounds, the only observable input
 * to the hitSlop formula), `cb` on the Popover (which derives `id:cb-panel`
 * / `id:cb-sheet` on the mounted carrier), the `ctx`/`ctx-pressed`/
 * `ctx-channels` seam reads (`CtxProbe` samples `PressableFeedbackContext`,
 * `host.send("ctx.sample")` samples on demand), and `focusedKey` (the
 * virtual-focus key, read off `ComboBoxContext`).
 * -----------------------------------------------------------------------------------------------*/

function param(name: string): string {
  return String(host.params[name] ?? "");
}

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

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A full bounds box: parent-relative origin and size, for geometry probes. */
function boxProbe(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

/** The live `PressableFeedbackContext` of the mounted trigger seam. */
let triggerCtx: ReturnType<typeof PressableFeedbackContext> | null = null;

/** Reports the trigger seam's environment half the moment it changes. */
function CtxProbe() {
  const ctx = PressableFeedbackContext();
  const report = probe("ctx");
  const reportPressed = probe("ctx-pressed");

  effect(() => {
    triggerCtx = ctx;
  });

  effect(() => {
    report({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
    });
  });

  effect(() => {
    reportPressed({ seam: ctx.isPressed() });
  });

  return <Text>{ctx.isPressed() ? "seam-pressed" : "seam-idle"}</Text>;
}

/* On-demand channel read for the negative half: a gated press never raises
 * the seam's `isPressed` edge, so `ctx-pressed` alone cannot prove the
 * channels stayed at rest — `ctx-sample` samples them after the press.
 * Driven by `host.send("ctx.sample")` (registered below): a plain View
 * `onPress` trigger resolved on web without firing, and a host event is
 * target-independent. */
function sampleChannels() {
  const report = probe("ctx-channels");
  const c = triggerCtx;
  if (c === null) {
    return;
  }
  void c.pressed.getValue().then((pressed) => {
    void c.scale.getValue().then((scale) => {
      report({
        seamPressed: c.isPressed(),
        pressed,
        scale,
        origin: c.pressOrigin(),
        hitSlop: c.hitSlop() ?? null,
        bounds: c.bounds(),
        enabled: c.enabled(),
      });
    });
  });
}

/** Reports `focusedKey`, the list's virtual-focus key, on every change. */
function FocusedKeyProbe() {
  const combo = ComboBoxContext();
  const report = probe("focusedKey");

  effect(() => {
    report(combo?.focusedKey() ?? null);
  });

  return null;
}

/* Reports the field context's keyboard-facing accessors — the G channel's
 * readback half (M-010): the Root's `autoComplete` prop lands on
 * `TextFieldContext.autoComplete`, and the caller `Input`'s own
 * `enterKeyHint`/`inputMode` resolve through the same context when the field
 * does not set them. */
function FieldCtxProbe() {
  const field = TextFieldContext();
  const report = probe("fieldCtx");

  effect(() => {
    report({
      autoComplete: field?.autoComplete() ?? null,
      inputMode: field?.inputMode() ?? null,
      enterKeyHint: field?.enterKeyHint() ?? null,
    });
  });

  return null;
}

type ItemData = { id: string; name: string };

const PETS: ItemData[] = [
  { id: "cat", name: "Cat" },
  { id: "dog", name: "Dog" },
  { id: "panda", name: "Panda" },
];

const ITEMS: ItemData[] = [
  { id: "1", name: "One" },
  { id: "2", name: "Two" },
  { id: "3", name: "Three" },
];

const FRUIT: ItemData[] = [
  { id: "Apple", name: "Apple" },
  { id: "Banana", name: "Banana" },
  { id: "Blueberry", name: "Blueberry" },
  { id: "Grapes", name: "Grapes" },
  { id: "Pineapple", name: "Pineapple" },
];

const FORTY: ItemData[] = Array.from({ length: 40 }, (_, index) => ({
  id: `animal-${index}`,
  name: `Animal ${index}`,
}));

/** A single key, or a list of keys, as JSON, so the probe payload stays readable. */
function normalizeSelection(value: unknown, multiple: boolean): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (multiple) {
    return Array.isArray(value)
      ? value.map(String)
      : Array.from(value as Iterable<unknown>).map(String);
  }

  return String(value);
}

/* -------------------------------------------------------------------------------------------------
 * Rows
 * -----------------------------------------------------------------------------------------------*/

function Row(props: { item: ItemData }) {
  return (
    <ListBox.Item
      id={props.item.id}
      textValue={props.item.name}
      aria-label={props.item.name}
      onLayout={boxProbe(`row-${props.item.id}`)}
    >
      {(values) => [
        <Text>{values.isFocused() ? `${props.item.name}*` : props.item.name}</Text>,
        <ListBox.ItemIndicator>
          {(indicator) => <Text>{indicator.isSelected() ? "✓" : ""}</Text>}
        </ListBox.ItemIndicator>,
      ]}
    </ListBox.Item>
  );
}

/* -------------------------------------------------------------------------------------------------
 * A ComboBox case
 * -----------------------------------------------------------------------------------------------*/

type ComboProps = {
  items: ItemData[];
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  defaultKey?: string;
  valueKey?: string;
  defaultKeys?: string[];
  values?: string[];
  disabledKeys?: string[];
  menuTrigger?: "focus" | "input" | "manual";
  allowsCustomValue?: boolean;
  allowsEmpty?: boolean;
  readOnly?: boolean;
  shouldFocusWrap?: boolean;
  defaultFilter?: (text: string, inputValue: string) => boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  customIndicator?: boolean;
  showValue?: boolean;
  itemsProp?: boolean;
  defaultItems?: boolean;
  outside?: boolean;
  /** Mounts the `b-mobile` probes (`ctx`, `trigger-box`, `cb`, `focusedKey`). */
  bMobile?: boolean;
};

function Combo(props: ComboProps) {
  // Mobile params: `presentation` pins the carrier, `modal`="1" opens the
  // modal half (`isNonModal={false}` — the component default is non-modal),
  // `hide` keeps that row of the `items` path from ever mounting (the
  // F-consumption regression).
  const presentation = () =>
    param("presentation") === ""
      ? undefined
      : (param("presentation") as "auto" | "panel" | "sheet");
  const modal = () => param("modal") === "1";
  const hidden = signal<string[]>(param("hide") === "" ? [] : [param("hide")]);
  // More mobile params (M-009/M-010/M-014): `mt` fills the root's
  // `menuTrigger` when the case does not set one, `ac`/`selkey` feed the
  // deprecated-spelling halves of the selection contract, `kb` gates the
  // panel's Escape channel and `own` gives the Popover its own open state.
  const menuTrigger = () =>
    props.menuTrigger ??
    (param("mt") === ""
      ? undefined
      : (param("mt") as "focus" | "input" | "manual"));
  const own = () => param("own") === "1";

  return (
    <View class="w-[256px] items-start gap-2">
      {/* Above the field, so the press target stays outside the popover rectangle. */}
      {props.outside ? (
        <View testID="outside" role="button" onPress={() => undefined}>
          <Text>Outside</Text>
        </View>
      ) : null}
      <ComboBox
        className="w-[256px]"
        selectionMode={props.multiple ? "multiple" : "single"}
        isDisabled={props.disabled}
        isInvalid={props.invalid}
        disabledKeys={props.disabledKeys}
        menuTrigger={menuTrigger()}
        allowsCustomValue={props.allowsCustomValue}
        allowsEmptyCollection={props.allowsEmpty}
        defaultFilter={props.defaultFilter}
        isReadOnly={props.readOnly}
        shouldFocusWrap={props.shouldFocusWrap}
        autoComplete={param("ac") === "" ? undefined : param("ac")}
        selectedKey={param("selkey") === "" ? undefined : param("selkey")}
        items={props.itemsProp ? props.items : undefined}
        defaultItems={props.defaultItems ? props.items : undefined}
        defaultValue={props.multiple ? props.defaultKeys : props.defaultKey}
        value={props.multiple ? props.values : props.valueKey}
        inputValue={props.inputValue}
        onInputChange={(value: string) => {
          probe("inputChange")(value);
          props.onInputChange?.(value);
        }}
        onChange={(value: unknown) => probe("change")(normalizeSelection(value, props.multiple === true))}
        onSelectionChange={(value: unknown) =>
          probe("selectionChange")(normalizeSelection(value, props.multiple === true))
        }
        onOpenChange={(...args: unknown[]) => probe("openChange")(...args)}
        onFocusChange={(value: boolean) => probe("focusChange")(value)}
      >
        {props.bMobile ? <FocusedKeyProbe /> : null}
        {props.bMobile ? <FieldCtxProbe /> : null}
        <Label>{props.label ?? "Favorite Animal"}</Label>
        <ComboBox.InputGroup>
          <Input
            testID="combo-box-input"
            placeholder={props.placeholder ?? "Search animals..."}
            keyboardType={host.params.kt === undefined ? undefined : (param("kt") as never)}
            returnKeyType={host.params.rtk === undefined ? undefined : (param("rtk") as never)}
            enterKeyHint={host.params.ekh === undefined ? undefined : (param("ekh") as never)}
            inputMode={host.params.im === undefined ? undefined : (param("im") as never)}
            masked={param("mask") === "1" ? true : undefined}
            autoCorrect={param("acorr") === "" ? undefined : param("acorr")}
            autoCapitalize={param("acap") === "" ? undefined : param("acap")}
            submitBehavior={
              param("sb") === ""
                ? undefined
                : (param("sb") as "submit" | "blurAndSubmit" | "newline")
            }
            onFocus={probe("inputFocus")}
            onBlur={probe("inputBlur")}
          />
          <ComboBox.Trigger
            testID="combo-box-trigger"
            onFocus={probe("triggerFocus")}
            onBlur={probe("triggerBlur")}
            onPress={probe("triggerPress")}
            onPressChange={probe("triggerPressChange")}
            onPressStart={probe("triggerPressStart")}
            onPressUp={probe("triggerPressUp")}
            onPressEnd={probe("triggerPressEnd")}
            onLayout={props.bMobile ? boxProbe("trigger-box") : undefined}
          >
            {props.bMobile ? <CtxProbe /> : undefined}
            {props.customIndicator ? <Text>⇅</Text> : undefined}
          </ComboBox.Trigger>
        </ComboBox.InputGroup>
        {props.showValue ? <ComboBox.Value placeholder="No animals selected" /> : null}
        <ComboBox.Popover
          testID={props.bMobile ? "cb" : undefined}
          presentation={presentation()}
          isNonModal={modal() ? false : undefined}
          isKeyboardDismissDisabled={param("kb") === "1" || undefined}
          defaultOpen={own() || undefined}
          onOpenChange={
            own() ? (value: boolean) => probe("ownOpenChange")(value) : undefined
          }
        >
          <ListBox>
            {props.itemsProp || props.defaultItems
              ? (item: ItemData) =>
                  hidden().includes(item.id) ? null : <Row item={item} />
              : props.items.map((item) =>
                  hidden().includes(item.id) ? null : <Row item={item} />,
                )}
          </ListBox>
        </ComboBox.Popover>
        {props.description ? <Description>{props.description}</Description> : null}
        {props.error ? <FieldError>{props.error}</FieldError> : null}
      </ComboBox>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Cases that place more than one ComboBox
 * -----------------------------------------------------------------------------------------------*/

function TabHandoffCase() {
  return (
    <View class="w-64 items-start gap-4 p-4">
      <ComboBox className="w-[256px]">
        <Label>First Animal</Label>
        <ComboBox.InputGroup>
          <Input testID="first-input" placeholder="Search animals..." onBlur={probe("firstInputBlur")} />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {PETS.map((item) => (
              <Row item={item} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>

      <ComboBox className="w-[256px]" onChange={(value: unknown) => probe("change")(normalizeSelection(value, false))}>
        <Label>Second Animal</Label>
        <ComboBox.InputGroup>
          <Input
            testID="second-input"
            placeholder="Search animals..."
            onFocus={probe("secondInputFocus")}
            onBlur={probe("secondInputBlur")}
          />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {PETS.map((item) => (
              <Row item={item} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>

      <Button onFocus={probe("submitFocus")}>Submit</Button>
    </View>
  );
}

function FortyCase() {
  return (
    <View class="w-64 items-start gap-4 p-4">
      <Combo items={FORTY} placeholder="Search animals..." />
      <Button onFocus={probe("submitFocus")}>Continue</Button>
    </View>
  );
}

function ModalCase() {
  const opened = signal(false);

  return (
    <View class="items-start gap-2 p-4">
      <Button onPress={() => opened.set(true)}>Open form</Button>
      <Dialog
        open={opened()}
        onOpenChange={(event: { open: boolean }) => {
          if (!event.open) {
            opened.set(false);
          }
        }}
      >
        <View class="items-start gap-2 p-4">
          <Text>Choose an animal</Text>
          <Combo items={PETS} />
          <Button onPress={() => opened.set(false)}>Done</Button>
        </View>
      </Dialog>
    </View>
  );
}

function FilterCustomCase() {
  const prefix = (text: string, inputValue: string) => {
    if (!inputValue) {
      return true;
    }

    return text.toLowerCase().startsWith(inputValue.toLowerCase());
  };

  return <Combo defaultFilter={prefix} items={PETS} placeholder="Search animals..." />;
}

function AsyncInputCase() {
  const text = signal("");

  return (
    <View class="w-[256px] items-start gap-2">
      <Combo
        allowsEmpty
        inputValue={text()}
        items={PETS}
        onInputChange={(value) => text.set(value)}
        placeholder="Type to search..."
      />
      <Text>{`input: ${text()}`}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * b-exit case (M-014's ownsState / presence sample)
 *
 * `isOpen` is controlled by `open`, so the Popover owns its state
 * (`ownsState`) and `host.send("combo.close"/"combo.reopen")` drives the
 * edges the assertions read. `hold`="1" forces `isExiting` on the close
 * edge (the retained-mount half), `skip`="1" sets `shouldSkipAnimation`
 * (the instant-unmount half); `ownOpenChange` records the popover's own
 * `onOpenChange`. An `outside` pressable sits above the field so the
 * panel's `handlePressOutside` has a target.
 * -----------------------------------------------------------------------------------------------*/

function ExitCase() {
  const skip = param("skip") === "1";
  const hold = param("hold") === "1";
  const open = signal(param("ownopen") !== "0");
  const exiting = signal(false);
  const report = probe("ownOpenChange");

  host.on("combo.close", () => {
    exiting.set(true);
    open.set(false);
  });
  host.on("combo.reopen", () => {
    open.set(true);
    exiting.set(false);
  });

  return (
    <View class="w-[256px] items-start gap-2">
      <View testID="outside" role="button" onPress={() => undefined}>
        <Text>Outside</Text>
      </View>
      <ComboBox className="w-[256px]">
        <ComboBox.InputGroup>
          <Input testID="combo-box-input" placeholder="Search animals..." />
          <ComboBox.Trigger testID="combo-box-trigger" />
        </ComboBox.InputGroup>
        <ComboBox.Popover
          isOpen={open()}
          isExiting={hold ? exiting() : undefined}
          shouldSkipAnimation={skip || undefined}
          onOpenChange={(value: boolean) => report(value)}
        >
          <ListBox>
            {PETS.map((item) => (
              <Row item={item} />
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Case selector
 * -----------------------------------------------------------------------------------------------*/

function Case() {
  const name = String(host.params.case ?? "log");

  if (name === "default-key") {
    return <Combo defaultKey="cat" items={PETS} />;
  }

  if (name === "controlled-key") {
    return <Combo items={ITEMS} label="Label" valueKey="2" />;
  }

  if (name === "default-two") {
    return <Combo defaultKey="2" items={ITEMS} label="Label" placeholder="Placeholder" />;
  }

  if (name === "manual") {
    return <Combo items={ITEMS} label="Label" menuTrigger="manual" placeholder="Placeholder" />;
  }

  if (name === "multiple-log") {
    return (
      <Combo items={ITEMS} label="Label" multiple placeholder="Placeholder" showValue />
    );
  }

  if (name === "multiple-default") {
    return (
      <Combo
        defaultKeys={["1", "2"]}
        items={ITEMS}
        label="Label"
        multiple
        placeholder="Placeholder"
        showValue
      />
    );
  }

  if (name === "multiple-controlled") {
    return (
      <Combo
        items={ITEMS}
        label="Label"
        multiple
        placeholder="Placeholder"
        showValue
        values={["1", "2"]}
      />
    );
  }

  if (name === "disabled") {
    return <Combo disabled items={PETS} />;
  }

  if (name === "disabled-keys") {
    return <Combo disabledKeys={["2"]} items={ITEMS} label="Label" placeholder="Placeholder" />;
  }

  if (name === "invalid") {
    return (
      <Combo
        description="Description"
        error="Please choose an animal"
        invalid
        items={PETS}
      />
    );
  }

  if (name === "error-message") {
    return (
      <Combo
        description="Description"
        error="ErrorMessage"
        invalid
        items={ITEMS}
        label="Label"
        placeholder="Placeholder"
      />
    );
  }

  if (name === "label-description") {
    return (
      <Combo
        description="Description"
        items={ITEMS}
        label="Label"
        placeholder="Placeholder"
      />
    );
  }

  if (name === "custom-indicator") {
    return <Combo customIndicator items={PETS} />;
  }

  if (name === "custom-value") {
    return <Combo allowsCustomValue items={PETS} outside={param("out") === "1"} />;
  }

  if (name === "filter-contains") {
    return <Combo items={FRUIT} placeholder="Search fruit..." />;
  }

  if (name === "filter-custom") {
    return <FilterCustomCase />;
  }

  if (name === "items") {
    return (
      <Combo
        bMobile={param("bm") === "1"}
        defaultKey={param("dk") === "" ? undefined : param("dk")}
        items={ITEMS}
        itemsProp
        label="Label"
        placeholder="Placeholder"
        showValue
      />
    );
  }

  if (name === "default-items") {
    return (
      <Combo defaultItems items={ITEMS} label="Label" placeholder="Placeholder" showValue />
    );
  }

  if (name === "empty") {
    return <Combo items={PETS} />;
  }

  if (name === "no-items") {
    return <Combo items={[]} />;
  }

  if (name === "no-items-allowed") {
    return <Combo allowsEmpty items={[]} />;
  }

  if (name === "read-only") {
    return <Combo items={ITEMS} label="Label" placeholder="Placeholder" readOnly />;
  }

  if (name === "wrap") {
    return <Combo items={ITEMS} label="Label" placeholder="Placeholder" shouldFocusWrap />;
  }

  if (name === "async-input") {
    return <AsyncInputCase />;
  }

  if (name === "tab-handoff") {
    return <TabHandoffCase />;
  }

  if (name === "items-40") {
    return <FortyCase />;
  }

  if (name === "outside") {
    return <Combo items={PETS} outside />;
  }

  if (name === "modal") {
    return <ModalCase />;
  }

  if (name === "b-mobile") {
    return (
      <View class="items-start gap-4 p-4">
        <Combo bMobile items={PETS} />
      </View>
    );
  }

  if (name === "b-exit") {
    return <ExitCase />;
  }

  return <Combo items={PETS} />;
}

// A-012: the `EnvironmentScope` wraps every case — absent params inherit the
// host's baseline, so the default environment keeps desktop parity.
function Fixture() {
  return (
    <Scoped>
      <Case />
    </Scoped>
  );
}

// The `ctx-channels` on-demand sample (M-002's negative half): a host event,
// not a pressable — target-independent.
host.on("ctx.sample", sampleChannels);

mount(Fixture);
