/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/primitives/create-toggle-state/create-toggle-state.ts
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/a13802d8be6f83af1450e56f7a88527b10d9cadf/packages/@react-stately/toggle/src/useToggleState.ts
 *
 * Adapted to NSH: the `@kobalte/utils` accessor helper is inlined, and every
 * input is an accessor, per research section 4.4.
 */

import type { Accessor } from "nsh";

import { createControllableBooleanSignal } from "../create-controllable-signal";

export interface CreateToggleStateProps {
  /** The controlled selected state. */
  isSelected?: Accessor<boolean | undefined>;

  /**
   * The default selected state when initially rendered.
   * Useful when you do not need to control the selected state.
   */
  defaultIsSelected?: Accessor<boolean | undefined>;

  /** Whether the selected state cannot be changed by the user. */
  isDisabled?: Accessor<boolean | undefined>;

  /** Whether the selected state cannot be changed by the user. */
  isReadOnly?: Accessor<boolean | undefined>;

  /** Event handler called when the selected state changes. */
  onSelectedChange?: (isSelected: boolean) => void;
}

export interface ToggleState {
  /** The selected state. */
  isSelected: Accessor<boolean>;

  /** Updates the selected state. */
  setIsSelected: (isSelected: boolean) => void;

  /** Toggle the selected state. */
  toggle: () => void;
}

/**
 * Provides state management for toggle components like checkboxes and switches.
 */
export function createToggleState(
  props: CreateToggleStateProps = {},
): ToggleState {
  const [isSelected, _setIsSelected] = createControllableBooleanSignal({
    value: () => props.isSelected?.(),
    defaultValue: () => !!props.defaultIsSelected?.(),
    onChange: (value) => props.onSelectedChange?.(value),
  });

  const isLocked = () =>
    !!props.isReadOnly?.() || !!props.isDisabled?.();

  const setIsSelected = (value: boolean) => {
    if (!isLocked()) {
      _setIsSelected(value);
    }
  };

  const toggle = () => {
    if (!isLocked()) {
      _setIsSelected(!isSelected());
    }
  };

  return {
    isSelected,
    setIsSelected,
    toggle,
  };
}
