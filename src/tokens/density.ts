/*
 * The density presets a tv() `density` variant axis can take. Like
 * `src/tokens/geometry.ts`, this file exists because there is no third theme
 * appearance for spacing: density is a preset name the environment mounts
 * (`Environment.density`, default `"default"`), not a `density={{…}}` media
 * switch the host resolves.
 *
 * What ships here is the closed domain of preset names and the normalization
 * entry a styles table queries. The per-component mapping (which height,
 * padding, gap or font class a preset picks) lives in each component's own
 * tv() table under a `density` axis — it is authored where the component's
 * other variants are, and this file does not pre-declare slots nobody uses
 * yet. A preset name not registered below is not a variant key: `densityKey`
 * folds it back to `"default"` so a styles table lookup can never miss.
 *
 * `"compact"` is the reserved tighter-spacing preset. It is registered now so
 * an `EnvironmentScope` can mount it and a table can write its cells; tables
 * that have no `density` axis yet keep working because nothing forces them to
 * query it.
 */

/** The registered density preset names, in declaration order. */
export const DENSITY_PRESET_NAMES = ["default", "compact"] as const;

/** A density preset name: the domain of the tv() `density` variant axis. */
export type EnvironmentDensity = (typeof DENSITY_PRESET_NAMES)[number];

const DENSITY_SET: ReadonlySet<string> = new Set(DENSITY_PRESET_NAMES);

/**
 * The density key a styles table looks up. A registered preset passes through;
 * anything else — an unmounted name an `EnvironmentScope` injected, `null`,
 * `undefined` — resolves to `"default"`, so the lookup domain stays closed.
 */
export function densityKey(
  density: string | null | undefined,
): EnvironmentDensity {
  return DENSITY_SET.has(density ?? "") ? (density as EnvironmentDensity) : "default";
}
