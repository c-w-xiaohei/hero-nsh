/*
 * `createInput()` is the accessor of the `input` environment axis: what the
 * tv() `input` variant reads, what `createPan({ enabled })` gates on, and the
 * default source of touch-ness inside `createSelectableItem` and
 * `createInteractionModality`. It returns the environment's `input` accessor
 * itself, so `const input = createInput(); variants({ input: input() })`
 * stays reactive to an `EnvironmentScope` remount.
 */

import { Environment, type EnvironmentInput } from "./environment";
import type { Accessor } from "nsh";

/** The `input` axis of the surrounding environment. */
export function createInput(): Accessor<EnvironmentInput> {
  return Environment().input;
}
