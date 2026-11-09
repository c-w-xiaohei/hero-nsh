/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/selection/utils.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/8f2f2acb3d5850382ebe631f055f88c704aa7d17/packages/@react-aria/selection/src/utils.ts
 *
 * Adapted to NSH: `isAppleDevice` / `isMac` from `@kobalte/utils` are replaced
 * by the platform nsh reports, and the typeahead comparison no longer needs
 * `Intl.Collator`; see `defaultStringCollator`.
 */

import { platform } from "nsh";

import { Selection, type SelectionModifiers, type StringCollator } from "./types";

/** Whether the app runs on an Apple platform (Kobalte's `isAppleDevice` / `isMac`). */
export function isApplePlatform(): boolean {
  return platform.os === "macos" || platform.os === "ios";
}

/**
 * Ctrl + Arrow Up/Down has a system-wide meaning on macOS, so Alt is used
 * there instead; on Windows and Linux Alt + Space does, so Control is used.
 */
export function isNonContiguousSelectionModifier(
  modifiers: SelectionModifiers = {},
): boolean {
  return isApplePlatform() ? !!modifiers.alt : !!modifiers.control;
}

/** The "toggle one item" modifier: Command on Apple platforms, Control elsewhere. */
export function isCtrlKeyPressed(modifiers: SelectionModifiers = {}): boolean {
  return isApplePlatform() ? !!modifiers.platform : !!modifiers.control;
}

export function convertSelection(selection: Iterable<string>): Selection {
  return new Selection(selection);
}

export function isSameSelection(
  setA: Set<string>,
  setB: Set<string>,
): boolean {
  if (setA.size !== setB.size) {
    return false;
  }

  for (const item of setA) {
    if (!setB.has(item)) {
      return false;
    }
  }

  return true;
}

/**
 * The key names the selection primitives compare are NSH's own lower-case
 * names (`"down"`, `"pageup"`, `"enter"`, a single character). This also takes
 * the DOM spellings a ported component or test may still use.
 */
export function normalizeKeyName(key: string): string {
  switch (key) {
    case "ArrowDown":
    case "arrowdown":
      return "down";
    case "ArrowUp":
    case "arrowup":
      return "up";
    case "ArrowLeft":
    case "arrowleft":
      return "left";
    case "ArrowRight":
    case "arrowright":
      return "right";
    case " ":
    case "spacebar":
    case "Space":
      return "space";
    case "PageUp":
      return "pageup";
    case "PageDown":
      return "pagedown";
    case "Escape":
    case "esc":
      return "escape";
    case "Enter":
    case "return":
      return "enter";
    case "Tab":
      return "tab";
  }

  return key.length === 1 ? key : key.toLowerCase();
}

/** Case- and accent-folding normalization, the base of the default collator. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * The comparison typeahead uses when the caller supplies no locale collator.
 *
 * Kobalte builds an `Intl.Collator({ usage: "search", sensitivity: "base" })`
 * from the locale. NSH exposes the locale but does not promise `Intl.Collator`
 * on every backend (its type declarations do not contain it), so the default
 * folds case and diacritics and compares code units: "bar" compares equal to
 * "Bar" and to "bár", which is what `sensitivity: "base"` gives for the
 * prefixes typeahead asks about. A component that wants full locale ordering
 * passes its own `collator` to `createSelectableList`.
 */
export const defaultStringCollator: StringCollator = {
  compare(a: string, b: string): number {
    const foldedA = fold(a);
    const foldedB = fold(b);

    if (foldedA === foldedB) {
      return 0;
    }

    return foldedA < foldedB ? -1 : 1;
  },
};
