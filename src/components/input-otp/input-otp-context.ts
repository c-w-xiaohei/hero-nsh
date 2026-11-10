import { context } from "nsh";

/**
 * What an `InputOTP` root tells its parts.
 *
 * HeroUI has two contexts for this component: its own `InputOTPContext`
 * (`{ slots?, isDisabled?, isInvalid? }`) and `input-otp`'s
 * `OTPInputContext` (`{ slots, isFocused, isHovering }`, whose `slots[index]`
 * carries `{ char, isActive, hasFakeCaret }`). Neither is exported from the
 * HeroUI entry, and NSH needs one channel, so the two are merged here. The
 * derived per-slot values are not sent down: `Slot` computes `char`,
 * `isActive` and `hasFakeCaret` from `value` and `activeSlots`, exactly as
 * `input-otp` does (port sheet §1.1, §2).
 *
 * The shape is this unit's replacement contract (port sheet §5 / §8).
 */
export interface InputOTPContextValue {
  /** The root's variant table; each part calls its own slot. */
  slots: InputOTPSlots;

  /** The resolved fill flavor; the cells' active / filled fill differs in `secondary` (R-027). */
  variant: () => "primary" | "secondary";

  /** The code, live. */
  value: () => string;

  /** How many cells there are, and the oldest input's limit. */
  maxLength: () => number;

  /** The root is disabled: the cells dim and the input takes no edits. */
  isDisabled: () => boolean;

  /** The root is invalid: the cells take the danger outline. */
  isInvalid: () => boolean;

  /** The input has keyboard focus; the fake caret only exists while it does. */
  isFocused: () => boolean;

  /**
   * The cells the DOM selection covers, as `input-otp` derives them: empty
   * while unfocused, the caret's cell alone when it is a caret, else
   * `start … end - 1`.
   */
  activeSlots: () => readonly number[];
}

/** The live slot class strings of one `InputOTP` root, re-resolved per read. */
export interface InputOTPSlots {
  /** The container's flex row and pointer behaviour (R-001, R-003). */
  base: () => string;

  /** The fake caret's box and colour (R-020). */
  caret: () => string;

  /** A group's flex row (R-004). */
  group: () => string;

  /** The covering input's absolute box and transparent look (R-029 … R-031). */
  input: () => string;

  /** The 2×6 separator bar (R-022). */
  separator: () => string;

  /** A cell's box, fill, shadow and transition (R-005 … R-008, R-010). */
  slot: () => string;

  /** The cell's character (R-017, R-019). */
  slotValue: () => string;
}

/** Root → parts; `undefined` outside an `InputOTP`. */
export const InputOTPContext = context<InputOTPContextValue | undefined>(undefined);
