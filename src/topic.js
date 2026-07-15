import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sanitizeText } from "./sanitize.js";

const TOPIC_MAX = 120;

export function extractUserMessageText(item) {
  if (!item || item.type !== "userMessage" || !Array.isArray(item.content)) {
    return "";
  }

  const parts = [];
  for (const part of item.content) {
    if (!part || typeof part !== "object") {
      continue;
    }
    if (part.type === "text" && part.text) {
      parts.push(String(part.text));
    } else if (typeof part.text === "string" && part.text) {
      parts.push(part.text);
    }
  }

  return parts.join("\n").trim();
}

export function topicFromText(value, maxLength = TOPIC_MAX) {
  if (!value) {
    return "";
  }

  const singleLine = String(value).replace(/\s+/g, " ").trim();
  return sanitizeText(singleLine, maxLength);
}

export function getTopic(notificationOrThread) {
  const thread = notificationOrThread?.thread || notificationOrThread || {};
  return topicFromText(thread.name || thread.preview || thread.firstUserMessage || "");
}

export function resolveCodexHome(env = process.env) {
  return env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

export function findCodexStateDatabase(codexHome = resolveCodexHome()) {
  if (!fs.existsSync(codexHome)) {
    return null;
  }

  const files = fs
    .readdirSync(codexHome)
    .filter((name) => /^state_\d+\.sqlite$/.test(name))
    .sort((a, b) => {
      const aNum = Number.parseInt(a.match(/^state_(\d+)\.sqlite$/)[1], 10);
      const bNum = Number.parseInt(b.match(/^state_(\d+)\.sqlite$/)[1], 10);
      return bNum - aNum;
    });

  if (files.length === 0) {
    return null;
  }

  return path.join(codexHome, files[0]);
}

export function lookupCodexThreadTopic(threadId, options = {}) {
  if (!threadId) {
    return "";
  }

  const dbPath = options.dbPath || findCodexStateDatabase(options.codexHome);
  if (!dbPath || !fs.existsSync(dbPath)) {
    return "";
  }

  try {
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
    const database = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const row = database
        .prepare(
          `SELECT title, preview, first_user_message
           FROM threads
           WHERE id = ?
           LIMIT 1`,
        )
        .get(threadId);

      if (!row) {
        return "";
      }

      return topicFromText(row.title || row.preview || row.first_user_message || "");
    } finally {
      database.close();
    }
  } catch {
    return "";
  }
}

export function enrichNotificationTopic(notification, options = {}) {
  if (!notification) {
    return notification;
  }

  const thread = { ...(notification.thread || { id: notification.threadId }) };
  let topic = getTopic({ thread });

  if (!topic) {
    topic = lookupCodexThreadTopic(notification.threadId || thread.id, options);
    if (topic) {
      if (!thread.name) {
        thread.name = topic;
      }
      if (!thread.preview) {
        thread.preview = topic;
      }
    }
  }

  return {
    ...notification,
    thread,
  };
}
