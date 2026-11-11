import { open } from "nsh/test";
import type { App } from "nsh/test";
import { calls } from "../helpers/calls";
import type { ScenarioOptions } from "../helpers/open-scenario";

/*
 * The Toast tester for the ported cases (port sheet §4b). Toast has no
 * props-driven state to drive: the queue is an instance, so every case opens
 * `harness/toast.fixtures.tsx` with a case name, and the steps below press the
 * fixture's named Buttons and move the manual clock. Every assertion stays in
 * the test.
 *
 * Focus and onClose are read back through `@scenario/probe`, per the SOP 3.2
 * route for `toHaveFocus` / `toHaveBeenCalled`: the fixture listens on the
 * public `onFocus` / `onBlur` / `onClose` props and the tests read `app.storage()`.
 */

/** HeroUI's DEFAULT_TOAST_TIMEOUT and DEFAULT_EXIT_DURATION (port sheet §1). */
export const DEFAULT_TOAST_TIMEOUT = 4000;
export const EXIT_DURATION = 300;

/**
 * Opens a behaviour case. The clock is manual so timeouts and the 300ms exit
 * hold happen only when a test moves them.
 */
export function openToast(caseName: string, options: ScenarioOptions = {}): Promise<App> {
  const { params, ...rest } = options;

  return open("../../../toast.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    // The exit-hold cases measure the 300ms window, not the host's motion setting.
    reducedMotion: false,
    ...rest,
    host: { params: { case: caseName, ...params } },
  });
}

/** Presses a fixture control by its button name. */
export function showToast(app: App, name: string): Promise<void> {
  return app.press(`role:button[${name}]`);
}

/** Presses the toast's own close button, or another named close control. */
export async function closeToast(app: App, name = "Close"): Promise<void> {
  // The close button is pointer-events-none until its toast is hovered.
  await app.hover("role:alert");
  await app.press(`role:button[${name}]`);
}

/** Moves the manual clock, running timers, frames and animations as they come due. */
export function advance(app: App, ms: number): Promise<void> {
  return app.clock!.runFor(ms);
}

/** Runs the exit hold after a close, so the toast has left the tree. */
export function settleExit(app: App): Promise<void> {
  return advance(app, EXIT_DURATION);
}

/** The latest probe call whose name starts with `prefix`, or null when there is none. */
export function lastCall(app: App, prefix: string): string | null {
  const names = calls(app)
    .map((call) => call.name)
    .filter((name) => name.startsWith(prefix));

  return names[names.length - 1] ?? null;
}
