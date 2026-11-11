/*
 * The geometry the components draw with: the corner radius of a field, the
 * three shadows (surface, field, overlay) and the four easing curves HeroUI
 * names (`--ease-smooth`, `--ease-out-quad`, `--ease-out-quart`,
 * `--ease-out-fluid`).
 *
 * Why this file exists
 * --------------------
 * Upstream HeroUI keeps these values in its `@theme` stylesheet, and a Tailwind
 * 4 consumer receives them by `@import`-ing that stylesheet. NSH has no
 * stylesheet to import. The only place that gives `shadow-surface` or
 * `ease-smooth` a meaning is the consuming app's own `nsh.json` "tailwind"
 * block, which a package cannot ship and which has no `extends`. An app that
 * installed this package without copying that block built and tested green,
 * logged one `unknown class` warning and rendered square, shadowless inputs.
 *
 * So no component writes a geometry class by name. Each one takes the class
 * string from here, and every string here is made of things NSH resolves with
 * no help from the app:
 *
 *   - radius: `rounded-(--radius-field)`, a theme token. The token ships in
 *     `theme/hero-nsh.theme.json`, which an app already points `nsh.json`
 *     "theme" at for the colors.
 *   - shadow: `shadow-[...]`, an arbitrary value. NSH has no variable form for
 *     a shadow (`shadow-(--x)` is an unknown class), so the layers are written
 *     out. The dark half is a separate `dark:` class because NSH cannot switch
 *     one shadow token with the appearance.
 *   - easing: `ease-[cubic-bezier(...)]`, an arbitrary value.
 *
 * All of these are plain class names, so the class a component appends from its
 * `className` prop still wins over them (later utilities win in NSH). Keep it
 * that way: do not move any of this into an inline `style`, which always beats
 * a class and would leave an app unable to override it.
 *
 * Migrating to theme tokens
 * -------------------------
 * longbridge/nsh#1258 proposes theme tokens that become named classes the way
 * Tailwind 4's `@theme` namespaces do: `radius-*` -> `rounded-*` and
 * `shadow-*` -> `shadow-*`, with a light and a dark value per shadow, in a
 * plain `cssVars` theme file (its PR 4 and PR 6). When an NSH release has
 * them, this file is the only place that changes:
 *
 *   1. Move `SHADOW_VALUES` into `theme/hero-nsh.theme.json` as
 *      `shadow-surface`, `shadow-field` and `shadow-overlay`, with the light
 *      and the dark value of each.
 *   2. `radius.field` becomes `"rounded-field"` (the `radius-field` token is
 *      already in the theme file) and its start and end forms follow.
 *   3. `shadow.<name>.light` becomes `"shadow-<name>"` and
 *      `shadow.<name>.dark` and `.both` lose the `dark:` half, because the
 *      theme switches the value itself.
 *   4. The easing curves stay literals unless NSH also maps an `ease-*`
 *      namespace; `EASE_VALUES` is the table to move if it does.
 *
 * No component changes in any of this.
 */

/** A shadow in CSS `box-shadow` syntax, for the light and for the dark appearance. */
interface ShadowValue {
  readonly light: string;
  readonly dark: string;
}

/**
 * Each value is `@theme`'s `--shadow-*` of `@heroui/styles` 3.2.7. `surface` and
 * `field` are the same three layers; their dark value is a zero-size inset
 * shadow, which upstream uses to switch the light shadow off. `overlay`'s dark
 * value is a one-pixel inset highlight.
 *
 * Written as CSS so the table can be copied into a theme file as it is.
 */
export const SHADOW_VALUES = {
  surface: {
    light:
      "0 2px 4px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.06), 0 0 1px 0 rgba(0, 0, 0, 0.06)",
    dark: "0 0 0 0 transparent inset",
  },
  field: {
    light:
      "0 2px 4px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.06), 0 0 1px 0 rgba(0, 0, 0, 0.06)",
    dark: "0 0 0 0 transparent inset",
  },
  overlay: {
    light:
      "0 2px 8px 0 rgba(0, 0, 0, 0.06), 0 -6px 12px 0 rgba(0, 0, 0, 0.03), 0 14px 28px 0 rgba(0, 0, 0, 0.08)",
    dark: "0 0 1px 0 rgba(255, 255, 255, 0.3) inset",
  },
} as const satisfies Record<string, ShadowValue>;

/**
 * The control points `[x1, y1, x2, y2]` of each curve, as `@theme` of
 * `@heroui/styles` 3.2.7 gives them. `ease-out` and `ease-linear`, which are
 * Tailwind's own names, are not here; NSH resolves them itself.
 */
export const EASE_VALUES = {
  smooth: [0.25, 0.1, 0.25, 1],
  outQuad: [0.25, 0.46, 0.45, 0.94],
  outQuart: [0.165, 0.84, 0.44, 1],
  outFluid: [0.32, 0.72, 0, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/**
 * An arbitrary value has no spaces and no space after a comma:
 * `0 2px 4px 0 rgba(0, 0, 0, 0.04)` -> `0_2px_4px_0_rgba(0,0,0,0.04)`.
 */
function arbitrary(css: string): string {
  return css.replace(/\s*,\s*/g, ",").replace(/\s+/g, "_");
}

/** The classes of one shadow. */
interface ShadowClasses {
  /** The light value, for the base appearance. */
  readonly light: string;
  /** The dark value, as a `dark:` class. */
  readonly dark: string;
  /** `light` then `dark`, for a place that writes both next to each other. */
  readonly both: string;
}

function shadowClasses(value: ShadowValue): ShadowClasses {
  const light = `shadow-[${arbitrary(value.light)}]`;
  const dark = `dark:shadow-[${arbitrary(value.dark)}]`;
  return { light, dark, both: `${light} ${dark}` };
}

function easeClass(points: readonly [number, number, number, number]): string {
  return `ease-[cubic-bezier(${points.join(",")})]`;
}

/**
 * Upstream's `shadow-surface`, `shadow-field` and `shadow-overlay`. A class
 * string that had `shadow-field dark:shadow-field-dark` takes
 * `${shadow.field.both}`; one that had only one of the two takes `.light` or
 * `.dark`.
 */
export const shadow = {
  surface: shadowClasses(SHADOW_VALUES.surface),
  field: shadowClasses(SHADOW_VALUES.field),
  overlay: shadowClasses(SHADOW_VALUES.overlay),
} as const;

/** Upstream's `ease-smooth`, `ease-out-quad`, `ease-out-quart` and `ease-out-fluid`. */
export const ease = {
  smooth: easeClass(EASE_VALUES.smooth),
  outQuad: easeClass(EASE_VALUES.outQuad),
  outQuart: easeClass(EASE_VALUES.outQuart),
  outFluid: easeClass(EASE_VALUES.outFluid),
} as const;

/**
 * Upstream's `rounded-field`, `rounded-s-field` and `rounded-e-field`: the
 * radius of a text field and of the controls that sit beside one. It reads the
 * `radius-field` token of `theme/hero-nsh.theme.json`, so an app that uses that
 * theme (and an app that overrides the token) gets it with no other setup.
 */
export const radius = {
  field: "rounded-(--radius-field)",
  fieldStart: "rounded-s-(--radius-field)",
  fieldEnd: "rounded-e-(--radius-field)",
} as const;
