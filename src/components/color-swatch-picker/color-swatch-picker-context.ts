import type { Accessor, PressEvent, ViewRef } from "nsh";
import { context } from "nsh";

import type {
  ListState,
  SelectionManager,
  SelectionModifiers,
} from "../../primitives";
import type { Color } from "../color-swatch";
import type { ColorPickerState } from "../color-picker/create-color-picker-state";
import type { ColorSwatchPickerItemRenderProps } from "./color-swatch-picker-item";

/** The three variant axes of the picker, as the parts read them. */
export type ColorSwatchPickerLayout = "grid" | "stack";

export type ColorSwatchPickerSize = "xs" | "sm" | "md" | "lg" | "xl";

export type ColorSwatchPickerShape = "circle" | "square";

/**
 * One registered option, as an Item hands it to the Root. The Root turns this
 * registry into the `dataSource` of `createListState` (port sheet §2), the same
 * pattern ListBox uses: HeroUI's options are caller-written parts, not an
 * `options` array, so the collection is what the parts registered.
 */
export interface ColorSwatchPickerItemDescriptor {
  /** The collection key: `color.toString("hexa")`, the same key the picker selects. */
  key: string;

  /** Typeahead text and the accessible name: the color's English name. */
  textValue: () => string;

  /** Whether the option is disabled by its own prop. */
  disabled: () => boolean;

  /** The row view, for the screen-reader focus that follows `focusedKey`. */
  ref: () => ViewRef | undefined;

  /**
   * The one activation entry: a pointer press, Return / Space on the focused
   * root, and the Windows key binding all arrive here. Selection happens in the
   * primitive; there is no separate action in this component.
   */
  activate: (
    source: "pointer" | "keyboard",
    event?: PressEvent,
    modifiers?: SelectionModifiers,
  ) => void;
}

/** What ColorSwatchPicker.Root provides to every Item, Swatch and Indicator. */
export interface ColorSwatchPickerContextValue {
  /** R-025 / R-026: the row or column arrangement. */
  layout: Accessor<ColorSwatchPickerLayout>;

  /** R-027 … R-031: the item size. */
  size: Accessor<ColorSwatchPickerSize>;

  /** R-032 … R-034: the shape (both radii). */
  variant: Accessor<ColorSwatchPickerShape>;

  /** The collection and its selection manager. */
  list: ListState;

  selectionManager: Accessor<SelectionManager>;

  /** The picker's color state; `color()` is `undefined` while it has none. */
  state: ColorPickerState;

  /** Registers one option; the returned function unregisters it. */
  register: (descriptor: ColorSwatchPickerItemDescriptor) => () => void;

  /**
   * Registers a key's color for the reverse lookup the selection change does.
   * React Aria keeps `ColorMapContext` for exactly this.
   */
  registerColor: (key: string, color: Color) => () => void;

  /** Whether the root view holds the keyboard focus. */
  isFocused: Accessor<boolean>;

  /** The key the list keyboard is on, the stand-in for `aria-activedescendant`. */
  focusedKey: Accessor<string | undefined>;

  /** Whether the last interaction was the keyboard (focus ring only). */
  isKeyboard: Accessor<boolean>;

  /** The item held down from the keyboard (Return / Space). */
  keyboardPressedKey: Accessor<string | undefined>;

  /** Focuses the root: the one Tab stop. */
  focusRoot: () => void;

  /** Focuses the root from a pointer press, without a focus ring. */
  focusRootFromPointer: () => void;

  /** Records a pointer interaction on the root's modality tracker. */
  notePointer: () => void;
}

export const ColorSwatchPickerContext = context<
  ColorSwatchPickerContextValue | undefined
>(undefined);

/** What an Item provides to the Swatch and Indicator inside it. */
export interface ColorSwatchPickerItemContextValue {
  /** The item's live state, the same accessors its render props carry. */
  state: ColorSwatchPickerItemRenderProps;
}

export const ColorSwatchPickerItemContext = context<
  ColorSwatchPickerItemContextValue | undefined
>(undefined);
