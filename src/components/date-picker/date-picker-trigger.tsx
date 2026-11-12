import type { Bounds, JSX, PressEvent, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, effect, signal, split, untracked, View } from "nsh";

import { isKeyboardPress } from "../../primitives/create-interaction-modality";
import { DateInputGroupContext } from "../date-input-group/date-input-group-context";
import { DatePickerContext } from "./date-picker-context";
import { renderChildren } from "./render-children";

/** React Aria's hover event, as far as NSH can report it (no DOM target). */
export interface DatePickerTriggerHoverEvent {
  type: "hoverstart" | "hoverend" | "hover";
  pointerType: "mouse" | "pen" | "touch";
  target?: undefined;
}

/**
 * The props of `DatePicker.Trigger`: HeroUI's `DatePickerTriggerProps`, which
 * is `ComponentPropsWithRef<typeof ButtonPrimitive>` (React Aria Components'
 * `Button` `AriaButtonProps`), expressed with NSH's press host props. Members
 * NSH has no channel for are accepted and have no effect (port sheet §1.3).
 */
export interface DatePickerTriggerProps {
  /** The trigger's content; typically a `DatePicker.TriggerIndicator`. */
  children?: JSX.Element;

  /** Appended after the `trigger` slot classes; later classes win. */
  className?: string;

  /** Style of the trigger view; wins over the slot classes on the keys it sets. */
  style?: StyleProp<ViewStyle>;

  /** Disables this trigger on top of the picker's own `isDisabled`. */
  isDisabled?: boolean;

  /** Focuses the trigger when it appears (web and macOS; see §8). */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH has no tab-order channel. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: a view press does not move the focus. */
  preventFocusOnPress?: boolean;

  /** The trigger was pressed: the picker toggles, then the caller's handler runs. */
  onPress?: (event: PressEvent) => void;

  /** The press started (React Aria's `onPressStart`). */
  onPressStart?: (event: PressEvent) => void;

  /** The press was released (React Aria's `onPressUp`). */
  onPressUp?: (event: PressEvent) => void;

  /** Accepted, no effect: NSH reports no press-end separately from the release. */
  onPressEnd?: (event: PressEvent) => void;

  /** The pressed state changed. */
  onPressChange?: (isPressed: boolean) => void;

  /** The pointer entered the trigger. */
  onHoverStart?: (event: DatePickerTriggerHoverEvent) => void;

  /** The pointer left the trigger. */
  onHoverEnd?: (event: DatePickerTriggerHoverEvent) => void;

  /** Every hover transition. */
  onHoverChange?: (isHovering: boolean) => void;

  /** The trigger took the focus. */
  onFocus?: () => void;

  /** The trigger lost the focus. */
  onBlur?: () => void;

  /** Accepted, no effect: NSH has no form submission. */
  type?: "button" | "submit" | "reset";
  form?: string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;
  name?: string;
  value?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** NSH's own id; `id` wins. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** The trigger was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** The trigger's accessible name; upstream's `buttonProps` default is localized. */
  "aria-label"?: string;

  /** NSH's own accessible name; `aria-label` wins. */
  accessibilityLabel?: string;

  /** Accepted, no effect: the open state is reported through `accessibilityState`. */
  "aria-expanded"?: boolean;

  /** Accepted, no effect: NSH has no `aria-haspopup` channel. */
  "aria-haspopup"?: "dialog" | "menu" | "listbox" | "tree" | "grid" | boolean;

  /** Accepted, no effect: the layer has no id relation. */
  "aria-controls"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** The trigger's view, forwarded as a callback only. */
  ref?: (node: ViewRef) => void;

  /** Any other DOM / global attribute HeroUI's Button accepts; no effect here (D18). */
  [key: string]: unknown;
}

/**
 * DatePicker.Trigger / DatePickerTrigger: the button in the field's suffix that
 * opens the calendar. Upstream it is React Aria's `Button`, which is a
 * `button[type="button"]` with a press responder and a focus ring; it is built
 * on the core `View` here because the Button components bring their own fill,
 * shadow and `variant` / `size` axes that `.date-picker__trigger` does not have
 * (port sheet §3, B1–B4).
 *
 * Two registrations leave this part: the picker keeps its view as the
 * focus-return target, and the field group hears about its focus (which
 * suppresses the group's ring, `date-input-group` R-006).
 */
