import { DateFormatter } from "@internationalized/date";
import { Input } from "nsh/base";
import type {
  Accessor,
  InputRef,
  JSX,
  KeyboardType,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  cleanup,
  computed,
  effect,
  locale as hostLocale,
  signal,
  split,
  Text,
  untracked,
  View,
} from "nsh";

import { isKeyboardPress } from "../../primitives/create-interaction-modality";
import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { createInput } from "../../primitives/environment";
import type { DateSegment } from "./date-field-utils";
import {
  DateInputGroupContext,
  DateInputGroupFieldContext,
  DateInputGroupKeyboardContext,
} from "./date-input-group-context";
import type { DateInputGroupHoverEvent } from "./date-input-group-root";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What `DateInputGroup.Segment`'s render props receive (HeroUI's
 * `DateSegmentRenderProps`): every field of the segment, plus the six segment
 * states as accessors (D17). The segment fields are read from `props.segment`
 * at call time, so a value that changes while the row stays mounted follows.
 */
export interface DateInputGroupSegmentRenderProps extends DateSegment {
  isHovered: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
}

/** The props of `DateInputGroup.Segment`, HeroUI's `DateInputGroupSegmentProps`. */
export interface DateInputGroupSegmentProps {
  /** The segment to display and edit; React Stately's `DateSegment`. */
  segment: DateSegment;

  /**
   * The segment's content: nothing shows `segment.text`, an element replaces
   * it, and a one-argument function is a render prop called once (D17).
   */
  children?: JSX.Element | ((values: DateInputGroupSegmentRenderProps) => JSX.Element);

  /** Appended after the slot classes; the function form gets the same values. */
  className?: string | ((values: DateInputGroupSegmentRenderProps) => string | undefined);

  /** The segment's style; the function form gets the same values. */
  style?: StyleProp<ViewStyle> | ((values: DateInputGroupSegmentRenderProps) => StyleProp<ViewStyle>);

  /** The segment was hovered; disabled segments and literals never fire it. */
  onHoverStart?: (event: DateInputGroupHoverEvent) => void;

  /** Every hover transition. */
  onHoverChange?: (isHovering: boolean) => void;

  /** The pointer left the segment. */
  onHoverEnd?: (event: DateInputGroupHoverEvent) => void;

  /** An identifier for UI tests. */
  testID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** No `ref` upstream either: `DateInputGroupSegmentProps` does not declare one. */
  ref?: undefined;

  /** Any other DOM / global attribute HeroUI accepts; no effect here (D18). */
  [key: string]: unknown;
}

/** The name a screen reader reads for a segment type, when `Intl.DisplayNames` is unavailable. */
const SEGMENT_NAMES: Record<string, string> = {
  era: "era",
  year: "year",
  month: "month",
  day: "day",
  hour: "hour",
  minute: "minute",
  second: "second",
  dayPeriod: "AM/PM",
  timeZoneName: "time zone",
};

/**
 * `@react-aria/spinbutton`'s `Empty` message: the `aria-valuetext` of a
 * spinbutton whose value is NaN, which is every placeholder segment
 * (`useSpinButton.ts:145-147`, `:245`). React Aria looks it up in its translated
 * string catalog; that catalog is not part of this port, so its English default
 * is the fallback (registered in port sheet §8).
 */
const EMPTY_SEGMENT_TEXT = "Empty";

/**
 * A-005: the named keys a soft-keyboard press can report that the channel does
 * not bridge — Backspace / Delete route to `field.backspace` first, Enter is
 * `submitBehavior`'s, and the rest (navigation, modifiers) have no segment
 * editing meaning on the channel; the keymap still owns them on a real
 * keyboard path.
 */
const CHANNEL_NAMED_KEYS: ReadonlySet<string> = new Set([
  "enter",
  "return",
  "tab",
  "escape",
  "esc",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "up",
  "down",
  "left",
  "right",
  "pageup",
  "pagedown",
  "home",
  "end",
  "space",
  "spacebar",
  "shift",
  "control",
  "alt",
  "meta",
  "capslock",
  "backspace",
  "delete",
]);

