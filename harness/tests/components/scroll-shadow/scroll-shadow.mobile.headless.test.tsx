import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only half of adapt-sheets/scroll-shadow.md M-007 (A-006): the
 * desktop-host pin. The shared `scroll-shadow.mobile.test.tsx` file runs
 * on the ios/android targets now, whose hosts report `platform.desktop
 * === false` and a touch-derived `input` — the desktop pin it used to
 * open with cannot exist there, so the pin's own assertion lives here,
 * on the local headless file, with the `platform:"windows"` open that
 * creates the pointer host.
 */

type EnvReport = {
  os: string;
  desktop: boolean;
  idiom: string;
  input: string;
};

function envOf(app: App): EnvReport {
  return callsOf(app, "env").at(-1)?.[0] as EnvReport;
}

test("M-007 desktop pin: host reports a desktop platform and pointer input in the default environment", async () => {
  const app = await open("../../../scroll-shadow.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "default" } },
  });
  const env = envOf(app);

  expect(env.desktop).toBe(true);
  expect(env.idiom).toBe("desktop");
  expect(env.input).toBe("pointer");
  expect(["windows", "web"]).toContain(env.os);
}, 120_000);
