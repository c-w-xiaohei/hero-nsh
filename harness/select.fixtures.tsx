import { effect, host, mount, signal, Text, View } from "nsh";
import type { JSX } from "nsh";
import { Input } from "nsh/base";
import {
  Description,
  EnvironmentScope,
  FieldError,
  Label,
  ListBox,
  PressableFeedbackContext,
  Select,
} from "@heroui/react";
import type {
  EnvironmentDensity,
  EnvironmentInput,
  EnvironmentWidth,
  PressableFeedbackContextValue,
} from "@heroui/react";
import { SheetContentPanContext } from "../src/components/sheet/create-sheet-detent";
import { SelectCarrierContext } from "../src/components/select/select-context";
import { probe } from "@scenario/probe";

/*
 * NSH-only Select fixtures (port sheet 4b). Shared scenes cannot carry the
 * probes or the fixed controlled state these cases need, so every entry is a
 * named case selected with `host.params.case`.
 *
 * Markers, following the port sheet's tester contract:
 *   - the row label gets a `*` suffix while the row holds the list's focus, so
 *     `role:option[Two] >> text:Two*` identifies the highlighted row (the
 *     list root is the focus station; NSH has no activeElement query);
 *   - `ListBox.ItemIndicator` renders `✓` for a selected row, so
 *     `role:listbox >> text:✓` counts the selection;
 *   - the trigger records onFocus / onBlur, which is how "focus is back on the
 *     trigger" is read (`toHaveFocus` has no query).
 *
 * `aria-label` on every row keeps the accessible name stable while the marker
 * moves, so `role:option[Two]` still names the same row after focus changes.
 *
 * Cases (states = Florida / California / Texas; items = One / Two / Three):
 *   states              single, Label State, no default, official callbacks
 *   states-items        the same through `items` on ListBox (T-002)
 *   states-plain        alias callbacks (onChange), no ClearButton, no default
 *   states-plain-selected  alias, no ClearButton, default California (T-016)
 *   states-clear        alias, ClearButton, default California
 *   states-clear-empty  alias, ClearButton, empty (T-010)
 *   states-custom-icon  ClearButton with a Text child (T-013)
 *   states-default      default California, no ClearButton (T-021 … T-025)
 *   states-controlled   `value="texas"` alias, records only (T-004)
 *   states-disabled     root isDisabled, default California, ClearButton (T-005, T-011)
 *   states-trigger-disabled  Trigger isDisabled, default California, ClearButton (T-012)
 *   states-invalid      Label + Description + FieldError, isInvalid (T-006)
 *   items               single, Label Label, placeholder Placeholder (T-029 …)
 *   items-open          isOpen held true (T-045, T-050)
 *   items-default-open  defaultOpen (T-046, T-051)
 *   items-default-two   defaultSelectedKey "2" (T-066, T-069)
 *   items-disallow-empty  default "2" + disallowEmptySelection (T-069)
 *   items-controlled    selectedKey "2" held (T-064)
 *   items-controlled-clear  a parent-owned "2" that ignores selection changes but
 *                       honors the clear (T-065)
 *   items-disabled-keys root disabledKeys ["2"] (T-067)
 *   items-multiple      multiple, empty (T-071, T-074)
 *   items-multiple-default  multiple, default {"1","2"} (T-072, T-075)
 *   items-multiple-controlled  multiple, selectedKeys {"1","2"} (T-073)
 *   items-four          One … Four (T-068, T-076 … T-078)
 *   items-disabled      root isDisabled (T-082, T-083)
 *   items-aria-label    aria-label="foo", no visible Label (T-054)
 *   items-description   Label + Description (T-057)
 *   items-invalid       Label + FieldError, isInvalid (T-058)
 *   items-outside       items plus a pressable `outside` view (T-048)
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so an entry under harness/tests/... finds no
 * nsh.json and loses the `@heroui/react` alias and the theme.
 *
 * Mobile layer (adapt sheet A-013): `Scoped` wraps the whole app in an
 * `EnvironmentScope` fed by `host.params.input` / `width` / `density` (absent
 * fields inherit the host baseline — the scope always mounts, never a bare
 * fragment: the popover unit measured a fragment wrapper breaking the
 * exit-hold unmount). The rest of the params parameterize `Select.Popover`
 * and the probes:
 *
 *   presentation   "panel"|"sheet"|"fullscreen" pins the carrier (auto otherwise);
 *   nonmodal="1"   mounts `isNonModal`;            kbdDismiss="1" mounts
 *                  `isKeyboardDismissDisabled`;
 *   kbd="1"        puts a base `Input` above the ListBox — the sheet input
 *                  scenario whose paired Scroll dismisses the keyboard;
 *   narrow="1"     shrinks the trigger below 44pt so the seam computes slop;
 *   keepopen="1"   mounts `selectionMode="multiple"` (selection keeps the
 *                  popover open);
 *   ctx2="1"       swaps the clear icon for a `PressableFeedbackContext`
 *                  probe (`ctx2-*` channels) reading the ClearButton's seam.
 *
 * Probes: `testID="sel-pop"` derives `id:sel-pop-panel` / `-sheet` / `-dialog`
 * per carrier; `layout` reports the trigger and popover boxes; `events` the
 * trigger's down/up/press sequence; `ctx-env`/`ctx-pressed`/`ctx-state`/
 * `ctx-channels` sample the trigger's `PressableFeedbackContext` (the
 * accordion/list-box convention) with `ctx-sample` as the on-demand sampler;
 * `pan` reports `SheetContentPanContext` key counts and
 * `keyboardDismissMode` inside the popover children (−1 outside a Dialog).
 */

