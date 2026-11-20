import { describe, expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * adapt-sheets/f-collection.md M-014 / M-015 (A-011): unit assertions for
 * `createRowRegistry` (sheet §2 A-002) and its public-entry reachability
 * (A-003). The probe case `f-collection&which=registry` lives in
 * harness/list-box.fixtures.tsx — the only fixture this unit owns — and
 * records every contract point through `probe("registry")` /
 * `probe("import")`.
 *
 * Runs headless and on `--target web` (the `.mobile.` segment marks the
 * mobile layer, not a target): the registry is data-side state, identical on
 * both.
 */

function openRegistry() {
  return open("../../../list-box.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "f-collection", which: "registry" } },
  });
}

describe("row-registry", () => {
  // adapt-sheets/f-collection.md M-014: register → get/has; unregister removes only its own handle; a
  // second register under the same key overwrites, and the stale unregister
  // it leaves behind must not delete the newer handle.
  test("M-014 register/get/has/unregister and same-key overwrite semantics", async () => {
    const app = await openRegistry();

    const calls = callsOf(app, "registry");
    expect(calls).toHaveLength(1);

    const result = calls[0][0] as {
      size: number;
      keys: string;
      keysAfter: string;
      mark: number;
      hasA: boolean;
      hasB: boolean;
    };

    // register(a1) + register(b2) + register(a3): get("a") reads the newest
    // handle, and a1's unregister did not delete it (mark 3 survives).
    expect(result.keys).toBe("a,b");
    expect(result.mark).toBe(3);

    // After unregisterB: only "a" remains — b's unregister removed its own.
    expect(result.keysAfter).toBe("a");
    expect(result.size).toBe(1);
    expect(result.hasA).toBe(true);
    expect(result.hasB).toBe(false);
  });

  // adapt-sheets/f-collection.md M-015: `createRowRegistry` resolves through the public `hero-nsh` entry
  // (the fixture imports it from "@heroui/react"); a mount that could not
  // import it would never reach the probe.
  test("M-015 createRowRegistry is importable from the public entry", async () => {
    const app = await openRegistry();

    expect(callsOf(app, "import")[0][0]).toEqual({ registry: true });
  });
});
