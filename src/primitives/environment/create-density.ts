/*
 * `createDensity()` is the accessor of the `density` environment axis: the
 * preset name a tv() `density` variant keys on (normalize the lookup with
 * `densityKey` from `src/tokens/density.ts`). It returns the environment's
 * `density` accessor itself.
 */

import type { Accessor } from "nsh";

import type { EnvironmentDensity } from "../../tokens/density";
import { Environment } from "./environment";

/** The `density` axis of the surrounding environment. */
export function createDensity(): Accessor<EnvironmentDensity> {
  return Environment().density;
}
