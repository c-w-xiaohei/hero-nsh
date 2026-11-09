/*
 * No Kobalte counterpart: Kobalte attaches key handlers to the element and
 * relies on DOM bubbling, so a collection only hears keys while something
 * inside it has the focus. NSH has no key event on a view; keys reach TSX
 * through `keymap.bind`, and the platform keeps only the newest binding per
 * keystroke (`harness/.nsh/types/nsh/index.d.ts`). A component that binds a
 * list's keys globally (`when: "always"`) therefore steals the current
 * binding from every other list and types into text fields.
 *
 * This helper is the one pattern every component repeats: bind while the
 * collection (or, with virtual focus, the owning input) is focused, and drop
 * the bindings when that focus leaves or the component unmounts. The effect is
 * the scope: `keymap.bind` returns its unbind, which the effect runs before
 * re-binding or when it goes away.
 *
 * Measured NSH limit: when an `<Input>` takes the keyboard focus, a view that
 * had it is not guaranteed to receive `onBlur`, so `isActive` can stay true.
 * The bindings are still safe without `when: "always"`: the keymap skips keys
 * the focused input uses (letters, arrows, Backspace), which keeps typing in
 * the field. Do not paper over the missing blur with `"always"`; that is what
 * takes the characters away from the field.
 */

import { type Accessor, effect, keymap } from "nsh";
import type { KeyBindingOptions } from "nsh";

export interface CreateKeymapScopeOptions {
  /**
   * Whether the bindings are live: the collection has the keyboard focus, or
   * the input that owns a virtual-focus collection has it.
   */
  isActive: Accessor<boolean>;

  /**
   * Keystroke to handler, as `keymap.bind` takes them. Read once when the
   * scope becomes active; handlers may read signals freely.
   */
  bindings: Record<string, (e: { keystroke: string }) => void>;

  /**
   * `repeat` only. `when` is limited to `"notEditing"`: collection keys must
   * never use `"always"`, which would take the letters and arrows a text field
   * needs and replace another list's binding.
   */
  options?: Omit<KeyBindingOptions, "when"> & { when?: "notEditing" };
}

/**
 * Binds `bindings` while `isActive()`, and unbinds on blur or unmount. Use it
 * with `manager.isFocused()` (or `isOpen()` for a virtual-focus collection)
 * instead of binding collection keys globally.
 */
export function createKeymapScope(props: CreateKeymapScopeOptions): void {
  effect(() => {
    if (!props.isActive()) {
      return;
    }

    return keymap.bind(props.bindings, props.options);
  });
}
