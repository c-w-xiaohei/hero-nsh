import type { ToastActionButtonProps } from "./toast-action-button";
import { ToastActionButton } from "./toast-action-button";
import type { ToastCloseButtonProps } from "./toast-close-button";
import { ToastCloseButton } from "./toast-close-button";
import type { ToastContentProps } from "./toast-content";
import { ToastContent } from "./toast-content";
import type { ToastDescriptionProps } from "./toast-description";
import { ToastDescription } from "./toast-description";
import type { ToastIndicatorProps } from "./toast-indicator";
import { ToastIndicator } from "./toast-indicator";
import type { ToastProviderProps } from "./toast-provider";
import { ToastProvider } from "./toast-provider";
import type { ToastProps } from "./toast-root";
import { ToastRoot } from "./toast-root";
import type { ToastTitleProps } from "./toast-title";
import { ToastTitle } from "./toast-title";
import { toast, ToastQueue, toastQueue } from "./toast-queue";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Toast` is the single-toast root, exactly as in HeroUI 3.2.7 — the region
 * and the queue live on `Toast.Provider`. The library exports nine named parts
 * and one compound: `Toast` itself, the six leaf parts, `Queue` (the queue
 * class) and `toast` (the helper bound to the default queue).
 */
export const Toast = Object.assign(ToastRoot, {
  Provider: ToastProvider,
  Content: ToastContent,
  Indicator: ToastIndicator,
  Title: ToastTitle,
  Description: ToastDescription,
  ActionButton: ToastActionButton,
  CloseButton: ToastCloseButton,
  Queue: ToastQueue,
  toast,
});

export type Toast = {
  Props: ToastProps;
  ProviderProps: ToastProviderProps;
  ContentProps: ToastContentProps;
  IndicatorProps: ToastIndicatorProps;
  TitleProps: ToastTitleProps;
  DescriptionProps: ToastDescriptionProps;
  ActionProps: ToastActionButtonProps;
  CloseButtonProps: ToastCloseButtonProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export {
  ToastActionButton,
  ToastCloseButton,
  ToastContent,
  ToastDescription,
  ToastIndicator,
  ToastProvider,
  ToastTitle,
};

export type {
  ToastActionButtonProps,
  ToastCloseButtonProps,
  ToastContentProps,
  ToastDescriptionProps,
  ToastIndicatorProps,
  ToastProps,
  ToastProviderProps,
  ToastTitleProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { toastVariants } from "./toast.styles";

export type { ToastVariants } from "./toast.styles";

/* -------------------------------------------------------------------------------------------------
 * Utilities
 * -----------------------------------------------------------------------------------------------*/
export { toast, ToastQueue, toastQueue };

export type {
  HeroUIToastOptions,
  ToastActionProps,
  ToastContentValue,
  ToastEntry,
  ToastPromiseOptions,
  ToastQueueOptions,
  ToastVariant,
} from "./toast-queue";

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/
export {
  DEFAULT_EXIT_DURATION,
  DEFAULT_GAP,
  DEFAULT_HOTKEY,
  DEFAULT_MAX_VISIBLE_TOAST,
  DEFAULT_TOAST_TIMEOUT,
} from "./toast-queue";
