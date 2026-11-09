/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/selection/create-controllable-selection-signal.ts
 *
 * Adapted to NSH: it builds on this repo's `createControllableSignal` and
 * reads as a plain accessor, per research section 4.4.
 */

import type { Accessor } from "nsh";

import {
  type CreateControllableSignalProps,
  createControllableSignal,
} from "../create-controllable-signal";
import { Selection } from "./types";

/**
 * Creates a simple reactive `Selection` state with a getter, setter and a
 * fallback value of an empty selection, that can be controlled with `value`
 * and `onChange` props.
 *
 * The value may also be the `"all"` sentinel: a manager resolves it against
 * its collection, because a state without a collection cannot know which keys
 * exist.
 */
export function createControllableSelectionSignal(
  props: CreateControllableSignalProps<Selection | "all">,
) {
  const [_value, setValue] = createControllableSignal(props);

  const value: Accessor<Selection | "all"> = () => _value() ?? new Selection();

  return [value, setValue] as const;
}
