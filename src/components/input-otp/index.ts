import { InputOTPGroup } from "./input-otp-group";
import type { InputOTPGroupProps } from "./input-otp-group";
import { InputOTPRoot } from "./input-otp-root";
import type { InputOTPRootProps } from "./input-otp-root";
import { InputOTPSeparator } from "./input-otp-separator";
import type { InputOTPSeparatorProps } from "./input-otp-separator";
import { InputOTPSlot } from "./input-otp-slot";
import type { InputOTPSlotProps } from "./input-otp-slot";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `InputOTP` is HeroUI 3.2.7's four-part one-time-code field: the root owns the
 * code and the input, a group holds cells, a slot is one cell and a separator
 * is the dash between groups. Every part is a real component, usable as
 * `InputOTP.Slot` and as `InputOTPSlot`, exactly as upstream exports them.
 */
export const InputOTP = Object.assign(InputOTPRoot, {
  Root: InputOTPRoot,
  Group: InputOTPGroup,
  Slot: InputOTPSlot,
  Separator: InputOTPSeparator,
});

export type InputOTP = {
  Props: InputOTPRootProps;
  RootProps: InputOTPRootProps;
  GroupProps: InputOTPGroupProps;
  SlotProps: InputOTPSlotProps;
  SeparatorProps: InputOTPSeparatorProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { InputOTPGroup, InputOTPRoot, InputOTPSeparator, InputOTPSlot };

export type {
  InputOTPRootProps,
  InputOTPRootProps as InputOTPProps,
} from "./input-otp-root";
export type { InputOTPGroupProps } from "./input-otp-group";
export type { InputOTPSlotProps } from "./input-otp-slot";
export type { InputOTPSeparatorProps } from "./input-otp-separator";

/* -------------------------------------------------------------------------------------------------
 * Pattern constants
 * -----------------------------------------------------------------------------------------------*/
export {
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from "./input-otp-root";

export type { InputOTPTextAlign } from "./input-otp-root";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { inputOTPVariants } from "./input-otp.styles";

export type { InputOTPVariants } from "./input-otp.styles";
