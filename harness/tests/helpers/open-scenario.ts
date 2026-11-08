import { open } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";

export type ScenarioOptions = Omit<OpenOptions, "host"> & {
  params?: Record<string, string | number | boolean>;
};

/**
 * Opens the harness on a scenario. Windows is the default platform; keyboard focus tests pass platform: "web".
 *
 * `open` resolves its entry against the test file, not this helper, so every test file must sit
 * exactly three levels below harness/: tests/components/<name>/ or tests/primitives/<name>/.
 */
export function openScenario(name: string, options: ScenarioOptions = {}): Promise<App> {
  const { params, ...rest } = options;
  return open("../../../App.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { scenario: name, ...params } },
  });
}
