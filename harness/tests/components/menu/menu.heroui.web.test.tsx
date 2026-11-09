import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { close, menu, open as openMenu } from "../../testers/menu";

/*
 * HeroUI 3.2.7 regression cases for Menu that need the menu root to hold
 * keyboard focus, per port sheet 4b (T-003).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, a click focuses only an Input, `ref.focus()`
 * on a view is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). The fixture mounts the Menu with
 * `autoFocus`, so the root's focus and its Escape binding only exist on macOS
 * and the web. Approved difference "Windows keyboard focus and activation
 * (NSH 0.4.0 host gap)", port sheet section 8.
 */

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../menu.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/menu/menu.test.tsx:93
// Ported (port sheet T-003): the menu opens, Escape unmounts it through the
// root's keymap binding, and no action ran. The unit registers the Escape
// channel itself because it has no MenuTrigger / Popover (port sheet §5).
test("T-003 supports Escape dismiss without selecting", async () => {
  const app = await openFixture("escape", { platform: "web" });

  await openMenu(app);

  expect(menu(app)).toBe(true);

  await close(app);
  await app.waitFor("role:menu", { state: "gone" });

  expect(menu(app)).toBe(false);
  expect(callsOf(app, "onAction")).toHaveLength(0);
});
