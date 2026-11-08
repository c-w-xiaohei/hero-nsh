import { Storage } from "nsh";

export const PROBE_KEY = "__probe__";

export type ProbeCall = { name: string; args: unknown[] };

const calls: ProbeCall[] = [];

function serializable(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value) ?? "null");
  } catch {
    return String(value);
  }
}

/** Records every call of the returned handler in Storage, for the test to read back. */
export function probe(name: string) {
  return (...args: unknown[]) => {
    calls.push({ name, args: args.map(serializable) });
    void Storage.setItem(PROBE_KEY, JSON.stringify(calls));
  };
}