function segmentName(type: string, locale: string): string | undefined {
  const fallback = SEGMENT_NAMES[type];

  if (!fallback) {
    return undefined;
  }

  try {
    // `Intl.DisplayNames` is optional in the host's ICU build.
    const displayNames = new Intl.DisplayNames([locale], { type: "dateTimeField" });

    return displayNames.of(type as Intl.DateTimeFormatPartTypes) ?? fallback;
  } catch {
    return fallback;
  }
}

/* -------------------------------------------------------------------------------------------------
 * Segment
 * -----------------------------------------------------------------------------------------------*/

/**
 * DateInputGroup.Segment / DateInputGroupSegment: one editable unit of the
 * date — a spinbutton with its own focus, value and keyboard editing — or the
 * literal separator between units.
 *
 * Built on the core `View` + `Text`, not on nsh/base `TimeField`'s segments:
 * those are `focusable(false)`, have no accessibility node of their own and let
 * a transparent native input own the keyboard, which cannot represent a public
 * `Segment` part (port sheet §3, criteria B1 / B3 / B4).
 *
 * Keys arrive through `createKeymapScope`, bound only while this segment is
 * focused and unbound on blur or unmount; Return / Space are left to the host's
 * native press (research 4.1, `_common`).
 */
export function DateInputGroupSegment(props: DateInputGroupSegmentProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "onHoverStart",
    "onHoverChange",
    "onHoverEnd",
    "testID",
    "id",
    "nativeID",
    "render",
    "ref",
  ] as const);

  const group = DateInputGroupContext();
  const field = DateInputGroupFieldContext();

  // A-004 / A-005: the `input` axis — it gates the hover writes and decides
  // whether the soft-keyboard channel below mounts. The `keyboardType` the
  // Input advertises (A-007) resolves per segment inside the channel.
  const input = createInput();
  const keyboardType = DateInputGroupKeyboardContext();

  const focused = signal(false);
  const hovered = signal(false);

  let node: ViewRef | undefined;
  // A-005: the touch editing channel's input; stays `undefined` while the
  // channel is unmounted (pointer environments, literals, disabled fields).
  let channelNode: InputRef | undefined;

  // R-006: the group's ring follows the parts that can hold the focus.
  cleanup(group.registerFocusTarget(focused));

  // The element `focusAdjacent` focuses; re-registered when the row shows a
  // different segment type (a locale or granularity change rewrites the row).
  // A-006: the getter is environment-aware — under touch the registered target
  // is the channel's input, so `focusAdjacent` / `focusLast` land on the
  // soft-keyboard host instead of the (then unfocusable) segment view.
  effect(() =>
    field?.registerSegmentElement(props.segment.type, () =>
      input() === "touch" ? channelNode : node,
    ),
  );

  const isLiteral = () => props.segment.type === "literal";
  const isDisabled = () => field?.isDisabled() ?? false;
  const isReadOnly = () => field?.isReadOnly() ?? false;
  const isInvalid = () => field?.isInvalid() ?? false;

  // React Aria's `isEditable`: the field settings decide, then the segment.
  const canFocus = () => props.segment.isEditable && !isDisabled();
  const canEdit = () => canFocus() && !isReadOnly();

  // React Aria gives every non-literal segment `tabIndex: 0` while the field is
  // enabled (`useDateSegment.ts:421`), read-only and non-editable ones
  // included; only literals are hidden from the Tab order.
  const isInTabOrder = () => !isLiteral() && !isDisabled();

  const isFocusVisible = () => focused() && group.isKeyboard();

  // --- Interaction -----------------------------------------------------------
  // Explicit fields rather than a spread: `props.segment` may be the live proxy
  // the Input hands each `<Each>` row, and a spread would read its empty target.
  const createRenderProps = (): DateInputGroupSegmentRenderProps => {
    const segment = props.segment;

    return {
      type: segment.type,
      text: segment.text,
      value: segment.value,
      minValue: segment.minValue,
      maxValue: segment.maxValue,
      isPlaceholder: segment.isPlaceholder,
      placeholder: segment.placeholder,
      isEditable: segment.isEditable,
      isHovered: hovered,
      isFocused: focused,
      isFocusVisible,
      isReadOnly,
      isInvalid,
      isDisabled,
    };
  };

  const hoverEvent = (type: DateInputGroupHoverEvent["type"]): DateInputGroupHoverEvent => ({
    type,
    pointerType: "mouse",
    target: undefined,
  });

  const handleMouseEnter = () => {
    // A-004: the `input` axis owns hover independence — under touch the hover
    // state and hover callbacks stay off entirely.
    if (input() === "touch" || isLiteral() || !canFocus()) {
      return;
    }

    hovered.set(true);
    local.onHoverStart?.(hoverEvent("hoverstart"));
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    hovered.set(false);

    if (input() === "touch") {
      return;
    }

    local.onHoverEnd?.(hoverEvent("hoverend"));
    local.onHoverChange?.(false);
  };

  const handleFocus = () => {
    focused.set(true);
    field?.focusSegment(props.segment);

    // React Aria sets the modality on the interaction that caused it, and a
    // programmatic `focus()` must not change it (`useFocusVisible.ts:86-92`,
    // `:188-192`). NSH reports no keydown for Tab, so a focus no press asked
    // for is the keyboard arriving; a press marks the focus it takes.
    if (!group.consumePointerFocus()) {
      group.setKeyboardModality();
    }
  };

  const handleBlur = () => {
    focused.set(false);
    field?.focusSegment(null);
  };

  /**
   * A pointer press focuses the segment. NSH does not focus a view on press and
   * a view is pressable when it hears `onPress`, so the press moves the focus
   * itself and records the pointer modality, which keeps the keyboard ring off
   * (port sheet §2). Return / Space arrive as a press of their own and must not
   * be taken for the pointer.
   */
  const handlePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      group.setKeyboardModality();

      return;
    }

    group.setPointerModality();

    if (focused()) {
      return;
    }

    group.requestPointerFocus();
    node?.focus();
  };

  // --- The touch editing channel (A-005 / A-006) ------------------------------
  // Under `input === "touch"` a hidden `nsh/base` `Input` covers the segment
  // and hosts the soft keyboard: the segment view is not a text field, and a
  // pointer press focuses a view on the desktop but an input needs a text
  // field behind it to open a keyboard. The segment text still renders on the
  // view; the channel keeps a controlled empty value and only reports keys.
  // Focus, blur and the out-of-group commit boundary are the existing
  // `handleFocus` / `handleBlur`, so `focused`, the `focusedSegment` record
  // and the ring all see the same segment as before.

  /**
   * The channel's `keyboardType`: the Input's prop, or `"auto"` resolved per
   * segment as React Aria's `useDateSegment` resolves `inputMode` — numeric
   * segments get `"numeric"`, the lettered ones (`dayPeriod`, `era`,
   * `timeZoneName`) `"default"`.
   */
  const channelKeyboardType = (): KeyboardType => {
    const value = keyboardType();

    if (value !== "auto") {
      return value;
    }

    switch (props.segment.type) {
      case "dayPeriod":
      case "era":
      case "timeZoneName":
        return "default";
      default:
        return "numeric";
    }
  };

  /**
   * A press on the channel is the segment's `handlePress` pointer half on an
   * input: it records the pointer modality, marks the focus it is about to
   * take, and lets the host focus land on the channel (an input needs no
   * explicit `focus()`, but calling it also serves hosts that do not move the
   * focus on press).
   */
  const handleChannelPress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      group.setKeyboardModality();

      return;
    }

    group.setPointerModality();

    if (focused()) {
      return;
    }

    group.requestPointerFocus();
    channelNode?.focus();
  };

  /**
   * Keys arrive through `onKeyPress`, never `onChange` — the channel's value
   * stays the controlled empty string. Single characters feed `field.type`
   * with the same buffer / advance rules the keymap's digit and letter
   * bindings drive; Backspace / Delete feed `field.backspace`; Enter is left
   * to `submitBehavior="blurAndSubmit"` (the blur runs the group's existing
   * commit boundary, so `onSubmit` would only duplicate it). Every key that
   * reaches here is a keyboard interaction for the modality, exactly like a
   * bound key.
   */
  const handleChannelKeyPress = (event: { key: string }) => {
    group.setKeyboardModality();

    const key = event.key;

    // Backspace stays ungated: `field.backspace` refuses the edit itself on
    // a read-only or non-editable segment, but keeps its placeholder
    // focus-move — the same split the keymap path has.
    if (key === "Backspace" || key === "Delete" || key === "backspace" || key === "delete") {
      field?.backspace(props.segment);

      return;
    }

    // A read-only or non-editable segment's channel is enabled (the host
    // must keep it focusable — see the mount below) but takes no typed
    // characters: `field.type` is withheld here, as React Aria's
    // `useDateSegment` ignores `e.data` on a read-only segment
    // (`useDateSegment.ts:190-240`). `typeKey` gates the same check again.
    if (!canEdit()) {
      return;
    }

    if (CHANNEL_NAMED_KEYS.has(key.toLowerCase())) {
      return;
    }

    if (key.length === 1) {
      field?.type(props.segment, key);

      return;
    }

    // A `key` longer than one character that is not a named key is typed text
    // (an IME commit, a `nsh/test` `app.type` batch): feed it a character at a
    // time, as key-by-key typing would.
    for (const character of key) {
      field?.type(props.segment, character);
    }
  };

  // --- Keys ------------------------------------------------------------------
  // Bound only while this segment is focused; every editing call is gated again
  // inside the state, so a read-only segment still moves with the arrows.
  // Every key that reaches here records the keyboard modality first: React
  // Aria's `useFocusVisible` switches on keydown, which is also what keeps the
  // group's ring on after a pointer press followed by typing.
  const keyboard = (handler: () => void) => () => {
    group.setKeyboardModality();
    handler();
  };

  createKeymapScope({
    // Every focusable segment binds the row's keys, as React Aria puts the
    // arrow keys on the group (`useDatePickerGroup.ts:34-72`); the editing
    // calls themselves no-op on a read-only or non-editable segment.
    isActive: () => focused() && !isDisabled(),
    bindings: {
      // `keymap` names the arrows `up` / `down` / `left` / `right`.
      up: keyboard(() => field?.increment(props.segment)),
      down: keyboard(() => field?.decrement(props.segment)),
      left: keyboard(() => field?.focusAdjacent(-1)),
      right: keyboard(() => field?.focusAdjacent(1)),
      // React Aria's Backspace / Delete deletes one digit and clears only the
      // cases its `backspace` names (`useDateSegment.ts:104-124`).
      backspace: keyboard(() => field?.backspace(props.segment)),
      delete: keyboard(() => field?.backspace(props.segment)),
      // Return is deliberately not bound: React Aria's segment listens for
      // neither Return nor Space (`useDateSegment.ts:104-127` binds Backspace /
      // Delete / Mod+a only, `useSpinButton.ts:78-128` the page and limit
      // keys), so Return stays the host's native press and the field commits on
      // its blur boundary (`useDateField.ts:105-116`).
      // React Aria's spinbutton page and limit keys
      // (`spinbutton/useSpinButton.ts:78-128`): PageUp / PageDown a page,
      // Home / End the segment's minimum / maximum.
      pageup: keyboard(() => field?.incrementPage(props.segment)),
      pagedown: keyboard(() => field?.decrementPage(props.segment)),
      home: keyboard(() => field?.decrementToMin(props.segment)),
      end: keyboard(() => field?.incrementToMax(props.segment)),
      "0": keyboard(() => field?.type(props.segment, "0")),
      "1": keyboard(() => field?.type(props.segment, "1")),
      "2": keyboard(() => field?.type(props.segment, "2")),
      "3": keyboard(() => field?.type(props.segment, "3")),
      "4": keyboard(() => field?.type(props.segment, "4")),
      "5": keyboard(() => field?.type(props.segment, "5")),
      "6": keyboard(() => field?.type(props.segment, "6")),
      "7": keyboard(() => field?.type(props.segment, "7")),
      "8": keyboard(() => field?.type(props.segment, "8")),
      "9": keyboard(() => field?.type(props.segment, "9")),
      // React Aria hands the segment any typed character (`useDateSegment.ts:190-240`
      // passes `e.data` on) and the state decides what it means: digits, the
      // localized AM / PM names (`create-date-field-state.ts` `amPmNames`) and
      // the localized era names (`eraNames`). Binding the whole alphabet keeps
      // locales whose day period does not start with "a" / "p" working — de-DE
      // answers to "v" (vorm.) and "n" (nachm.), an era to its own initial.
      ...Object.fromEntries(
        [..."abcdefghijklmnopqrstuvwxyz"].map((letter) => [
          letter,
          keyboard(() => field?.type(props.segment, letter)),
        ]),
      ),
    },
  });

  // --- Classes (R-018 … R-024) ----------------------------------------------
  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(createRenderProps()) : value;
  };

  const classes = computed(() => {
    const parts = [group.slots().segment()];

    // R-019: `[data-type=literal]` → `p-0 text-muted`.
    if (isLiteral()) {
      parts.push("p-0 text-muted");
    }

    // R-020: `[data-placeholder=true]` → `text-field-placeholder`.
    if (props.segment.isPlaceholder) {
      parts.push("text-field-placeholder");
    }

    // R-022: `[data-disabled=true]` → `opacity-50`.
    if (isDisabled()) {
      parts.push("opacity-50");
    }

    // R-023: `[data-invalid=true]` → `text-danger`; R-024 paints the focused
    // invalid segment over it below.
    if (isInvalid()) {
      parts.push("text-danger");
    }

    // R-021: `:focus`, `[data-focused=true]` → `bg-accent-soft
    // text-accent-soft-foreground`.
    // R-024: `[data-invalid=true]:focus` → `bg-danger-soft
    // text-danger-soft-foreground`, after R-023 and R-021's colours.
    if (focused()) {
      parts.push(
        isInvalid()
          ? "bg-danger-soft text-danger-soft-foreground"
          : "bg-accent-soft text-accent-soft-foreground",
      );
    }

    const own = resolvedClassName() ?? "";

    return [...parts, own].filter((part) => part.length > 0).join(" ");
  });

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(createRenderProps()) : value;
  };

  // --- Accessibility ---------------------------------------------------------
  const role = () => {
    if (isLiteral()) {
      return undefined;
    }

    // React Aria reports a time zone segment as a textbox, not a spinbutton.
    return props.segment.type === "timeZoneName" ? ("text" as const) : ("spinbutton" as const);
  };

  // React Aria's `aria-valuetext`: the month also reads its long name, the
  // hour its localized hour (`useDateSegment.ts:59-72`), so a screen reader
  // says "08 – August" and "8 PM" rather than the raw digits. A time zone
  // segment carries no value at all (`:322-334`), and a placeholder reads the
  // spinbutton's `Empty` message (`useSpinButton.ts:145-147`).
  //
  // The names are formatted in the field state's locale (`state.locale` in
  // `useDateSegment.ts:47-53`), not the host's: a field given `locale="de-DE"`
  // on an English host must read German month names.
  const fieldLocale = () =>
    field?.dateFormatter().resolvedOptions().locale ?? hostLocale();

  const accessibilityText = () => {
    const segment = props.segment;

    if (segment.isPlaceholder) {
      return EMPTY_SEGMENT_TEXT;
    }

    if (!field || (segment.type !== "month" && segment.type !== "hour")) {
      return segment.text;
    }

    const options = field.dateFormatter().resolvedOptions();

    if (segment.type === "month") {
      const monthText = new DateFormatter(fieldLocale(), {
        month: "long",
        timeZone: options.timeZone,
      }).format(field.dateValue());

      return monthText !== segment.text ? `${segment.text} – ${monthText}` : monthText;
    }

    return new DateFormatter(fieldLocale(), {
      hour: "numeric",
      hour12: options.hour12,
      timeZone: options.timeZone,
    }).format(field.dateValue());
  };

  const accessibilityValue = () => {
    if (isLiteral() || props.segment.type === "timeZoneName") {
      return undefined;
    }

    return {
      min: props.segment.minValue,
      max: props.segment.maxValue,
      now: props.segment.value ?? undefined,
      text: accessibilityText(),
    };
  };

  const accessibilityLabel = () => {
    if (isLiteral()) {
      return undefined;
    }

    return segmentName(props.segment.type, fieldLocale());
  };

  // A-005: under touch the segment's focus stop is the channel's input, so the
  // view itself leaves the Tab order (one stop per segment, as the pointer
  // side has) and a `focusLast` / arrow move lands where the soft keyboard
  // hosts. `isInTabOrder()` alone is the pointer half, byte-identical.
  const focusable = () => isInTabOrder() && input() !== "touch";

  return (
    <View
      ref={(value) => {
        node = value;
      }}
      role={role()}
      focusable={focusable()}
      accessibilityLabel={accessibilityLabel()}
      accessibilityValue={accessibilityValue()}
      accessibilityState={isDisabled() ? { disabled: true } : undefined}
      // React Aria hides literal segments from assistive technologies.
      accessibilityElementsHidden={isLiteral() ? true : undefined}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      class={classes()}
      style={resolvedStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // A literal separator does not take presses: React Aria's literal segment
      // installs no pointer handler, so a press on it reaches the group and
      // focuses the last placeholder (`useDateSegment.ts:352-357`).
      onPress={isLiteral() ? undefined : handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {resolveSegmentChildren(local.children, createRenderProps)}
      {/* A-005: the soft-keyboard channel — a hidden input covering the
          segment, mounted only where a touch environment gives a non-literal
          segment a Tab stop. Under `pointer` it does not exist at all (M-004's
          negative assertion); the A-001 `relative` anchors it to the raised
          segment box. A read-only or non-editable segment keeps the channel
          focusable: `readonly` cannot carry the gate — NSH maps it to
          `editable: false`, which on iOS is `UITextField.setEnabled(false)`,
          and a disabled field refuses `becomeFirstResponder` (the readonly
          `waitFocused` failures' root, input.rs). The host therefore keeps
          `editable` and `handleChannelKeyPress` withholds `field.type`;
          the field state gates the same edits again. */}
      <If when={isInTabOrder() && input() === "touch"}>
        <Input
          ref={(value) => {
            channelNode = value;
          }}
          testID={`dig-seg-${props.segment.type}`}
          value=""
          caret={false}
          keyboardType={channelKeyboardType()}
          submitBehavior="blurAndSubmit"
          // The channel must stay hit-testable: iOS (and NSH's own hit
          // walkers) skip a view with alpha < 0.01, which `opacity-0`
          // made — a touch could never land in the channel and the
          // soft-keyboard editing path was dead on iOS. It still paints
          // nothing: controlled empty value, no caret, the platform input
          // draws no background or border on its own.
          class="absolute inset-0"
          onPress={handleChannelPress}
          onKeyPress={handleChannelKeyPress}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </If>
    </View>
  );
}

/**
 * The one read of `props.children`, at the placement. A bare segment shows
 * `segment.text` inside a `Text`; a one-argument function is a render prop
 * called once (D17); a zero-argument function is NSH's reactive child.
 */
function resolveSegmentChildren(
  children: JSX.Element | ((values: DateInputGroupSegmentRenderProps) => JSX.Element),
  createRenderProps: () => DateInputGroupSegmentRenderProps,
): JSX.Element {
  if (children === null || children === undefined) {
    return <Text>{createRenderProps().text}</Text>;
  }

  if (typeof children === "function" && children.length >= 1) {
    const rendered = untracked(() =>
      (children as (values: DateInputGroupSegmentRenderProps) => JSX.Element)(
        createRenderProps(),
      ),
    );

    return renderChildren(rendered);
  }

  return renderChildren(children as JSX.Element);
}
