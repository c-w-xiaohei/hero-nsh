import type { Accessor, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
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

import { createKeymapScope } from "../../primitives/create-keymap-scope";
import type { DateSegment } from "./date-field-utils";
import {
  DateInputGroupContext,
  DateInputGroupFieldContext,
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

  const focused = signal(false);
  const hovered = signal(false);

  let node: ViewRef | undefined;
  let pointerFocusPending = false;

  // R-006: the group's ring follows the parts that can hold the focus.
  cleanup(group.registerFocusTarget(focused));

  // The element `focusAdjacent` focuses; re-registered when the row shows a
  // different segment type (a locale or granularity change rewrites the row).
  effect(() => field?.registerSegmentElement(props.segment.type, () => node));

  const isLiteral = () => props.segment.type === "literal";
  const isDisabled = () => field?.isDisabled() ?? false;
  const isReadOnly = () => field?.isReadOnly() ?? false;
  const isInvalid = () => field?.isInvalid() ?? false;

  // React Aria's `isEditable`: the field settings decide, then the segment.
  const canFocus = () => props.segment.isEditable && !isDisabled();
  const canEdit = () => canFocus() && !isReadOnly();

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
    if (isLiteral() || !canFocus()) {
      return;
    }

    hovered.set(true);
    local.onHoverStart?.(hoverEvent("hoverstart"));
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    hovered.set(false);
    local.onHoverEnd?.(hoverEvent("hoverend"));
    local.onHoverChange?.(false);
  };

  const handleFocus = () => {
    focused.set(true);
    field?.focusSegment(props.segment);

    if (pointerFocusPending) {
      // A press focused this segment; the appearance must not show the
      // keyboard ring, as `:focus-visible` would not.
      pointerFocusPending = false;
      group.setPointerModality();
    } else {
      group.setKeyboardModality();
    }
  };

  const handleBlur = () => {
    focused.set(false);
    field?.focusSegment(null);
    // React Aria commits the edited value when the segment loses the focus.
    field?.commit();
  };

  /**
   * A pointer press focuses the segment. NSH does not focus a view on press and
   * a view is only pressable when it hears `onPress`, so the down and the tap
   * share one handler: the focus arrives on the press-down where the host
   * allows it, and the modality is recorded as the pointer's, so no keyboard
   * ring shows (port sheet §2).
   */
  const handlePress = () => {
    if (!canFocus()) {
      return;
    }

    pointerFocusPending = true;
    group.setPointerModality();
    node?.focus();
  };

  // --- Keys ------------------------------------------------------------------
  // Bound only while this segment is focused; every editing call is gated again
  // inside the state, so a read-only segment still moves with the arrows.
  createKeymapScope({
    isActive: () => focused() && canFocus(),
    bindings: {
      // `keymap` names the arrows `up` / `down` / `left` / `right`.
      up: () => field?.increment(props.segment),
      down: () => field?.decrement(props.segment),
      left: () => field?.focusAdjacent(-1),
      right: () => field?.focusAdjacent(1),
      backspace: () => field?.clear(props.segment),
      delete: () => field?.clear(props.segment),
      enter: () => field?.commit(),
      "0": () => field?.type(props.segment, "0"),
      "1": () => field?.type(props.segment, "1"),
      "2": () => field?.type(props.segment, "2"),
      "3": () => field?.type(props.segment, "3"),
      "4": () => field?.type(props.segment, "4"),
      "5": () => field?.type(props.segment, "5"),
      "6": () => field?.type(props.segment, "6"),
      "7": () => field?.type(props.segment, "7"),
      "8": () => field?.type(props.segment, "8"),
      "9": () => field?.type(props.segment, "9"),
      a: () => field?.type(props.segment, "a"),
      p: () => field?.type(props.segment, "p"),
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

  const accessibilityValue = () => {
    if (isLiteral()) {
      return undefined;
    }

    return {
      min: props.segment.minValue,
      max: props.segment.maxValue,
      now: props.segment.value ?? undefined,
      text: props.segment.isPlaceholder ? "" : props.segment.text,
    };
  };

  const accessibilityLabel = () => {
    if (isLiteral()) {
      return undefined;
    }

    return segmentName(props.segment.type, hostLocale());
  };

  const focusable = () => canFocus();

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
      onPressDown={handlePress}
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {resolveSegmentChildren(local.children, createRenderProps)}
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
