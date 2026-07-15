import fs from "node:fs";
import path from "node:path";
import { configPath } from "./paths.js";

export const DEFAULT_CONFIG = Object.freeze({
  host: "127.0.0.1",
  port: 45678,
  codexPath: "codex",
  serverChanSendKey: "",
  wecomWebhookUrl: "",
  feishuWebhookUrl: "",
  dingtalkWebhookUrl: "",
  barkUrl: "",
  webhookUrl: "",
  notify: {
    completed: true,
    failed: true,
    interrupted: true,
    errors: true,
  },
});

export function mergeConfig(config = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    notify: {
      ...DEFAULT_CONFIG.notify,
      ...(config.notify || {}),
    },
  };
}

export function loadConfig(file = configPath()) {
  if (!fs.existsSync(file)) {
    return mergeConfig();
  }

  const raw = fs.readFileSync(file, "utf8");
  if (!raw.trim()) {
    return mergeConfig();
  }

  return mergeConfig(JSON.parse(raw));
}

export function saveConfig(config, file = configPath()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const merged = mergeConfig(config);
  fs.writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return merged;
}

export function updateConfig(patch, file = configPath()) {
  const existing = loadConfig(file);
  const next = mergeConfig({
    ...existing,
    ...patch,
    notify: {
      ...existing.notify,
      ...(patch.notify || {}),
    },
  });
  return saveConfig(next, file);
}
