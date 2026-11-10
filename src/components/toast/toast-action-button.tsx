import type { JSX } from "nsh";

import { ButtonRoot } from "../button/button-root";
import type { ButtonRenderProps, ButtonRootProps } from "../button/button-root";
import { joinClassNames } from "./class-names";
import { ToastContext, ToastItemContext } from "./toast-context";
import { toastVariants } from "./toast.styles";

/**
 * The props of `Toast.ActionButton` (= `ToastActionButton`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof Button>` — every HeroUI `Button` prop
 * (`children`, `variant`, `size`, `onPress`, `isDisabled`, …) plus
 * `className`. The queue's `actionProps` travels through unchanged.
 */
export interface ToastActionButtonProps extends ButtonRootProps {}

/**
 * `Toast.ActionButton` / `ToastActionButton`: the action inside a toast,
 * rendered by the merged `Button` (port sheet §1 row `Toast.ActionButton`,
 * §5). The region's `action` slot carries R-048's grid placement and R-023's
 * opacity transition; the caller's `className` comes after it and therefore
 * wins on anything it restates.
 */
export function ToastActionButton(props: ToastActionButtonProps): JSX.Element {
  const region = ToastContext();
  const item = ToastItemContext();

  // R-048: `.toast__action` → `col-start-2 row-start-2 justify-self-start
  // sm:col-start-3 sm:row-start-1`; R-023 → `transition-opacity duration-200
  // ease-out-fluid motion-reduce:transition-none`. Both live in the `action`
  // slot of `toast.styles.ts`; outside a provider the table's defaults stand.
  const slots = () => region.slots?.() ?? toastVariants();

  // R-051: `.toast:not(:has(.toast__indicator)) .toast__action` →
  // `col-start-1 sm:col-start-2`. NSH has no `:has()`, so the single-track
  // placement is appended when no indicator registered (the root's
  // `hasIndicator`), later classes winning over the slot's two-column pair.
  const className = (values: ButtonRenderProps) => {
    const own = props.className;
    const ownClass = typeof own === "function" ? own(values) : own;

    return joinClassNames(
      slots().action(),
      ownClass,
      item.hasIndicator?.() ? undefined : "col-start-1 sm:col-start-2",
    );
  };

  return (
    <ButtonRoot {...props} className={className}>
      {props.children}
    </ButtonRoot>
  );
}
