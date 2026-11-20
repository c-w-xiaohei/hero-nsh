/*
 * The single evaluation point of the presentation pipeline (encapsulation.md
 * §1 ③): `createPresentation` collapses "what container should this overlay
 * take" into one accessor — `"panel" | "sheet" | "fullscreen"`. Consumers
 * (Select's three carriers, the two-state Popover/Menu/Autocomplete/
 * ComboBox/picker overlays, the Modal/AlertDialog carrier branch, Sheet as
 * the `"sheet"` carrier) read the value and swap carriers; they never
 * re-derive it, so a component file never grows its own touch/size
 * reasoning.
 *
 * The evaluation order at open time:
 *
 *   1. pin: a caller-supplied `presentation` prop wins outright. `"auto"`
 *      and `undefined` mean "take the auto rule". A pin outside `allowed`
 *      still returns the pin — the type parameter narrows the prop's domain
 *      per consumer and the runtime never throws (encapsulation §6, dev
 *      warnings live with the consumer sheets).
 *   2. auto rule: `input() === "touch"` and `width() === "compact"` — the
 *      short-side-under-640 class the environment unit already owns, so raw
 *      `windowSize` is never read here — picks `"sheet"`, falling back to
 *      `"panel"` when the component's `allowed` domain excludes it.
 *   3. otherwise `"panel"`, falling back to the domain's first member when
 *      `"panel"` is not allowed.
 *
 * Latching: the value computes once on `isOpen`'s false→true edge and is
 * held until close — a rotation, a resized window or a flipped pin can
 * never swap the container under the user's hands. On close the latch
 * releases; the next open re-evaluates against the environment then in
 * force. While closed the accessor still evaluates live, so a closed
 * overlay previews the value its next open will take.
 *
 * `Environment()` resolves in the factory body (owner scope), the same rule
 * `createSelectableItem` follows: a context lookup sees the environment of
 * the owner that called the factory, so it must never be read in a handler.
 */

import { effect, signal, untracked, type Accessor } from "nsh";

import { Environment } from "../environment/environment";

/** The container an overlay presents as. */
export type Presentation = "panel" | "sheet" | "fullscreen";

export interface CreatePresentationProps<P extends Presentation> {
  /**
   * The caller's `presentation` prop. `undefined` and `"auto"` take the auto
   * rule; any member of `P` pins the value, overriding everything else. The
   * type narrows the domain per consumer — pinning outside it is a type
   * error, not a runtime one.
   */
  pin?: Accessor<P | "auto" | undefined>;

  /**
   * The overlay's open state. The false→true edge is the only moment the
   * value is computed and latched; it stays latched until close.
   */
  isOpen: Accessor<boolean>;

  /**
   * The presentations this component allows, narrowing the value domain at
   * the type level (`["panel","sheet","fullscreen"]` for Select's three
   * carriers, `["panel","sheet"]` for the two-state overlays). Defaults to
   * `["panel","sheet"]`.
   */
  allowed?: Accessor<readonly P[]>;
}

const DEFAULT_ALLOWED: readonly Presentation[] = ["panel", "sheet"];

/**
 * Evaluates which presentation an overlay takes. The returned accessor holds
 * the latched value while the overlay is open and re-evaluates live while
 * closed.
 */
export function createPresentation<P extends Presentation>(
  props: CreatePresentationProps<P>,
): Accessor<P> {
  // Owner-scope reads: the environment these accessors see is the one above
  // the owner that ran this factory — the same resolution rule
  // `createSelectableItem` documents.
  const input = Environment().input;
  const width = Environment().width;

  const evaluate = (): P => {
    const pinned = props.pin?.();
    // Rule 1: an explicit pin wins — "auto"/undefined defer to the auto
    // rule, and a pin outside `allowed` still returns (the type layer is
    // what keeps callers honest; the runtime never throws).
    if (pinned !== undefined && pinned !== "auto") {
      return pinned;
    }

    const domain = props.allowed?.() ?? (DEFAULT_ALLOWED as readonly P[]);
    // Rules 2 and 3: touch + compact short side prefers "sheet", everything
    // else prefers "panel"; each preference falls back inside the
    // component's own domain, never outside it.
    const preferred: Presentation =
      input() === "touch" && width() === "compact" ? "sheet" : "panel";
    if (domain.includes(preferred as P)) {
      return preferred as P;
    }
    if (domain.includes("panel" as P)) {
      return "panel" as P;
    }
    return domain[0] ?? ("panel" as P);
  };

  // The latch: set on isOpen's false→true edge, released on close. `evaluate`
  // runs untracked so the environment accessors it reads do not become
  // dependencies of this effect — only the edge itself may re-evaluate.
  const latched = signal<P | undefined>(undefined);

  effect(() => {
    if (props.isOpen()) {
      latched.set(untracked(evaluate));
    } else {
      latched.set(undefined);
    }
  });

  return () => {
    const held = latched();
    return props.isOpen() && held !== undefined ? held : evaluate();
  };
}
