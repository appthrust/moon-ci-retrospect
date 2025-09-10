import * as path from "node:path";
import { $ } from "execa";
import { expect, test } from "vitest";

const indexJs = path.resolve("dist/index.js");

test("basic", async () => {
  const cwd = path.join(import.meta.dirname, "workspaces/basic");
  const { stdout, stderr } = await $({ cwd })`node ${indexJs}`;
  expect(stdout).toMatchSnapshot();
  expect(stderr).toBe("");
});

test("no-tasks", async () => {
  const cwd = path.join(import.meta.dirname, "workspaces/no-tasks");
  const { stdout, stderr } = await $({ cwd })`node ${indexJs}`;
  expect(stdout).toMatchSnapshot();
  expect(stderr).toBe("");
});
