import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only arms of the kbd adapt unit's M-006 and M-007
 * (adapt-sheets/kbd.md §4). Both depend on the `platform:"windows"`
 * desktop pin the shared `kbd.mobile.test.tsx` file dropped to run on the
 * ios/android targets:
 *
 *   M-006  the `title` channel's hover tooltip — `app.hover` is a mouse
 *          gesture the native targets cannot perform. The portable mount
 *          half (glyph shows in both environments) stays in the shared
 *          file.
 *   M-007  the desktop-host pin assertion — the fixture's `env` probe
 *          reports host-derived values, so `desktop === true` and
 *          `input === "pointer"` only hold under the pinned pointer host.
 */

type Env = { input?: "touch" | "pointer" };

function openKbd(caseName: string, env: Env = {}): Promise<App> {
  return open("../../../kbd.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...env } },
  });
}

type EnvReport = {
  os: string;
  desktop: boolean;
  idiom: string;
  input: string;
};

function envOf(app: App): EnvReport {
  return callsOf(app, "env").at(-1)?.[0] as EnvReport;
}

describe("kbd mobile headless", () => {
  test("M-006 title channel: glyph shows and the same tooltip surfaces in both environments", async () => {
    for (const env of [{}, { input: "touch" } as Env] as const) {
      const app = await openKbd("title", env);

      expect(app.shows("id:abbr-title")).toBe(true);
      expect(app.shows("text:⌘")).toBe(true);

      await app.hover("text:⌘");
      await app.waitFor("text:Command", { timeout: 2000 });
      expect(app.shows("text:Command")).toBe(true);
    }
  }, 120_000);

  test("M-007 desktop pin: host reports a desktop platform and pointer input in the default environment", async () => {
    const app = await openKbd("basic");
    const env = envOf(app);

    expect(env.desktop).toBe(true);
    expect(env.idiom).toBe("desktop");
    expect(env.input).toBe("pointer");
    expect(["windows", "web"]).toContain(env.os);
  }, 120_000);
});
