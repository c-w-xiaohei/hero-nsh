import { ColorAreaRoot } from "./color-area-root";
import type { ColorAreaRootProps } from "./color-area-root";
import { ColorAreaThumb } from "./color-area-thumb";
import type { ColorAreaThumbProps } from "./color-area-thumb";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ColorArea` is HeroUI 3.2.7's `Object.assign(ColorAreaRoot, { Root, Thumb })`:
 * the root is callable and carries both parts, so `<ColorArea.Root>` and
 * `<ColorArea>` are the same component and every part is a real component
 * usable on its own (`ColorAreaThumb` inside any `ColorAreaRoot`).
 */
export const ColorArea = Object.assign(ColorAreaRoot, {
  Root: ColorAreaRoot,
  Thumb: ColorAreaThumb,
});

export type ColorArea = {
  Props: ColorAreaRootProps;
  RootProps: ColorAreaRootProps;
  ThumbProps: ColorAreaThumbProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export { ColorAreaRoot, ColorAreaThumb };

export type {
  ColorAreaRootProps,
  ColorAreaRootProps as ColorAreaProps,
  ColorAreaThumbProps,
};

/* -------------------------------------------------------------------------------------------------
 * Render props and state
 * -----------------------------------------------------------------------------------------------*/
export type {
  ColorAreaChildren,
  ColorAreaRenderProps,
  ColorThumbRenderProps,
} from "./color-area-render-props";

export type {
  ColorAreaChannels,
  ColorAreaState,
  ColorAreaThumbValue,
} from "./create-color-area-state";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { colorAreaVariants } from "./color-area.styles";

export type { ColorAreaVariants } from "./color-area.styles";

/* -------------------------------------------------------------------------------------------------
 * Color value model
 * -----------------------------------------------------------------------------------------------*/
/*
 * Port sheet §1 and §5 propose additive `parseColor` / `normalizeColor` /
 * `Color` exports here, like ColorSwatch's. They are omitted: `src/index.ts`
 * re-exports every component with `export *`, so two components exporting the
 * same names make both ambiguous and TypeScript rejects the entry
 * (`TS2308`, measured). The model still leaves the package through ColorSwatch,
 * and the controller's lift to `src/primitives/colors` (port sheet §5, item 1)
 * gives every color component one shared export.
 */
