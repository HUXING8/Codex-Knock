import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  enrichNotificationTopic,
  findCodexStateDatabase,
  lookupCodexThreadTopic,
  topicFromText,
} from "../src/topic.js";

test("topicFromText collapses whitespace and sanitizes secrets", () => {
  const topic = topicFromText("hello\nworld access_token=secret-value");
  assert.equal(topic.includes("\n"), false);
  assert.match(topic, /redacted/);
  assert.doesNotMatch(topic, /secret-value/);
});

test("lookupCodexThreadTopic reads title from Codex state sqlite", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-knock-topic-"));
  const dbPath = path.join(dir, "state_5.sqlite");
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE threads (
      id TEXT PRIMARY KEY,
      title TEXT,
      preview TEXT,
      first_user_message TEXT
    );
  `);
  db.prepare(
    `INSERT INTO threads (id, title, preview, first_user_message)
     VALUES (?, ?, ?, ?)`,
  ).run(
    "thread-abc",
    "查看codex_knock，我这里有两个工程",
    "preview text",
    "first message",
  );
  db.close();

  assert.equal(findCodexStateDatabase(dir), dbPath);
  assert.equal(
    lookupCodexThreadTopic("thread-abc", { dbPath }),
    "查看codex_knock，我这里有两个工程",
  );

  const enriched = enrichNotificationTopic(
    {
      type: "completed",
      threadId: "thread-abc",
      thread: { id: "thread-abc", name: null, preview: "" },
    },
    { dbPath },
  );
  assert.equal(enriched.thread.name, "查看codex_knock，我这里有两个工程");
});
