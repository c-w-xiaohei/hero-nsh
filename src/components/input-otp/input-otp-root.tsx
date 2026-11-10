import type { InputProps as NshInputProps } from "nsh/base";
import { Input } from "nsh/base";
import type {
  InputRef,
  InputStyle,
  JSX,
  MouseEvent as NshMouseEvent,
  PasteEvent,
  PressEvent,
  StyleProp,
} from "nsh";
import { computed, effect, signal, split, untracked, View } from "nsh";

import { createControllableSignal } from "../../primitives";
import { joinClassNames } from "./class-names";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./input-otp-dom-props";
import { InputOTPContext, type InputOTPContextValue, type InputOTPSlots } from "./input-otp-context";
import { inputOTPVariants, type InputOTPVariants } from "./input-otp.styles";

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

/** Upstream's `EMPTY_VALIDATION_ERRORS`: the same array instance, never mutated. */
const EMPTY_VALIDATION_ERRORS: readonly string[] = [];

/**
 * `input-otp`'s `REGEXP_ONLY_DIGITS`, `REGEXP_ONLY_CHARS` and
 * `REGEXP_ONLY_DIGITS_AND_CHARS`, re-exported from the HeroUI entry as well.
 */
export const REGEXP_ONLY_DIGITS = "^\\d+$";
export const REGEXP_ONLY_CHARS = "^[a-zA-Z]+$";
export const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]+$";

/** The HTML `text-align` values `OTPInput`'s `textAlign` accepts. */
export type InputOTPTextAlign = "left" | "center" | "right";

/* -------------------------------------------------------------------------------------------------
 * <input>-only attributes
 * -----------------------------------------------------------------------------------------------*/

/**
 * The members of HeroUI's `OTPInput` props (a real `<input>`'s attributes) that
 * exist only because the DOM does. They are accepted so code written against
 * HeroUI keeps compiling; NSH has no form submission, browser constraint
 * validation or DOM key events, and port sheet §1.2 / §8 register that each one
 * has no effect.
 */
export interface InputOTPRootDomProps {
  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no form submission. */
  form?: string;

  /** Accepted, no effect: NSH has no browser constraint validation. */
  required?: boolean;

  /** Accepted, no effect: read-only is `isDisabled`'s editing half. */
  readOnly?: boolean;

  /** Accepted, no effect: NSH has no browser constraint validation. */
  minLength?: number;

  /** Accepted, no effect: the input is not a number field. */
  step?: number | string;

  /** Accepted, no effect: NSH has no datalist. */
  list?: string;

  /** Accepted, no effect: NSH has no DOM title; use `accessibilityLabel`. */
  title?: string;

  /** Accepted, no effect: NSH inputs have no spell checker. */
  spellCheck?: boolean;

  /** Accepted, no effect: NSH inputs have no size attribute. */
  size?: number;

  /** Accepted, no effect: the input is never a file input. */
  multiple?: boolean;

  /** Accepted, no effect: views have no key events (keys reach TSX through `keymap`). */
  onKeyDown?: unknown;

  /** Accepted, no effect, as `onKeyDown`. */
  onKeyUp?: unknown;

  /** Accepted, no effect: NSH has no beforeinput event. */
  onBeforeInput?: unknown;

  /** Accepted, no effect: `onChange` already reports every edit. */
  onInput?: unknown;

  /** Accepted, no effect: NSH has no copy event. */
  onCopy?: unknown;

  /** Accepted, no effect: NSH has no cut event. */
  onCut?: unknown;

  /** Accepted, no effect: views take presses through `onPress`. */
  onClick?: unknown;

  /** Accepted, no effect, as `onClick`. */
  onDoubleClick?: unknown;

  /** Accepted, no effect, as `onClick`. */
  onMouseDown?: unknown;

  /** Omitted upstream (`Omit<…, "containerClassName">`); never part of the public type. */
  containerClassName?: never;

  /** Omitted upstream (`Omit<…, "render">`); never part of the public type. */
  render?: never;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Omitted upstream (`Omit<…, "disabled">`): disabling is `isDisabled`. */
  disabled?: never;
}

