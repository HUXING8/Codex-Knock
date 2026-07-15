import os from "node:os";
import path from "node:path";

export function homeDir() {
  return process.env.CODEX_KNOCK_HOME || path.join(os.homedir(), ".codex-knock");
}

export function configPath() {
  return process.env.CODEX_KNOCK_CONFIG || path.join(homeDir(), "config.json");
}

export function statePath() {
  return process.env.CODEX_KNOCK_STATE || path.join(homeDir(), "state.json");
}
