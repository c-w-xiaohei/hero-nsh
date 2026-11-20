/*
 * `EnvironmentScope` injects an environment: it reads the environment above
 * it, overrides the fields its props name, and provides the merged value to
 * its children. Fields it does not name keep the outer value, so a scope that
 * says `input="touch"` still inherits the host's real `width` and `density`,
 * and a nested scope wins over the outer one field by field.
 *
 * Its two uses: tests mount it to drive the injected-environment half of a
 * `.mobile.test.tsx`, and a real mixed device (a tablet with a trackpad, an
 * embedded surface) mounts it where the host's own report is wrong. It never
 * replaces the default — outside every scope the host-derived value stands.
 */

import type { JSX } from "nsh";

import type { EnvironmentDensity } from "../../tokens/density";
import {
  Environment,
  type EnvironmentInput,
  type EnvironmentWidth,
} from "./environment";

export interface EnvironmentScopeProps {
  /** Overrides `Environment().input` for the subtree. */
  input?: EnvironmentInput;

  /** Overrides `Environment().width` for the subtree. */
  width?: EnvironmentWidth;

  /** Overrides `Environment().density` for the subtree. */
  density?: EnvironmentDensity;

  children?: JSX.Element;
}

export function EnvironmentScope(props: EnvironmentScopeProps): JSX.Element {
  const outer = Environment();

  return (
    <Environment.Provider
      value={{
        input: () => props.input ?? outer.input(),
        width: () => props.width ?? outer.width(),
        density: () => props.density ?? outer.density(),
      }}
    >
      {props.children}
    </Environment.Provider>
  );
}
