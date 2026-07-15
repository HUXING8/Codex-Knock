import test from "node:test";
import assert from "node:assert/strict";
import { addRemoteArgs, routeCodexArgs } from "../src/routing.js";

test("routes interactive codex through remote", () => {
  assert.equal(routeCodexArgs([]).remote, true);
});

test("passes unsupported admin commands through", () => {
  assert.equal(routeCodexArgs(["login"]).remote, false);
  assert.equal(routeCodexArgs(["mcp", "list"]).remote, false);
  assert.equal(routeCodexArgs(["app-server"]).remote, false);
});

test("routes resume through remote", () => {
  assert.equal(routeCodexArgs(["resume", "--last"]).remote, true);
});

test("adds remote arguments", () => {
  assert.deepEqual(addRemoteArgs(["resume"], { host: "127.0.0.1", port: 45678 }), [
    "--remote",
    "ws://127.0.0.1:45678",
    "resume",
  ]);
});
