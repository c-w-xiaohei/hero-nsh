import type { JSX, PressEvent } from "nsh";
import { cleanup, computed, split } from "nsh";

import {
  CloseButton,
  type CloseButtonRenderProps,
  type CloseButtonRootProps,
} from "../close-button";
import { joinClassNames } from "./class-names";
import { SearchFieldClearIcon } from "./search-field-clear-icon";
import { SearchFieldContext, SearchFieldGroupContext } from "./search-field-context";

/**
 * The props of `SearchField.ClearButton`: HeroUI 3.2.7's
 * `SearchFieldClearButtonProps`, which is `ComponentPropsWithRef<typeof
 * CloseButton>` — the whole close-button surface, passed through.
 *
 * The three defaults `useSearchField` supplies stand beside it (port sheet
 * §1.5): the accessible name `"Clear search"` (inside a field; outside one the
 * CloseButton default stands), `excludeFromTabOrder: true` and
 * `preventFocusOnPress: true`. Explicit props win.
 */
export interface SearchFieldClearButtonProps extends CloseButtonRootProps {}

/**
 * `SearchField.ClearButton` / `SearchFieldClearButton`: the trailing clear
 * button, built on the shipped `CloseButton` rather than on a raw pressable
 * view (its own port sheet already ruled on the button base). It registers with
 * the enclosing `SearchField.Group` (R-018), hides itself while the field is
 * empty (R-004) and writes the field's value through the root's context.
 */
export function SearchFieldClearButton(props: SearchFieldClearButtonProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "isDisabled",
    "excludeFromTabOrder",
    "preventFocusOnPress",
    "aria-label",
    "accessibilityLabel",
    "onPress",
    "onPressStart",
    "ref",
  ] as const);

  const field = SearchFieldContext();
  const group = SearchFieldGroupContext();

  // R-018: registers this button's presence for the input's end padding, and
  // unregisters on unmount.
  const unregister = group?.registerClearButton();

  cleanup(() => unregister?.());

  // R-004: `.search-field[data-empty="true"]
  // [data-slot="search-field-clear-button"]` → `pointer-events: none` and
  // `opacity: 0`. Upstream does not disable the button (it keeps its place and
  // its screen-reader identity), so neither do we. The half that hides the
  // pixel is a registered §8 difference: neither declaration is readable from
  // `nsh/test`, and a press by selector bypasses pointer hit-testing.
  const isHidden = computed(() => field?.isEmpty() === true);

  // R-023: the slot classes after CloseButton's own, then the caller's, then
  // the empty-state pair. `size-5` overrides CloseButton's `h-6 w-6` because
  // later classes win.
  const className = (values: CloseButtonRenderProps) => {
    const own = local.className;
    const ownClass = typeof own === "function" ? own(values) : own;

    return joinClassNames(
      field?.slots.clearButton(),
      ownClass,
      isHidden() ? "pointer-events-none opacity-0" : undefined,
    );
  };

  // Upstream's `clearButtonProps.isDisabled = isDisabled || isReadOnly`; the
  // caller's own value wins.
  const isDisabled = computed(
    () => local.isDisabled ?? (field ? field.isDisabled() || field.isReadOnly() : false),
  );

  // `onPressStart` hands the focus back to the input, so a mobile keyboard does
  // not close; `onPress` clears. The caller's own handlers still run.
  const handlePressStart = (event: PressEvent) => {
    field?.focusInput();
    local.onPressStart?.(event);
  };

  const handlePress = (event: PressEvent) => {
    field?.clear();
    local.onPress?.(event);
  };

  // `children ?? <CloseIcon />` upstream; R-024 replaces the 16px default with
  // the 12px one this field's stylesheet asks for. A custom child is kept as
  // is (a one-argument function is CloseButton's render prop, which it
  // resolves). The single read of `children`, at the placement.
  const content = (): JSX.Element => {
    const child = local.children;

    if (child === undefined || child === null) {
      return <SearchFieldClearIcon />;
    }

    return child as JSX.Element;
  };

  return (
    <CloseButton
      {...rest}
      ref={(node) => local.ref?.(node)}
      // The default name `useSearchField` supplies inside a field; a caller's
      // `aria-label` / `accessibilityLabel` wins. `aria-labelledby` has no NSH
      // counterpart. Outside a field upstream has no `ButtonContext`, so
      // CloseButton's own `"Close"` default stands: leave the prop undefined.
      aria-label={
        local["aria-label"] ??
        local.accessibilityLabel ??
        (field ? "Clear search" : undefined)
      }
      isDisabled={isDisabled()}
      // A clear button is not a Tab stop upstream, and a pointer press must not
      // take the focus from the input.
      excludeFromTabOrder={local.excludeFromTabOrder ?? true}
      preventFocusOnPress={local.preventFocusOnPress ?? true}
      onPressStart={handlePressStart}
      onPress={handlePress}
      className={className}
    >
      {content()}
    </CloseButton>
  );
}
