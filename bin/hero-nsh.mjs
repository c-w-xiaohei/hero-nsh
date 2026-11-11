#!/usr/bin/env node
// hero-nsh theme <target.json> [--dry-run]
//
// nsh.json's "theme" takes exactly one file and has no "extends", so using our
// tokens plus a few local changes means copying the whole theme and drifting
// from the package. This fills in only what a copy is missing, so untouched
// tokens keep tracking hero-nsh.
//
// Rule: the target wins. Existing keys are never overwritten (objects merge
// recursively; arrays and scalars are leaves), missing keys are appended at the
// end of their object, and target-only keys stay untouched.
//
// Delete this once nsh accepts an ordered list of theme files.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const THEME_PATH = new URL("../theme/hero-nsh.theme.json", import.meta.url);

const usage = `Usage: hero-nsh theme <target.json> [--dry-run]

Fill the theme keys a hero-nsh theme copy is missing.

Arguments:
  <target.json>  Theme file to fill. Created, with parent directories, when absent.

Options:
  --dry-run      Print the keys that would be added; write nothing.
  -h, --help     Show this help.
`;

// A dry run can print hundreds of lines, so let `| head` close the pipe quietly.
process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

function usageError(message) {
  process.stderr.write(`hero-nsh: ${message}\n\n${usage}`);
  process.exit(2);
}

function fatal(message) {
  process.stderr.write(`hero-nsh: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(usage);
    process.exit(0);
  }

  const [command, ...rest] = argv;
  if (command === undefined) usageError("missing command");
  if (command !== "theme") usageError(`unknown command "${command}"`);

  let target;
  let dryRun = false;
  for (const arg of rest) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("-")) {
      usageError(`unknown option "${arg}"`);
    } else if (target === undefined) {
      target = arg;
    } else {
      usageError(`unexpected argument "${arg}"`);
    }
  }
  if (target === undefined) usageError("missing <target.json>");

  return { target: resolve(target), dryRun };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function leafCount(value) {
  if (!isPlainObject(value)) return 1;
  const keys = Object.keys(value);
  if (keys.length === 0) return 0;
  return keys.reduce((total, key) => total + leafCount(value[key]), 0);
}

// Collect the leaf paths of a package subtree, so a dry run can name each key
// that is about to appear.
function collectLeaves(value, path, out) {
  if (isPlainObject(value) && Object.keys(value).length > 0) {
    for (const [key, child] of Object.entries(value)) {
      collectLeaves(child, [...path, key], out);
    }
  } else {
    out.push(path);
  }
  return out;
}

function groupOf(path) {
  if (path[0] === "cssVars" && path.length >= 2) return path[1];
  return "other";
}

function merge(target, source, path, added) {
  const merged = {};
  for (const key of Object.keys(target)) merged[key] = target[key];

  for (const key of Object.keys(source)) {
    const keyPath = [...path, key];
    if (!Object.hasOwn(target, key)) {
      merged[key] = structuredClone(source[key]);
      collectLeaves(source[key], keyPath, added);
    } else if (isPlainObject(target[key]) && isPlainObject(source[key])) {
      merged[key] = merge(target[key], source[key], keyPath, added);
    }
    // Otherwise the target's value is kept as is.
  }

  return merged;
}

function readTheme() {
  let raw;
  try {
    raw = readFileSync(THEME_PATH, "utf8");
  } catch (error) {
    fatal(`cannot read the bundled theme: ${error.message}`);
  }
  const theme = JSON.parse(raw);
  if (!isPlainObject(theme)) fatal("the bundled theme is not a JSON object");
  return theme;
}

function readTarget(target) {
  let raw;
  try {
    raw = readFileSync(target, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return {};
    fatal(`cannot read ${target}: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fatal(`${target} is not valid JSON: ${error.message}`);
  }
  if (!isPlainObject(parsed)) fatal(`${target} does not contain a JSON object`);
  return parsed;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

const { target, dryRun } = parseArgs(process.argv.slice(2));

const theme = readTheme();
const current = readTarget(target);
const kept = leafCount(current);

const added = [];
const merged = merge(current, theme, [], added);

const groups = new Map();
for (const path of added) {
  const group = groupOf(path);
  groups.set(group, (groups.get(group) ?? 0) + 1);
}
const perGroup = [...new Set(["theme", "light", "dark", ...groups.keys()])]
  .map((group) => `${group} ${groups.get(group) ?? 0}`)
  .join(", ");

const label = dryRun ? "hero-nsh theme (dry run):" : "hero-nsh theme:";
if (added.length === 0) {
  process.stdout.write(`${label} already up to date (kept ${plural(kept, "existing key")})\n`);
} else {
  const verb = dryRun ? "would add" : "added";
  process.stdout.write(
    `${label} ${verb} ${plural(added.length, "key")} (${perGroup}); kept ${plural(kept, "existing key")}\n`,
  );
  if (dryRun) {
    for (const path of added) process.stdout.write(`  ${path.join(".")}\n`);
  }
}

if (!dryRun && added.length > 0) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`);
}