/* -------------------------------------------------------------------------------------------------
 * InputOTP Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `InputOTP.Root` (= `InputOTP`): HeroUI 3.2.7's
 * `InputOTPRootProps`, which is `input-otp@1.4.2`'s `OTPInput` props without
 * `disabled` / `containerClassName` / `render`, plus this component's field
 * members and its one variant dimension.
 *
 * `className` is the *container*'s and `inputClassName` the invisible input's,
 * as upstream (an easy one to misread); `style` is the input's, as
 * `InputHTMLAttributes`' is.
 */
export interface InputOTPRootProps
  extends Omit<
      NshInputProps,
      | "children"
      | "class"
      | "classList"
      | "style"
      | "ref"
      | "value"
      | "defaultValue"
      | "onChange"
      | "onSelectionChange"
      | "onFocus"
      | "onBlur"
      | "onPaste"
      | "onMouseEnter"
      | "onMouseLeave"
      | "onPress"
      | "readonly"
      | "maxLength"
      | "keyboardType"
      | "autoComplete"
      | "id"
      | "nativeID"
      | "masked"
      | "multiline"
      | "placeholder"
      | "disabled"
      | "caret"
      | "pasteBehavior"
      | "selectedRange"
      | "testID"
    >,
    AriaProps,
    DataProps,
    GlobalDomProps,
    InputOTPRootDomProps,
    InputOTPVariants {
  /** The cells: `Group`s holding `Slot`s, with `Separator`s between them. Read once, at its placement. */
  children: JSX.Element;

  /** How many cells, and the most characters the input accepts. */
  maxLength: number;

  /** The code, controlled. Without it the code is the input's own, from `defaultValue`. */
  value?: string;

  /** The code at first, uncontrolled. @default "" */
  defaultValue?: string;

  /** The code changed; the payload is the whole new code. */
  onChange?: (value: string) => void;

  /**
   * The code first reached `maxLength` (it was shorter before and is that long
   * now). Editing a full code does not fire it again.
   */
  onComplete?: (value: string) => void;

  /**
   * A regular expression source the whole code must match while it is not
   * empty. A candidate that fails it is rejected whole: the edit does not land
   * and `onChange` is not called (upstream's `preventDefault` path).
   */
  pattern?: string;

  /** Where the invisible text sits inside the field. @default "left" */
  textAlign?: InputOTPTextAlign;

  /**
   * Upstream widens the input by 40px and clips it for the browser's password
   * manager. NSH has no password-manager popup, so the prop is accepted and
   * changes nothing (port sheet §8). @default "increase-width"
   */
  pushPasswordManagerStrategy?: "increase-width" | "none";

  /** Runs over pasted text before it is inserted; the result is what lands. */
  pasteTransformer?: (pasted: string) => string;

  /** Upstream injects this CSS through `<noscript>`; NSH has no such layer (port sheet §8). */
  noScriptCSSFallback?: string | null;

  /** Shown while the code is empty; invisible inside the field, as upstream's transparent text. */
  placeholder?: string;

  /** The keyboard the platform shows. @default "numeric" */
  inputMode?: string;

  /** Passed to the host when NSH knows the value. @default "one-time-code" */
  autoComplete?: string;

  /** Blocks edits, focus and the input; dims the container and the cells. @default false */
  isDisabled?: boolean;

  /** Paints the cells' danger outline and feeds the `FieldError` inside. @default false */
  isInvalid?: boolean;

  /** Handed to the `FieldError` inside the root; this component draws no error text. */
  validationErrors?: string[];

  /** Handed to the `FieldError` inside the root, untranslated (`unknown` at the FieldError side). */
  validationDetails?: unknown;

  /** Appended to the container's slot classes; later classes win. */
  className?: string;

  /** Appended to the invisible input's slot classes; later classes win. */
  inputClassName?: string;

  /** Style of the invisible input (not the container, which has no style channel upstream either). */
  style?: StyleProp<InputStyle>;

  /** A DOM id upstream; maps to the input's `nativeID`. */
  id?: string;

  /** The name other elements refer to (NSH's counterpart of a DOM id). */
  nativeID?: string;

  /** Focuses the input when it mounts. */
  autoFocus?: boolean;

  /** The input took focus; also moves the selection to the last cell, as upstream. */
  onFocus?: () => void;

  /** The input lost focus. */
  onBlur?: () => void;

  /** The user pasted; NSH reports the content instead of a DOM `ClipboardEvent`. Called before the insert. */
  onPaste?: (event: PasteEvent) => void;

  /** The pointer came over the input; upstream's `onMouseOver`. */
  onMouseOver?: (event: NshMouseEvent) => void;

  /** The pointer left the input. */
  onMouseLeave?: (event: NshMouseEvent) => void;

  /** The caret / selection moved; also drives which cell is active. */
  onSelect?: (event: { start: number; end: number }) => void;

  /** The fill flavor: the cells' surface. @default "primary" */
  variant?: InputOTPVariants["variant"];

  /** The input's keyboard layout, winning over `inputMode`. */
  keyboardType?: NshInputProps["keyboardType"];

  /** The accessible name of the input. */
  "aria-label"?: string;

  /** The accessible name through NSH's own prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** The input's ref (upstream's `ComponentPropsWithRef<typeof OTPInput>`): a callback, as NSH forwards refs. */
  ref?: (node: InputRef) => void;
}