export function DatePickerTrigger(props: DatePickerTriggerProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "isDisabled",
    "autoFocus",
    "excludeFromTabOrder",
    "preventFocusOnPress",
    "onPress",
    "onPressStart",
    "onPressUp",
    "onPressEnd",
    "onPressChange",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onFocus",
    "onBlur",
    "type",
    "form",
    "formAction",
    "formEncType",
    "formMethod",
    "formNoValidate",
    "formTarget",
    "name",
    "value",
    "id",
    "nativeID",
    "testID",
    "onLayout",
    "aria-label",
    "accessibilityLabel",
    "aria-expanded",
    "aria-haspopup",
    "aria-controls",
    "slot",
    "render",
    "ref",
  ] as const);

  const picker = DatePickerContext();
  const group = DateInputGroupContext();

  const focused = signal(false);
  const node = signal<ViewRef | undefined>(undefined);

  // The picker's own disabled state and this trigger's flag: React Aria's
  // `isDisabled` is the union of the two (port sheet §1.3).
  const isDisabled = computed(() => local.isDisabled === true || picker.isDisabled());

  // The group suppresses its ring while a trigger holds the focus; the picker
  // counts the trigger's focus as its own `isFocusWithin` (port sheet §2).
  cleanup(group.registerTriggerFocus(focused));
  cleanup(picker.registerTriggerFocus(focused));

  let unregisterTrigger: (() => void) | undefined;

  const handleRef = (next: ViewRef) => {
    node.set(next);
    unregisterTrigger?.();
    unregisterTrigger = picker.registerTrigger(next);
    local.ref?.(next);
  };

  cleanup(() => unregisterTrigger?.());

  // `autoFocus` puts the focus on the trigger once its view exists (web and
  // macOS; a Windows window cannot focus a view, §8).
  effect(() => {
    const target = node();

    if (local.autoFocus && target) {
      untracked(() => target.focus());
    }
  });

  // V4: Return / Space report `pagePosition` exactly `{x: 0, y: 0}`, a real
  // pointer press reports where it happened.
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      picker.setKeyboardModality();
    } else {
      picker.setPointerModality();
    }
  };

  const hoverEvent = (type: DatePickerTriggerHoverEvent["type"]): DatePickerTriggerHoverEvent => ({
    type,
    pointerType: "mouse",
    target: undefined,
  });

  /* -------------------------------------------------------------------------------------------
   * Classes: R-004 / R-006 / R-008 ride on the slot class, R-009 and R-010 are
   * the two state rules.
   * ----------------------------------------------------------------------------------------- */
  const classes = () => {
    const own = local.className ?? "";

    return [picker.slots.trigger(), own].filter((part) => part.length > 0).join(" ");
  };

  const classList = computed(() => ({
    // R-009: `:focus-visible:not([data-focused])` / `[data-focus-visible]` →
    // the 2pt focus ring, keyboard focus only.
    "ring-2 ring-focus ring-offset-0 ring-offset-background outline-none":
      focused() && picker.isKeyboard(),
    // R-010: `:disabled` / `[data-disabled]` / `[aria-disabled]` → `status-disabled`.
    "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
  }));

  // R-007: one transitioned property (`box-shadow`), so the list is inline and
  // the duration / curve stay on the slot class. `motion-reduce` clears the
  // list for the same reason the class cannot (an inline list wins over it).
  const style = (): StyleProp<ViewStyle> => [{ transitionProperty: "box-shadow" }, local.style];

  const pressed = signal(false);

  return (
    <View
      ref={handleRef}
      role="button"
      focusable={!isDisabled()}
      disabled={isDisabled()}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      // `aria-expanded` / `aria-haspopup`: the picker's state, as
      // `useOverlayTrigger`'s triggerProps report them.
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel ?? "Calendar"}
      onLayout={local.onLayout}
      accessibilityState={{ expanded: picker.isOpen(), disabled: isDisabled() }}
      class={classes()}
      classList={classList()}
      style={style()}
      onPress={(event) => {
        if (isDisabled()) {
          return;
        }

        notePress(event);
        // The caller's handler first, then the picker's toggle (port sheet §1.3).
        local.onPress?.(event);
        picker.toggle();
      }}
      onPressDown={(event) => {
        if (isDisabled()) {
          return;
        }

        notePress(event);

        if (!pressed()) {
          pressed.set(true);
          local.onPressChange?.(true);
        }

        local.onPressStart?.(event);
      }}
      onPressUp={(event) => {
        if (isDisabled()) {
          return;
        }

        if (pressed()) {
          pressed.set(false);
          local.onPressChange?.(false);
        }

        local.onPressUp?.(event);
      }}
      onFocus={() => {
        focused.set(true);
        // A view is focused by Tab / `focus()`, never by a pointer press.
        picker.setKeyboardModality();
        local.onFocus?.();
      }}
      onBlur={() => {
        focused.set(false);
        local.onBlur?.();
      }}
      onMouseEnter={() => {
        if (isDisabled()) {
          return;
        }

        local.onHoverStart?.(hoverEvent("hoverstart"));
        local.onHoverChange?.(true);
      }}
      onMouseLeave={() => {
        local.onHoverEnd?.(hoverEvent("hoverend"));
        local.onHoverChange?.(false);
      }}
    >
      {renderChildren(local.children)}
    </View>
  );
}
