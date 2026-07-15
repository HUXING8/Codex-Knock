import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { WebSocket } from "ws";
import { runProxy } from "../src/proxy.js";
import { loadState } from "../src/state.js";

test("proxy forwards websocket frames to stdio app-server and records events", async () => {
  const tempDir = fs.mkdtempSync(path.join(tmpdir(), "codex-knock-"));
  const stateFile = path.join(tempDir, "state.json");
  const proxy = await runProxy(
    {
      host: "127.0.0.1",
      port: 0,
      codexPath: "codex",
      serverChanSendKey: "",
      notify: {},
    },
    {
      stateFile,
      appServerCommand: {
        file: process.execPath,
        args: [path.resolve("fixtures/fake-codex-bin.js"), "app-server", "--stdio"],
      },
    },
  );

  const address = proxy.address();
  const health = await fetch(`http://127.0.0.1:${address.port}/healthz`);
  assert.equal(health.status, 200);

  const ws = new WebSocket(`ws://127.0.0.1:${address.port}`);
  const messages = [];

  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });

  ws.on("message", (data) => {
    messages.push(JSON.parse(data.toString()));
  });

  ws.send(JSON.stringify({ id: 1, method: "initialize", params: { clientInfo: { name: "test" } } }));
  ws.send(JSON.stringify({ id: 2, method: "turn/start", params: { threadId: "thread-1", input: [] } }));

  try {
    await waitFor(() => messages.some((message) => message.method === "turn/completed"));

    const state = loadState(stateFile);
    assert.equal(state.threads["thread-1"].lastTurn.status, "completed");
    assert.equal(state.threads["thread-1"].tokenUsage.total.totalTokens, 25);
  } finally {
    ws.close();
    await proxy.close();
  }
});

async function waitFor(predicate, timeoutMs = 2000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for condition");
}
