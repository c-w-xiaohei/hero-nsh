import { context } from "nsh";

/**
 * What a field root or a container root tells the Descriptions inside it.
 *
 * HeroUI reaches the same two things through the DOM: `useTextField` gives
 * the description an `id` that the input's `aria-describedby` points at, and
 * twelve component stylesheets restyle `[data-slot="description"]` with
 * descendant selectors. NSH has neither cross-element references nor
 * descendant selectors, so both travel through this context instead (port
 * sheet §2).
 *
 * The shape borrows only the skeleton of Kobalte's form-control context
 * (`packages/core/src/form-control/form-control-context.ts`): a part
 * registers itself on creation and unregisters on cleanup. Kobalte's DOM id
 * machinery has no NSH counterpart and is not carried over.
 *
 * Every member is optional: a Description rendered outside a field root keeps
 * its own looks, exactly as HeroUI's does when it renders standalone.
 * Field roots and container roots (TextField, Checkbox, Radio, Switch,
 * TagGroup, ListBoxItem, MenuItem, …) provide this context and import it by
 * this internal path; it is not part of the public entry.
 */
export interface DescriptionContextValue {
  /**
   * Hands the description text to the field root, which writes it into its
   * control's `accessibilityHint` — the stand-in for `aria-describedby`
   * (port sheet §2, §8). Returns the unregister function, called when the
   * Description goes away.
   */
  registerDescription?: (text: () => string | undefined) => () => void;

  /**
   * The classes the container root would otherwise apply to the Description
   * through a descendant selector (`hidden` when the field is invalid,
   * `ps-7` under a checkbox, the disabled dimming, …). The container decides
   * them; the Description only appends them after its base classes.
   */
  partClass?: () => string | undefined;
}

export const DescriptionContext = context<DescriptionContextValue | undefined>(undefined);
