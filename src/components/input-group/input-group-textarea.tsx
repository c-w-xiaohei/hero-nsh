import type { JSX, PressEvent } from "nsh";
import { cleanup, signal } from "nsh";

import { isKeyboardPress } from "../../primitives/create-interaction-modality";
import { renderTextControl } from "../textfield/text-control";
import type { TextAreaRootProps } from "../textfield/textarea";
import { joinClassNames } from "./class-names";
import { InputGroupContext } from "./input-group-context";

/* -------------------------------------------------------------------------------------------------
 * TextArea props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `InputGroup.TextArea`: HeroUI 3.2.7's
 * `InputGroupTextAreaProps`, which is React Aria Components' `TextArea`
 * (`TextareaHTMLAttributes`, the hover events, the render props and `rows`).
 * Everything `InputGroup.Input` accepts except `type` / `masked`, plus the
 * textarea's own attributes; the two variant dimensions belong to the group.
 */
export type InputGroupTextAreaProps = Omit<TextAreaRootProps, "variant" | "fullWidth">;

/* -------------------------------------------------------------------------------------------------
 * TextArea
 * -----------------------------------------------------------------------------------------------*/

/**
 * InputGroup.TextArea / InputGroupTextArea: the multi-line control of the
 * group. It shares the `input` slot with the single-line control (R-020 adds a
 * minimum height) and the same wiring; it does not register a focus handle,
 * because upstream's `querySelector("input")` never picks a `<textarea>`.
 */
export function InputGroupTextArea(props: InputGroupTextAreaProps): JSX.Element {
  const group = InputGroupContext();
  const focused = signal(false);

  cleanup(group.registerFocusTarget(focused));
  // R-008 / R-024 / R-029: the root aligns to the top and the affixes gain
  // `pt-2` while a textarea is inside.
  cleanup(group.registerTextArea());

  return renderTextControl(
    forwardTextAreaProps(props, {
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
      multiline: true,
      usesRows: true,
      // The group owns every state class, exactly as for the single-line input.
      stateClasses: false,
      // R-015 / R-020: the input slot plus the textarea's minimum height.
      // R-021: the CSS `resize: vertical` handle is accepted and dropped, as
      // NSH has no resize grip. R-016 / R-017 follow the affix registrations.
      baseClass: () =>
        joinClassNames(
          group.slots().input(),
          // R-020: `.input-group__input[data-slot="input-group-textarea"]` →
          // `min-height: 38px`. `rows`' inline height usually wins over it, as
          // upstream's `<textarea rows={2}>` does.
          "min-h-[38px]",
          group.hasPrefix() ? "rounded-s-none ps-0" : undefined,
          group.hasSuffix() ? "rounded-e-none pe-0" : undefined,
        ),
    },
  );
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/** A getter-forwarding view of the props with the focus / press hooks replaced (see `Input`). */
function forwardTextAreaProps(
  props: InputGroupTextAreaProps,
  overrides: Record<string, () => unknown>,
): InputGroupTextAreaProps {
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

  return result as unknown as InputGroupTextAreaProps;
}
