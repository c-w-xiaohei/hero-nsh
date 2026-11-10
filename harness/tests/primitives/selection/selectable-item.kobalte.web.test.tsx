/*
 * Target-specific cases: both assert the web platform's modifier mapping,
 * where Command/Super and Alt are the toggle keys (selection/utils.ts reads
 * `platform.os === "web"`). With `--target windows` the app runs as a desktop
 * whatever `platform` asks for, so these belong to the web target only.
 *
 * The shared file keeps the modifier cases that run the same on every desktop.
 */

import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type ItemResult = {
  selected: string[];
  focusedKey: string | null;
  isFocused: boolean;
  itemSelected: boolean;
  itemDisabled: boolean;
  itemAllowsSelection: boolean;
  itemFocusable: boolean;
  itemIsFocused: boolean;
};

type Params = Record<string, string | number | boolean>;

async function openItem(
  params: Params,
  options: { platform?: "web" | "windows" } = {},
): Promise<App> {
  return openScenario("primitives/selectable-item", {
    params,
    ...(options.platform ? { platform: options.platform } : {}),
  });
}

async function act(app: App, action: string): Promise<ItemResult> {
  const before = callsOf(app, "result").length;
  await app.press(`id:action-${action}`);
  await app.waitUntil(() => callsOf(app, "result").length > before);

  const calls = callsOf(app, "result");
  return calls[calls.length - 1][0] as ItemResult;
}

async function run(
  params: Params,
  action: string,
  second?: string,
  options: { platform?: "web" | "windows" } = {},
): Promise<ItemResult> {
  const app = await openItem(params, options);

  await act(app, action);
  if (second) {
    await act(app, second);
  }

  const calls = callsOf(app, "result");
  return calls[calls.length - 1][0] as ItemResult;
}

describe("selection on press", () => {
  test("on the web, the platform (Command/Super) modifier also toggles", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace", target: "banana" },
      "press",
      "press-meta",
      { platform: "web" },
    );

    expect(result.selected).toEqual([]);
  });
});

describe("keyboard activation", () => {
  test("on the web, Alt+keyboard activation is the non-contiguous toggle", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace", selected: "banana" },
      "press-keyboard-alt",
      undefined,
      { platform: "web" },
    );

    expect(result.selected).toEqual([]);
  });
});
