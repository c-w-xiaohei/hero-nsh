import { describe, expect, open, test } from "nsh/test";
import type { ModalPresentation } from "@heroui/react";
import { callsOf } from "../../helpers/calls";

/*
 * adapt-sheets/modal.md M-012 (A-008), its own row: the `ModalPresentation`
 * type is part of the public surface — the pin below only compiles because
 * `index.ts` re-exports it (`nsh check harness` is the compile half) — and
 * under a touch-compact scope a `"panel"` pin resolves `"panel"` on the
 * swipe probe. The M-002 test in modal.mobile.test.tsx carries the same
 * pin and the full geometric assertions; this file exists so the row has a
 * test title of its own (the merged M-002 title left M-012 without one).
 */

type SwipeRecord = {
  presentation: string;
  panKeys: number;
  offset: number;
  atTop: boolean | null;
};

describe("modal mobile", () => {
  test(
    "M-012 ModalPresentation reaches the surface: the typed pin resolves panel",
    async () => {
      const pin: ModalPresentation = "panel";
      const app = await open("../../../modal.fixtures.tsx", {
        clock: {},
        host: {
          params: { case: "basic", scope: "touch-compact", presentation: pin },
        },
      });

      await app.clock?.runFor(400);

      const swipes = callsOf(app, "swipe").map(
        (args) => args[0] as SwipeRecord,
      );
      expect(swipes.at(-1)?.presentation).toBe("panel");
      expect(app.shows("id:mo-card")).toBe(true);
    },
    90_000,
  );
});
