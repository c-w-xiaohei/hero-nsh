/**
 * The DOM-only props HeroUI's `FieldsetRootProps` / `FieldsetLegendProps` /
 * `FieldGroupProps` / `FieldsetActionsProps` inherit from the intrinsic
 * elements they render (`fieldset`, `legend`, `div`). They are accepted so code
 * written against HeroUI keeps compiling; port sheet §1 and §8 say what each
 * one can and cannot do here.
 */
export interface FieldsetDomProps {
  /** The form association name of a `<fieldset>`; accepted, no effect (NSH has no forms). */
  name?: string;

  /** The owning form's id; accepted, no effect (NSH has no form ownership). */
  form?: string;

  /** Names the fieldset from another element's text; accepted, no effect (NSH has no DOM ids). */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-details"?: string;

  /** React Aria's `DOMRenderProps.render`, which replaces the host element; accepted, no effect. */
  render?: unknown;
}
