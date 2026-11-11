import type { InputRef, JSX, PressEvent } from "nsh";
import { cleanup, signal } from "nsh";

import { isKeyboardPress } from "../../primitives/create-interaction-modality";
import type { TextControlProps } from "../textfield/text-control";
import { renderTextControl } from "../textfield/text-control";
import { joinClassNames } from "./class-names";
import { InputGroupContext } from "./input-group-context";

/* -------------------------------------------------------------------------------------------------
 * Input props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `InputGroup.Input`: HeroUI 3.2.7's `InputGroupInputProps`, which
 * is React Aria Components' `Input` (`InputHTMLAttributes`, the hover events
 * and the render props). The value, disabled, read-only, invalid and accessible
 * names come from the `TextFieldContext` the group sits in; the two variant
 * dimensions belong to the group, so they are omitted here.
 *
 * `type` / `masked` stay available (upstream's `Input` is an `<input>` with a
 * `type`), while the textarea-only members of the shared control are removed.
 */
export type InputGroupInputProps = Omit<
  TextControlProps,
  "variant" | "fullWidth" | "rows" | "cols" | "wrap"
>;

/* -------------------------------------------------------------------------------------------------
 * Input
 * -----------------------------------------------------------------------------------------------*/

/**
 * InputGroup.Input / InputGroupInput: the single-line control of the group.
 *
 * It is nsh/base's `Input` behind `textfield/text-control`'s wiring — the value,
 * disabled / read-only / invalid state, attribute mappings, paste, composition
 * and press-to-focus all stay there — with the group's `input` slot as its base
 * class and the control's own state classes turned off (`stateClasses: false`):
 * the group paints the hover fill, the focus ring and the invalid outline, so
 * the control keeps only `outline-none` (port sheet §3, §5 item 6).
 */
export function InputGroupInput(props: InputGroupInputProps): JSX.Element {
  const group = InputGroupContext();
  const focused = signal(false);

  let node: InputRef | undefined;

  cleanup(group.registerFocusTarget(focused));
  cleanup(group.registerInputFocus(() => node?.focus()));

  return renderTextControl(
    forwardControlProps(props, {
      ref: () => (next: InputRef) => {
        node = next;
        props.ref?.(next);
      },
      // R-012: the group's focus-within comes from this signal. A text input is
      // focused by a click too, so the modality comes from the press that
      // caused the focus, as React Aria decides it.
      onFocus: () => () => {
        if (!group.consumePointerFocus()) {
          group.setKeyboardModality();
        }

        focused.set(true);
        props.onFocus?.();
      },
      onBlur: () => () => {
        focused.set(false);
        props.onBlur?.();
      },
      onPress: () => (event: PressEvent) => {
        if (isKeyboardPress(event)) {
          group.setKeyboardModality();
        } else {
          group.requestPointerFocus();
          group.setPointerModality();
        }

        props.onPress?.(event);
      },
    }),
    {
      multiline: false,
      usesRows: false,
      // The group owns every state class (R-011 … R-014, R-033 … R-036).
      stateClasses: false,
      // R-015 plus the two `:has()` rules the affixes report: R-016 drops the
      // left rounding / padding, R-017 the right ones.
      baseClass: () =>
        joinClassNames(
          group.slots().input(),
          group.hasPrefix() ? "rounded-s-none ps-0" : undefined,
          group.hasSuffix() ? "rounded-e-none pe-0" : undefined,
        ),
    },
  );
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/**
 * A forwarding view of the caller's props for `renderTextControl`, with a few
 * members replaced. Every key stays a getter over the caller's object, so a
 * prop that changes after mount still reaches the control as it does when it is
 * passed straight through; a plain spread would freeze the first value.
 */
function forwardControlProps(
  props: InputGroupInputProps,
  overrides: Record<string, () => unknown>,
): InputGroupInputProps {
  const result: Record<string, unknown> = {};
  const source = props as unknown as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    Object.defineProperty(result, key, {
      enumerable: true,
      configurable: true,
      get: () => source[key],
    });
  }

  for (const [key, read] of Object.entries(overrides)) {
    Object.defineProperty(result, key, {
      enumerable: true,
      configurable: true,
      get: read,
    });
  }

  return result as unknown as InputGroupInputProps;
}
