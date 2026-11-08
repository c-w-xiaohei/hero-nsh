import type { App } from "nsh/test";
import { PROBE_KEY } from "../../probe";
import type { ProbeCall } from "../../probe";

/** The probe calls the app recorded so far. */
export function calls(app: App): ProbeCall[] {
  return JSON.parse(app.storage()[PROBE_KEY] ?? "[]") as ProbeCall[];
}

export function callsOf(app: App, name: string): unknown[][] {
  return calls(app).filter((c) => c.name === name).map((c) => c.args);
}
