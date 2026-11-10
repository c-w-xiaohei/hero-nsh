import type { JSX, StyleProp } from "nsh";

import type { TextControlCommonProps, TextControlStyle, TextControlStyleRenderProps } from "./text-control";
import { renderTextControl } from "./text-control";
import { textAreaVariants } from "./textarea.styles";

/* -------------------------------------------------------------------------------------------------
 * TextArea props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `TextArea.Root`: HeroUI 3.2.7's `TextAreaRootProps`, which is
 * React Aria Components' `TextArea` (`TextareaHTMLAttributes<HTMLTextAreaElement>`,
 * `HoverEvents` and `StyleRenderProps<InputRenderProps, "textarea">`) plus the
 * variant dimensions, expressed with NSH's `<Input>` host props (multiline).
 *
 * Everything `Input` accepts except `type` / `masked`; the differences are the
 * textarea's own attributes and the height that `rows` becomes (port sheet
 * §1.4).
 */
export interface TextAreaRootProps
  extends Omit<TextControlCommonProps, "style"> {
  /** The initial number of lines; the height is `(rows ?? 2) × 20 + 16` (port sheet §5). */
  rows?: number;

  /** Accepted, no effect: NSH wraps by its layout width. */
  cols?: number;

  /** Accepted, no effect: NSH wraps by its layout width. */
  wrap?: "hard" | "soft" | "off";

  /** Style of the textarea; function form gets the same accessors. `resize` is accepted, no effect. */
  style?:
    | StyleProp<TextControlStyle>
    | ((values: TextControlStyleRenderProps) => StyleProp<TextControlStyle>);
}

/* -------------------------------------------------------------------------------------------------
 * TextArea
 * -----------------------------------------------------------------------------------------------*/

/**
 * TextArea / TextAreaRoot: the native multi-line text field (nsh/base `Input`
 * with `multiline`, port sheet §3). Its value wiring is identical to `Input`'s;
 * `rows` becomes an inline height and the CSS `resize` handle has no NSH
 * counterpart (§8).
 */
export function TextAreaRoot(props: TextAreaRootProps): JSX.Element {
  return renderTextControl(props, {
    multiline: true,
    usesRows: true,
    // R-036 / R-037 / R-041 live in `textarea.styles.ts`; the state classes are
    // computed in `text-control.tsx` (R-031 … R-034, R-038 … R-040).
    baseClass: ({ fullWidth, variant }) => textAreaVariants({ fullWidth, variant }),
  });
}
