import test from "node:test";
import assert from "node:assert/strict";
import {
  buildServerChanPayload,
  buildServerChanUrl,
  formatServerChanDescription,
  shouldNotify,
} from "../src/notifiers/serverchan.js";
import { formatThousands } from "../src/message.js";

const sampleNotification = {
  type: "completed",
  title: "Codex turn completed",
  status: "completed",
  threadId: "thread-1",
  turnId: "turn-1",
  thread: { cwd: "/repo", name: "Fix payment tests", sessionId: "session-1" },
  turn: { durationMs: 3000 },
  tokenUsage: {
    total: { totalTokens: 42, inputTokens: 20, outputTokens: 12, reasoningOutputTokens: 10 },
    modelContextWindow: 128000,
  },
};

test("builds ServerChan form payload without transcript fields", () => {
  const payload = buildServerChanPayload(sampleNotification);

  assert.match(payload.get("title"), /^Codex 已完成/);
  assert.match(payload.get("title"), /Fix payment tests/);
  assert.match(payload.get("desp"), /主题：Fix payment tests/);
  assert.match(payload.get("desp"), /主机：/);
  assert.match(payload.get("desp"), /IP：/);
  assert.match(payload.get("desp"), /耗时：3s/);
  assert.match(payload.get("desp"), /Token：42/);
  assert.doesNotMatch(payload.get("desp"), /会话：/);
  assert.doesNotMatch(payload.get("desp"), /线程：/);
  assert.doesNotMatch(payload.get("desp"), /项目：/);
  assert.doesNotMatch(payload.get("desp"), /上下文窗口/);
  assert.doesNotMatch(payload.get("desp"), /prompt/i);
});

test("formats Chinese identity fields with fixed host data", () => {
  const text = formatServerChanDescription(
    {
      type: "completed",
      status: "completed",
      threadId: "thread-1",
      turnId: "turn-1",
      thread: { cwd: "/repo", preview: "调整通知内容", sessionId: "session-1" },
      turn: { durationMs: 61000 },
      tokenUsage: null,
    },
    { hostname: "devbox-a", ips: ["192.168.1.10"] },
    new Date("2026-07-07T12:00:00.000Z"),
  );

  assert.match(text, /时间：2026-07-07T12:00:00.000Z/);
  assert.match(text, /状态：已完成/);
  assert.match(text, /主题：调整通知内容/);
  assert.match(text, /主机：devbox-a/);
  assert.match(text, /IP：192.168.1.10/);
  assert.match(text, /耗时：1m1s/);
  assert.match(text, /Token：不可用/);
  assert.doesNotMatch(text, /项目：/);
  assert.doesNotMatch(text, /上下文窗口/);
  assert.doesNotMatch(text, /会话：/);
});

test("skips notification without ServerChan SendKey", () => {
  assert.equal(shouldNotify({ serverChanSendKey: "" }, { type: "completed" }), false);
});

test("builds ServerChan Turbo URL", () => {
  assert.equal(buildServerChanUrl("SCT123"), "https://sctapi.ftqq.com/SCT123.send");
});



test("formats token counts with thousand separators", () => {
  assert.equal(formatThousands(12), "12");
  assert.equal(formatThousands(3021), "3,021");
  assert.equal(formatThousands(3999313), "3,999,313");
  assert.equal(formatThousands(null), "不可用");
});
