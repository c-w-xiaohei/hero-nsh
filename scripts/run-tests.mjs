#!/usr/bin/env node
/*
 * Runs the harness test files for one target.
 *
 *   node scripts/run-tests.mjs <headless|web|windows> [--junit-dir DIR]
 *
 * A test file declares where it can run by its name ("Real hosts" in the loop
 * brief):
 *   <x>.test.tsx            every target
 *   <x>.headless.test.tsx   headless only (dragAndHold/drop, keyboard.down/up,
 *                           setLifecycle)
 *   <x>.web.test.tsx        web only (Tab/Shift+Tab focus movement, which NSH
 *                           0.4.0 does not do on Windows); the legacy
 *                           <x>.browser.test.tsx name means the same
 *   <x>.windows.test.tsx    Windows only
 *
 * Each file runs in its own `nsh test` process so one crash cannot take the
 * rest of the suite down, and each gets its own JUnit file so a failure stays
 * attached to the file that caused it.
 */

import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const TARGETS = new Set(["headless", "web", "windows"]);
const ROOT = process.cwd();
const TESTS_DIR = path.join(ROOT, "harness", "tests");

function usage(message) {
  if (message) {
    console.error(message);
  }
  console.error("usage: node scripts/run-tests.mjs <headless|web|windows> [--junit-dir DIR]");
  process.exit(2);
}

const args = process.argv.slice(2);
const target = args[0];

if (!target || !TARGETS.has(target)) {
  usage(target ? `unknown target: ${target}` : "missing target");
}

let junitDir;
for (let index = 1; index < args.length; index += 1) {
  if (args[index] === "--junit-dir") {
    junitDir = args[index + 1];
    index += 1;
  } else {
    usage(`unknown option: ${args[index]}`);
  }
}

if (junitDir !== undefined && junitDir === "") {
  usage("--junit-dir needs a directory");
}

/** "plain" | "headless" | "web" | "windows", from the file name. */
function kindOf(file) {
  if (file.includes(".headless.test.")) return "headless";
  if (file.includes(".web.test.")) return "web";
  if (file.includes(".windows.test.")) return "windows";
  // Legacy name for the web target.
  if (file.includes(".browser.test.")) return "web";
  return "plain";
}

function selected(file) {
  const kind = kindOf(file);

  if (kind === "plain") return true;
  if (target === "web") return kind === "web";
  return kind === target;
}

function collect(directory, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      collect(full, found);
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      found.push(full);
    }
  }

  return found;
}

if (!statSync(TESTS_DIR, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`no test directory: ${TESTS_DIR}`);
  process.exit(1);
}

const files = collect(TESTS_DIR)
  .filter((file) => selected(path.relative(ROOT, file)))
  .sort();

if (files.length === 0) {
  console.error(`no ${target} test files under harness/tests`);
  process.exit(1);
}

if (junitDir !== undefined) {
  mkdirSync(junitDir, { recursive: true });
}

function junitPath(file) {
  const relative = path.relative(ROOT, file);
  // Mirror the test tree under the JUnit directory so a path never collides.
  return path.join(junitDir, `${relative}.xml`);
}

function run(file) {
  const command = ["test", path.relative(ROOT, file)];

  if (target === "web") {
    command.push("--target", "web");
  } else if (target === "windows") {
    command.push("--target", "windows");
  }

  if (junitDir !== undefined) {
    const out = junitPath(file);
    mkdirSync(path.dirname(out), { recursive: true });
    command.push("--junit", out);
  }

  return new Promise((resolve) => {
    const child = spawn("nsh", command, { cwd: ROOT, stdio: "inherit" });

    child.on("error", (error) => {
      console.error(`could not start nsh: ${error.message}`);
      resolve(1);
    });
    child.on("close", (code, signal) => {
      resolve(signal ? 1 : (code ?? 1));
    });
  });
}

let passed = 0;
const failed = [];

for (const file of files) {
  const status = await run(file);

  if (status === 0) {
    passed += 1;
  } else {
    failed.push(path.relative(ROOT, file));
  }
}

console.log("");
console.log(
  `Summary (${target}): ${files.length} file${files.length === 1 ? "" : "s"}, ` +
    `${passed} passed, ${failed.length} failed`,
);

for (const file of failed) {
  console.log(`  failed: ${file}`);
}

process.exit(failed.length === 0 ? 0 : 1);