/**
 * `InputOTP.Root` / `InputOTPRoot`: the field. It owns the code, the focus
 * signal and the selection, paints the flex container, provides the private
 * context its parts read and the `FieldError` context the error text uses, and
 * renders one absolutely positioned native input over the whole field — the
 * shape `input-otp` gives HeroUI (port sheet §3).
 *
 * The input is the only thing the user touches: the cells are painted views
 * behind it, and its selection decides which cell is active. NSH has no DOM
 * selection, so this port reads it from `Input`'s `onSelectionChange` and
 * writes it back with `InputRef.setSelection` (port sheet §5).
 */
export function InputOTPRoot(props: InputOTPRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "maxLength",
    "value",
    "defaultValue",
    "onChange",
    "onComplete",
    "pattern",
    "textAlign",
    "pushPasswordManagerStrategy",
    "pasteTransformer",
    "noScriptCSSFallback",
    "placeholder",
    "inputMode",
    "autoComplete",
    "isDisabled",
    "isInvalid",
    "validationErrors",
    "validationDetails",
    "className",
    "inputClassName",
    "style",
    "id",
    "nativeID",
    "autoFocus",
    "onFocus",
    "onBlur",
    "onPaste",
    "onMouseOver",
    "onMouseLeave",
    "onSelect",
    "variant",
    "keyboardType",
    "aria-label",
    "accessibilityLabel",
    "ref",
    // DOM-only attributes and events, accepted with no effect.
    "name",
    "form",
    "required",
    "readOnly",
    "minLength",
    "step",
    "list",
    "title",
    "spellCheck",
    "size",
    "multiple",
    "onKeyDown",
    "onKeyUp",
    "onBeforeInput",
    "onInput",
    "onCopy",
    "onCut",
    "onClick",
    "onDoubleClick",
    "onMouseDown",
    "containerClassName",
    "render",
    "slot",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "disabled",
  ] as const);

  // --- Variant table --------------------------------------------------------
  // Re-resolved against the current props: the context hands each part an
  // accessor over the fresh table, so a runtime `variant` change re-resolves
  // every cell.
  const resolvedSlots = computed(() => inputOTPVariants({ variant: local.variant }));

  const slots: InputOTPSlots = {
    base: () => resolvedSlots().base(),
    caret: () => resolvedSlots().caret(),
    group: () => resolvedSlots().group(),
    input: () => resolvedSlots().input(),
    separator: () => resolvedSlots().separator(),
    slot: () => resolvedSlots().slot(),
    slotValue: () => resolvedSlots().slotValue(),
  };

  const variant = computed<"primary" | "secondary">(() => local.variant ?? "primary");

  // --- Effective state ------------------------------------------------------
  const maxLength = () => local.maxLength;
  const isDisabled = computed(() => local.isDisabled ?? false);
  const isInvalid = computed(() => local.isInvalid ?? false);

  // --- Code -----------------------------------------------------------------
  // `input-otp`'s state: `value != null ? value : internal`, the internal one
  // started from `defaultValue`.
  const [value, setValue] = createControllableSignal<string>({
    value: () => local.value,
    defaultValue: () => local.defaultValue ?? "",
    onChange: (next) => local.onChange?.(next),
  });

  const text = () => value() ?? "";

  // What the host input shows. It follows the accepted code, and it is also the
  // channel a rejected or corrected edit is written back through: NSH's input
  // applies a `value` prop when the prop changes, so a controlled field whose
  // owner keeps its code would otherwise keep the characters the user just
  // typed. Writing a distinct value and then the owner's one makes the
  // correction land; both writes are in the same turn, so no frame shows the
  // intermediate text (the search field's measured practice).
  const display = signal(text());

  effect(() => {
    const next = text();

    if (untracked(() => display()) !== next) {
      display.set(next);
    }
  });

  const correctHost = (next: string) => {
    // The host ignores a `value` it already carries, so a distinct value goes
    // first; the second write is the code the field must show.
    display.set(`${next}\u200B`);
    display.set(next);
  };

  // --- Pattern --------------------------------------------------------------
  // R-§1.2: upstream compiles the source once per `pattern`; an invalid
  // expression upstream would throw inside the handler, so it filters nothing
  // here.
  const patternRegExp = computed<RegExp | undefined>(() => {
    const source = local.pattern;

    if (source === undefined || source.length === 0) {
      return undefined;
    }

    try {
      return new RegExp(source);
    } catch {
      return undefined;
    }
  });

  /** The candidate as it may land, or `null` when `pattern` rejects it whole. */
  const accept = (candidate: string): string | null => {
    const expression = patternRegExp();

    if (candidate.length > 0 && expression !== undefined && !expression.test(candidate)) {
      return null;
    }

    return candidate;
  };

  // --- Focus and selection ---------------------------------------------------
  const focused = signal(false);
  const selection = signal<{ start: number; end: number }>({ start: 0, end: 0 });

  let inputNode: InputRef | undefined;

  const setSelection = (start: number, end: number) => {
    selection.set({ start, end });
    inputNode?.setSelection(start, end);
  };

  // `input-otp`'s active cells: nothing without focus, the caret's cell alone
  // when `start === end`, else `start … end - 1`. Both ends are held inside
  // `0 … maxLength`, so a caret past the last cell activates none.
  const activeSlots = computed<readonly number[]>(() => {
    if (!focused()) {
      return [];
    }

    const limit = maxLength();
    const { start, end } = selection();
    const lower = Math.max(0, Math.min(start, end, limit));
    const upper = Math.max(0, Math.min(Math.max(start, end), limit));

    if (lower === upper) {
      return [lower];
    }

    const cells: number[] = [];

    for (let index = lower; index < upper; index += 1) {
      cells.push(index);
    }

    return cells;
  });

  // --- onComplete ------------------------------------------------------------
  // `input-otp`'s effect: the first time the code goes from shorter to exactly
  // `maxLength` long. An initial `defaultValue` at full length does not fire it,
  // and neither does editing a full code.
  const previousValue = signal<string | undefined>(undefined);

  effect(() => {
    const current = text();
    const previous = untracked(() => previousValue());
    const limit = untracked(() => maxLength());

    if (
      previous !== undefined &&
      current !== previous &&
      previous.length < limit &&
      current.length === limit
    ) {
      local.onComplete?.(current);
    }

    previousValue.set(current);
  });

  // --- Edits -----------------------------------------------------------------
  // The caret an edit leaves behind, from the two texts alone: the common
  // prefix, then the run the edit inserted or removed. `NSH` reports the
  // selection too, but not before this handler runs, and the fake caret must
  // move with the edit.
  const caretAfterEdit = (before: string, after: string): number => {
    let prefix = 0;

    while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) {
      prefix += 1;
    }

    let suffix = 0;

    while (
      suffix < before.length - prefix &&
      suffix < after.length - prefix &&
      before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
    ) {
      suffix += 1;
    }

    return prefix + (after.length - prefix - suffix);
  };

  const handleChange = (event: { value: string }) => {
    const candidate = event.value;
    const previous = untracked(() => text());
    const previousSelection = untracked(() => selection());

    const accepted = accept(candidate);

    if (accepted === null) {
      // Upstream's `preventDefault`: the code stays, the host's text is put
      // back and the caret returns to where it was.
      correctHost(previous);
      selection.set(previousSelection);
      inputNode?.setSelection(previousSelection.start, previousSelection.end);
      return;
    }

    setValue(accepted);

    // The owner may have answered this edit synchronously; when it did not, the
    // host's text is the user's characters while the field's code is the
    // owner's, and React's controlled input would restore the owner's text here.
    const expected = value() ?? "";

    if (expected !== candidate) {
      correctHost(expected);
      const caret = Math.min(previousSelection.start, expected.length);
      selection.set({ start: caret, end: caret });
      inputNode?.setSelection(caret, caret);
      return;
    }

    const caret = caretAfterEdit(previous, candidate);
    selection.set({ start: caret, end: caret });
  };

  const handlePaste = (event: PasteEvent) => {
    local.onPaste?.(event);

    if (isDisabled()) {
      return;
    }

    // R-§2: `pasteTransformer` first, then the insert at the selection, held to
    // `maxLength`. The host is in `pasteBehavior="report"` mode, so nothing was
    // inserted before this handler and the whole edit is this one.
    const pasted = local.pasteTransformer?.(event.text) ?? event.text;
    const { start, end } = untracked(() => selection());
    const lower = Math.max(0, Math.min(start, end));
    const upper = Math.max(0, Math.max(start, end));
    const current = untracked(() => text());
    const candidate = (current.slice(0, lower) + pasted + current.slice(upper)).slice(0, maxLength());
    const accepted = accept(candidate);

    if (accepted === null) {
      return;
    }

    setValue(accepted);

    const expected = value() ?? "";
    const caret = Math.min(lower + pasted.length, expected.length);

    if (expected !== candidate) {
      correctHost(expected);
    }

    selection.set({ start: caret, end: caret });
    inputNode?.setSelection(caret, caret);
  };

  const handleSelectionChange = (event: { start: number; end: number }) => {
    selection.set({ start: event.start, end: event.end });
    // HeroUI's `onSelect` is a DOM event on the same element; NSH has only the
    // selection channel, so it is reported through it (port sheet §1.2).
    local.onSelect?.(event);
  };

  const handleFocus = () => {
    focused.set(true);
    // Upstream's focus handler: select the last cell (or the caret's place in a
    // shorter code), which makes typing over a full field replace the last
    // character.
    const length = untracked(() => text()).length;
    const start = Math.max(0, Math.min(length, maxLength() - 1));
    setSelection(start, length);
    local.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    local.onBlur?.();
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    if (isDisabled()) {
      return;
    }

    local.onMouseOver?.(event);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);
  };

  // A press anywhere on the field focuses the input, as a browser's click does.
  // NSH's input hears presses only while it has an `onPress` handler and a
  // press on a view does not focus it by itself, so the input takes presses and
  // moves its own focus (the search field's measured practice). Return / Space
  // on the focused input arrive as a press too; focusing again is a no-op.
  const handlePress = (_event: PressEvent) => {
    if (!isDisabled()) {
      inputNode?.focus();
    }
  };

  // --- Keyboard and attributes ----------------------------------------------
  const keyboardType = computed<NshInputProps["keyboardType"]>(() => {
    if (local.keyboardType !== undefined) {
      return local.keyboardType;
    }

    switch (local.inputMode ?? "numeric") {
      case "decimal":
        return "decimal-pad";
      case "email":
        return "email-address";
      case "tel":
        return "phone-pad";
      case "url":
        return "url";
      case "numeric":
        return "numeric";
      default:
        return "default";
    }
  });

  const autoComplete = computed(() => toAutoComplete(local.autoComplete ?? "one-time-code"));

  // The accessible name: a DOM `aria-label` upstream reaches the input element,
  // which NSH names through its own prop. Only a string names anything.
  const accessibilityLabel = computed<string | undefined>(() => {
    const fromAria = local["aria-label"];

    return typeof fromAria === "string" ? fromAria : local.accessibilityLabel;
  });

  // --- Classes ---------------------------------------------------------------
  const classes = computed(() => joinClassNames(slots.base(), local.className));

  const inputClasses = computed(() => joinClassNames(slots.input(), local.inputClassName));

  // R-033: `text-align: <textAlign>` — the invisible text and the native
  // selection rectangle only. A caller's own style goes first, as later
  // entries win.
  const inputStyle = computed<StyleProp<InputStyle>>(() => [
    local.style,
    { textAlign: local.textAlign ?? "left" },
  ]);

  // --- Contexts -------------------------------------------------------------
  const contextValue: InputOTPContextValue = {
    slots,
    variant,
    value: text,
    maxLength,
    isDisabled,
    isInvalid,
    isFocused: focused,
    activeSlots,
  };

  const fieldErrorState: FieldErrorState = {
    isInvalid,
    validationErrors: () => local.validationErrors ?? EMPTY_VALIDATION_ERRORS,
    validationDetails: () => local.validationDetails,
  };

  return (
    <InputOTPContext.Provider value={contextValue}>
      <FieldErrorContext.Provider value={fieldErrorState}>
        <View
          testID="input-otp"
          class={classes()}
          classList={{
            // R-002: `.input-otp[data-disabled="true"]` → `cursor-not-allowed
            // opacity-50` (the pointer half arrives with R-003's class).
            "opacity-50 cursor-not-allowed": isDisabled(),
          }}
        >
          {/*
            The single read of `children`, at its placement inside both
            providers (research 4.1 / 4.6 and the provider exception): a
            computed made in the body would evaluate outside the context and
            the cells would lose it.
          */}
          {local.children}
          <Input
            {...hostProps(rest)}
            ref={(node) => {
              inputNode = node;
              local.ref?.(node);
            }}
            // A fixed test identity, not a public prop (port sheet §4b).
            testID="input-otp-input"
            nativeID={local.id ?? local.nativeID}
            value={display()}
            onChange={handleChange}
            onSelectionChange={handleSelectionChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onPaste={handlePaste}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onPress={handlePress}
            disabled={isDisabled()}
            // NSH 0.4.0's headless input stays editable with `disabled` alone;
            // a disabled field is non-editable, which `readonly` carries.
            readonly={isDisabled()}
            maxLength={maxLength()}
            placeholder={local.placeholder}
            autoFocus={local.autoFocus}
            autoComplete={autoComplete()}
            keyboardType={keyboardType()}
            // R-030: the native caret is the fake caret's counterpart, off.
            caret={false}
            // R-§1.2 / §2: the paste is computed in `handlePaste`, so the host
            // inserts nothing.
            pasteBehavior="report"
            class={inputClasses()}
            style={inputStyle()}
            accessibilityLabel={accessibilityLabel()}
          />
        </View>
      </FieldErrorContext.Provider>
    </InputOTPContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/** NSH's `AutoComplete` values, as the host understands them. */
const AUTO_COMPLETE_VALUES: readonly string[] = [
  "off",
  "username",
  "password",
  "current-password",
  "new-password",
  "one-time-code",
  "sms-otp",
  "email",
  "tel",
  "name",
  "given-name",
  "family-name",
  "additional-name",
  "nickname",
  "organization",
  "street-address",
  "address-line1",
  "address-line2",
  "address-level1",
  "address-level2",
  "postal-code",
  "country",
  "cc-number",
  "cc-exp",
  "cc-csc",
  "cc-name",
  "url",
  "birthdate-full",
];

/** Passes an HTML `autoComplete` through when NSH knows it; drops the rest (`"on"`). */
function toAutoComplete(value: string | undefined): NshInputProps["autoComplete"] {
  if (value === undefined || !AUTO_COMPLETE_VALUES.includes(value)) {
    return undefined;
  }

  return value as NshInputProps["autoComplete"];
}
