import type { JSX } from "nsh";

import type { TextControlCommonProps } from "./text-control";
import { renderTextControl } from "./text-control";
import { inputVariants } from "./input.styles";

/* -------------------------------------------------------------------------------------------------
 * Input props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Input.Root`: HeroUI 3.2.7's `InputRootProps`, which is React
 * Aria Components' `Input` (`InputHTMLAttributes<HTMLInputElement>`,
 * `HoverEvents` and `StyleRenderProps<InputRenderProps, "input">`) plus the
 * variant dimensions, expressed with NSH's `<Input>` host props.
 *
 * Inside a `TextField` the value, disabled, read-only, invalid and accessible
 * names come from `TextFieldContext`; explicit props win, as React Aria's merge
 * does. Standalone, the input is a plain controlled / uncontrolled text field
 * (port sheet §1.3).
 */
export interface InputRootProps extends TextControlCommonProps {
  /**
   * The HTML input type; drives the keyboard layout and masking only
   * (`password` → `masked`, `email` → `email-address`, `tel` → `phone-pad`,
   * `url` → `url`, `number` → `decimal-pad`, the rest `default`).
   */
  type?:
    | "text"
    | "search"
    | "email"
    | "password"
    | "tel"
    | "url"
    | "number"
    | "date"
    | "time"
    | "datetime-local"
    | "month"
    | "week"
    | (string & {});

  /** Hides the text (passwords); `type="password"` turns it on. */
  masked?: boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Input
 * -----------------------------------------------------------------------------------------------*/

/**
 * Input / InputRoot: the native single-line text input (nsh/base `Input`, port
 * sheet §3 B1 … B4). It holds no value of its own inside a field; it writes the
 * root's and follows it, so a controlled field has exactly one source of truth.
 */
export function InputRoot(props: InputRootProps): JSX.Element {
  return renderTextControl(props, {
    multiline: false,
    usesRows: false,
    // R-017 / R-018 / R-022 live in `input.styles.ts`; the state classes are
    // computed in `text-control.tsx` (R-012 … R-015, R-019 … R-021).
    baseClass: ({ fullWidth, variant }) => inputVariants({ fullWidth, variant }),
  });
}
