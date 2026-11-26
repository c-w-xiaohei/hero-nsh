import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only half of adapt-sheets/label.md M-007 (A-004): the `focusable ??
 * false` contract. Tab moves the keyboard focus between pressable views on
 * the web target only — headless has no Tab focus at all (common rules), so
 * this assertion cannot live in label.mobile.test.tsx.
 *
 * The `no-field` case mounts a bare Label (no FieldContext) next to a
 * `focusable` sibling View. With the Label's `focusable ?? false` intact it
 * is not a Tab stop: the first Tab lands on the sibling (`sibFocus`) and the
 * Label's own `focus` probe never fires.
 */
test("M-007 the context-free Label stays out of the Tab order", async () => {
  const app = await open("../../../label.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: "no-field", scope: "touch" } },
  });

  await app.keyboard.press("tab");
  await app.waitUntil(() => callsOf(app, "sibFocus").length === 1);

  expect(callsOf(app, "sibFocus")).toHaveLength(1);
  expect(callsOf(app, "focus")).toHaveLength(0);
  expect(callsOf(app, "blur")).toHaveLength(0);
}, 120_000);
