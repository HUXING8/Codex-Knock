import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { homeDir } from "./paths.js";

const PATH_BLOCK_START = "# >>> codex-knock PATH >>>";
const PATH_BLOCK_END = "# <<< codex-knock PATH <<<";

export function shimBinDir(baseDir = homeDir()) {
  return path.join(baseDir, "bin");
}

export function shimCodexPath(baseDir = homeDir()) {
  return path.join(shimBinDir(baseDir), "codex");
}

export function installCodexShim(options = {}) {
  const baseDir = options.baseDir || homeDir();
  const binDir = shimBinDir(baseDir);
  const shimPath = shimCodexPath(baseDir);
  fs.mkdirSync(binDir, { recursive: true });

  const script = `#!/usr/bin/env sh
exec codex-knock shim "$@"
`;
  fs.writeFileSync(shimPath, script, { mode: 0o755 });
  fs.chmodSync(shimPath, 0o755);

  const profile = options.profilePath || detectShellProfile();
  let profileUpdated = false;
  if (profile) {
    profileUpdated = ensurePathBlock(profile, binDir);
  }

  return {
    binDir,
    shimPath,
    profile,
    profileUpdated,
    pathExport: `export PATH="${binDir}:$PATH"`,
  };
}

export function ensurePathBlock(profilePath, binDir) {
  fs.mkdirSync(path.dirname(profilePath), { recursive: true });
  const block = `${PATH_BLOCK_START}\nexport PATH="${binDir}:$PATH"\n${PATH_BLOCK_END}`;
  const existing = fs.existsSync(profilePath) ? fs.readFileSync(profilePath, "utf8") : "";

  if (existing.includes(PATH_BLOCK_START) && existing.includes(PATH_BLOCK_END)) {
    const pattern = new RegExp(`${escapeRegExp(PATH_BLOCK_START)}[\\s\\S]*?${escapeRegExp(PATH_BLOCK_END)}`);
    const next = existing.replace(pattern, block);
    if (next !== existing) {
      fs.writeFileSync(profilePath, next.endsWith("\n") ? next : `${next}\n`, "utf8");
      return true;
    }
    return false;
  }

  const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(profilePath, `${existing}${prefix}\n${block}\n`, "utf8");
  return true;
}

export function detectShellProfile(env = process.env) {
  const home = os.homedir();
  const shell = path.basename(env.SHELL || "");

  if (shell === "zsh") {
    return path.join(home, ".zshrc");
  }

  if (shell === "bash") {
    const bashrc = path.join(home, ".bashrc");
    if (fs.existsSync(bashrc)) {
      return bashrc;
    }
    return path.join(home, ".bash_profile");
  }

  const zshrc = path.join(home, ".zshrc");
  if (fs.existsSync(zshrc)) {
    return zshrc;
  }

  return path.join(home, ".bashrc");
}

export function findRealCodexPath(options = {}) {
  const env = options.env || process.env;
  const exclude = new Set((options.exclude || []).filter(Boolean).map((entry) => path.resolve(entry)));
  const pathEntries = (env.PATH || "").split(path.delimiter).filter(Boolean);

  for (const entry of pathEntries) {
    const candidate = path.join(entry, "codex");
    if (!isExecutableFile(candidate)) {
      continue;
    }
    const resolved = path.resolve(candidate);
    if (exclude.has(resolved)) {
      continue;
    }
    if (isCodexKnockShim(candidate)) {
      continue;
    }
    return candidate;
  }

  const whichResult = spawnSync("which", ["codex"], { encoding: "utf8", env });
  const candidate = whichResult.stdout?.trim();
  if (candidate && isExecutableFile(candidate) && !exclude.has(path.resolve(candidate)) && !isCodexKnockShim(candidate)) {
    return candidate;
  }

  throw new Error("Could not find the real codex executable. Pass --codex-path /absolute/path/to/codex.");
}

function isExecutableFile(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function isCodexKnockShim(file) {
  try {
    const content = fs.readFileSync(file, "utf8");
    return content.includes("codex-knock shim");
  } catch {
    return false;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