type ItemData = { id: string; name: string };

const STATES: ItemData[] = [
  { id: "florida", name: "Florida" },
  { id: "california", name: "California" },
  { id: "texas", name: "Texas" },
];

const ITEMS: ItemData[] = [
  { id: "1", name: "One" },
  { id: "2", name: "Two" },
  { id: "3", name: "Three" },
];

const ITEMS_FOUR: ItemData[] = [
  { id: "1", name: "One" },
  { id: "2", name: "Two" },
  { id: "3", name: "Three" },
  { id: "4", name: "Four" },
];

/** A single selection key, the `"all"` sentinel or a list of keys, as JSON. */
function normalizeSelection(value: unknown, multiple: boolean): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (value === "all") {
    return "all";
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

/* -------------------------------------------------------------------------------------------------
 * EnvironmentScope wrapper (A-013) — every case mounts inside it; fields the
 * params do not name keep the host's own environment.
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

/* -------------------------------------------------------------------------------------------------
 * Probes (A-013)
 * -----------------------------------------------------------------------------------------------*/

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

/** A bounds report named `name`, so `layout` calls discriminate the views. */
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

/** The live `PressableFeedbackContext` the `ctx-sample` button reads. */
let triggerCtx: PressableFeedbackContextValue | null = null;
let clearCtx: PressableFeedbackContextValue | null = null;

/** Samples one `PressableFeedbackContext` into the named probe channels. */
function CtxProbe(props: { prefix: string; set: (ctx: PressableFeedbackContextValue | null) => void }) {
  const ctx = PressableFeedbackContext();
  const reportPressed = probe(`${props.prefix}-pressed`);
  const reportState = probe(`${props.prefix}-state`);
  const reportEnv = probe(`${props.prefix}-env`);

  effect(() => {
    props.set(ctx);
  });

  effect(() => {
    reportEnv({
      enabled: ctx.enabled(),
      hitSlop: ctx.hitSlop() ?? null,
    });
  });

  const sample = () => {
    void ctx.pressed.getValue().then((pressed) => {
      void ctx.scale.getValue().then((scale) => {
        reportState({
          seamPressed: ctx.isPressed(),
          pressed,
          scale,
          origin: ctx.pressOrigin(),
          hitSlop: ctx.hitSlop() ?? null,
          bounds: ctx.bounds(),
          enabled: ctx.enabled(),
        });
      });
    });
  };

  effect(() => {
    const seam = ctx.isPressed();
    reportPressed({ seam });
    setTimeout(sample, 600);
    setTimeout(sample, 1500);
  });

  return null;
}

/** The `ctx-channels` / `ctx2-channels` on-demand read, after a press: a
 * gated press never raises the `isPressed` edge, so the timed samples alone
 * cannot prove the channels stayed at rest. */
function sampleChannels() {
  const report = probe("ctx-channels");
  const ctx = triggerCtx;
  if (ctx === null) {
    return;
  }
  void ctx.pressed.getValue().then((pressed) => {
    void ctx.scale.getValue().then((scale) => {
      report({
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

function sampleClearChannels() {
  const report = probe("ctx2-channels");
  const ctx = clearCtx;
  if (ctx === null) {
    return;
  }
  void ctx.pressed.getValue().then((pressed) => {
    void ctx.scale.getValue().then((scale) => {
      report({
        seamPressed: ctx.isPressed(),
        pressed,
        scale,
        origin: ctx.pressOrigin(),
        hitSlop: ctx.hitSlop() ?? null,
        bounds: ctx.bounds(),
        enabled: ctx.enabled(),
      });
    });
  });
}

/** The `SheetContentPanContext` a sheet-carried popover's children sit in:
 * `panKeys` / `scrollKeys` count the resolved prop keys (−1 where no Dialog
 * supplied the context at all — the panel and fullscreen carriers).
 *
 * Every carrier branch keeps its own copy of the popover's children mounted
 * (an element mounts under one parent only), so three of these run at once
 * and the sheet copy is the only one inside `SheetDialog`'s provider.
 * `carrier` is the branch's `SelectCarrierContext` (`"panel"` / `"sheet"` /
 * `"fullscreen"`), which is what the assertions discriminate on — record
 * order across the branches is not stable. */
function PanProbe() {
  const contentPan = SheetContentPanContext();
  const carrier = SelectCarrierContext();
  const report = probe("pan");

  effect(() => {
    const scroll = contentPan?.scrollProps() ?? {};
    report({
      carrier: carrier ?? null,
      panKeys: contentPan ? Object.keys(contentPan.panHandlers()).length : -1,
      scrollKeys: contentPan ? Object.keys(scroll).length : -1,
      keyboardDismissMode:
        (scroll as { keyboardDismissMode?: string }).keyboardDismissMode ?? null,
    });
  });

  return null;
}

function Row(props: { item: ItemData }) {
  return (
    <ListBox.Item
      id={props.item.id}
      textValue={props.item.name}
      aria-label={props.item.name}
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
 * Case
 * -----------------------------------------------------------------------------------------------*/

type CaseProps = {
  data: ItemData[];
  placeholder: string;
  label?: string;
  ariaLabel?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  clear?: boolean;
  customIcon?: boolean;
  multiple?: boolean;
  defaultKey?: string;
  defaultKeys?: string[];
  valueKey?: string;
  selectedKey?: string | null;
  selectedKeys?: string[];
  disabled?: boolean;
  triggerDisabled?: boolean;
  disabledKeys?: string[];
  disallowEmpty?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  itemsProp?: boolean;
  alias?: boolean;
  outside?: boolean;
  /** Called with the raw selection payload, after the probe, for write-back cases. */
  onSelection?: (value: unknown) => void;
};

function param(name: string): string {
  return String(host.params[name] ?? "");
}

function Case(props: CaseProps) {
  // A-013: `keepopen="1"` mounts the multiple-selection path — selecting a
  // row keeps the popover open, which is what a retained sheet carrier must
  // survive (M-009).
  const multiple = () => props.multiple === true || param("keepopen") === "1";

  const recordSelection = (value: unknown) => {
    probe("selectionChange")(normalizeSelection(value, multiple()));
    props.onSelection?.(value);
  };

  // The mobile params (A-013): the carrier pin, the dismissal gates, the
  // input scenario, the sub-44pt trigger and the probe switches.
  const presentation = param("presentation");
  const narrow = param("narrow") === "1";
  const layout = param("layout") === "1";
  const hover = param("hover") === "1";
  const ctx2 = param("ctx2") === "1";
  const kbd = param("kbd") === "1";

  return (
    <View class="w-64 items-start gap-2">
      <Select
        // A ClearButton makes the trigger's centre land inside its 24pt hit
        // area when the root shrink-wraps, so the root takes the width
        // HeroUI's own WithClearButton story sets (`w-[256px]`).
        className={props.clear ? "w-[256px]" : undefined}
        placeholder={props.placeholder}
        aria-label={props.ariaLabel}
        selectionMode={multiple() ? "multiple" : "single"}
        isDisabled={props.disabled}
        isInvalid={props.invalid}
        disabledKeys={props.disabledKeys}
        disallowEmptySelection={props.disallowEmpty}
        defaultOpen={props.defaultOpen}
        isOpen={props.open}
        defaultSelectedKey={multiple() ? undefined : props.defaultKey}
        defaultSelectedKeys={multiple() ? props.defaultKeys : undefined}
        selectedKey={
          multiple() || props.alias ? undefined : props.selectedKey
        }
        selectedKeys={multiple() ? props.selectedKeys : undefined}
        value={props.alias && !multiple() ? props.valueKey : undefined}
        onSelectionChange={props.alias ? undefined : recordSelection}
        onChange={props.alias ? recordSelection : undefined}
        onClear={probe("clear")}
        onOpenChange={probe("openChange")}
        onLayout={layout ? boxProbe("root") : undefined}
      >
        {props.label ? <Label>{props.label}</Label> : null}
        <Select.Trigger
          testID="select-trigger"
          isDisabled={props.triggerDisabled}
          // A-013 `narrow`: both dims under the 44pt touch minimum — the
          // `min-h-6` class wins over the trigger's `min-h-9` base cell and
          // the touch `min-h-11` cell (the caller's class lands last).
          className={narrow ? "min-h-6 w-10" : undefined}
          onPressDown={() => probe("events")("down")}
          onPressUp={() => probe("events")("up")}
          onPress={() => probe("events")("press")}
          onFocus={probe("triggerFocus")}
          onBlur={probe("triggerBlur")}
          onHoverStart={hover ? () => probe("hover")("start") : undefined}
          onHoverEnd={hover ? () => probe("hover")("end") : undefined}
          onHoverChange={
            hover ? (value) => probe("hover")({ kind: "change", value }) : undefined
          }
          onMouseEnter={hover ? () => probe("hover")("enter") : undefined}
          onMouseLeave={hover ? () => probe("hover")("leave") : undefined}
          onLayout={layout ? boxProbe("trigger") : undefined}
        >
          {(values) => [
            <Select.Value />,
            hover ? <Text>{values.isHovered() ? "hov" : ""}</Text> : null,
            props.clear ? (
              <Select.ClearButton testID="select-clear-button">
                {ctx2 ? (
                  <CtxProbe prefix="ctx2" set={(ctx) => (clearCtx = ctx)} />
                ) : props.customIcon ? (
                  <Text>×</Text>
                ) : undefined}
              </Select.ClearButton>
            ) : null,
            <Select.Indicator />,
            <CtxProbe prefix="ctx" set={(ctx) => (triggerCtx = ctx)} />,
          ]}
        </Select.Trigger>
        <Select.Popover
          testID="sel-pop"
          presentation={
            presentation === ""
              ? undefined
              : (presentation as "auto" | "panel" | "sheet" | "fullscreen")
          }
          isNonModal={param("nonmodal") === "1" || undefined}
          isKeyboardDismissDisabled={param("kbdDismiss") === "1" || undefined}
          onLayout={layout ? boxProbe("pop") : undefined}
        >
          {kbd ? <Input accessibilityLabel="Search options" /> : null}
          <ListBox onFocus={probe("listFocus")} items={props.itemsProp ? props.data : undefined}>
            {props.itemsProp
              ? (item: ItemData) => <Row item={item} />
              : props.data.map((item) => <Row item={item} />)}
          </ListBox>
          <PanProbe />
        </Select.Popover>
        {props.description ? <Description>{props.description}</Description> : null}
        {props.error ? <FieldError>{props.error}</FieldError> : null}
      </Select>
      {props.outside ? (
        <View testID="outside" role="button" onPress={() => undefined}>
          <Text>Outside</Text>
        </View>
      ) : null}
      <View testID="ctx-sample" role="button" class="p-2" onPress={sampleChannels}>
        <Text>ctx-sample</Text>
      </View>
      {props.clear ? (
        <View testID="ctx2-sample" role="button" class="p-2" onPress={sampleClearChannels}>
          <Text>ctx2-sample</Text>
        </View>
      ) : null}
    </View>
  );
}

function ControlledClear() {
  const selected = signal<string | null>("2");

  return (
    <Case
      data={ITEMS}
      placeholder="Placeholder"
      label="Label"
      clear
      selectedKey={selected()}
      onSelection={(value) => {
        // The parent owns the value: it ignores the selection change but
        // honors the clear, which is what Kobalte's external button does.
        if (value === null) {
          selected.set(null);
        }
      }}
    />
  );
}

const STATES_CASE: CaseProps = { data: STATES, placeholder: "Select one" };
const ITEMS_CASE: CaseProps = { data: ITEMS, placeholder: "Placeholder" };
const ITEMS_FOUR_CASE: CaseProps = { data: ITEMS_FOUR, placeholder: "Placeholder" };

function Fixture() {
  const name = String(host.params.case ?? "states");

  if (name === "states") {
    return <Case {...STATES_CASE} label="State" />;
  }

  if (name === "states-items") {
    return <Case {...STATES_CASE} label="State" alias itemsProp />;
  }

  if (name === "states-plain") {
    return <Case {...STATES_CASE} label="State" alias />;
  }

  if (name === "states-plain-selected") {
    return <Case {...STATES_CASE} defaultKey="california" label="State" alias />;
  }

  if (name === "states-clear") {
    return (
      <Case
        {...STATES_CASE}
        clear
        defaultKey="california"
        label="State"
        alias
      />
    );
  }

  if (name === "states-clear-empty") {
    return <Case {...STATES_CASE} clear label="State" alias />;
  }

  if (name === "states-custom-icon") {
    return (
      <Case
        {...STATES_CASE}
        clear
        customIcon
        defaultKey="california"
        label="State"
      />
    );
  }

  if (name === "states-default") {
    return <Case {...STATES_CASE} defaultKey="california" label="State" />;
  }

  if (name === "states-controlled") {
    return (
      <Case {...STATES_CASE} label="State" alias valueKey="texas" />
    );
  }

  if (name === "states-disabled") {
    return (
      <Case
        {...STATES_CASE}
        clear
        defaultKey="california"
        disabled
        label="State"
        alias
      />
    );
  }

  if (name === "states-trigger-disabled") {
    return (
      <Case
        {...STATES_CASE}
        clear
        defaultKey="california"
        label="State"
        triggerDisabled
        alias
      />
    );
  }

  if (name === "states-invalid") {
    return (
      <Case
        {...STATES_CASE}
        description="Description"
        error="Please choose a state"
        invalid
        label="State"
      />
    );
  }

  if (name === "items") {
    return <Case {...ITEMS_CASE} label="Label" />;
  }

  if (name === "items-open") {
    return <Case {...ITEMS_CASE} label="Label" open />;
  }

  if (name === "items-default-open") {
    return <Case {...ITEMS_CASE} defaultOpen label="Label" />;
  }

  if (name === "items-default-two") {
    return <Case {...ITEMS_CASE} defaultKey="2" label="Label" />;
  }

  if (name === "items-disallow-empty") {
    return <Case {...ITEMS_CASE} defaultKey="2" disallowEmpty label="Label" />;
  }

  if (name === "items-controlled") {
    return <Case {...ITEMS_CASE} label="Label" selectedKey="2" />;
  }

  if (name === "items-controlled-clear") {
    return <ControlledClear />;
  }

  if (name === "items-disabled-keys") {
    return <Case {...ITEMS_CASE} disabledKeys={["2"]} label="Label" />;
  }

  if (name === "items-multiple") {
    return <Case {...ITEMS_CASE} label="Label" multiple />;
  }

  if (name === "items-multiple-default") {
    return (
      <Case
        {...ITEMS_CASE}
        defaultKeys={["1", "2"]}
        label="Label"
        multiple
      />
    );
  }

  if (name === "items-multiple-controlled") {
    return (
      <Case
        {...ITEMS_CASE}
        label="Label"
        multiple
        selectedKeys={["1", "2"]}
      />
    );
  }

  if (name === "items-four") {
    return <Case {...ITEMS_FOUR_CASE} label="Label" />;
  }

  if (name === "items-disabled") {
    return <Case {...ITEMS_CASE} disabled label="Label" />;
  }

  if (name === "items-aria-label") {
    return <Case {...ITEMS_CASE} ariaLabel="foo" />;
  }

  if (name === "items-description") {
    return <Case {...ITEMS_CASE} description="Description" label="Label" />;
  }

  if (name === "items-invalid") {
    return (
      <Case {...ITEMS_CASE} error="ErrorMessage" invalid label="Label" />
    );
  }

  if (name === "items-outside") {
    return <Case {...ITEMS_CASE} label="Label" outside />;
  }

  return <Case {...STATES_CASE} label="State" />;
}

function Root() {
  return (
    <Scoped>
      <Fixture />
    </Scoped>
  );
}

mount(Root);
