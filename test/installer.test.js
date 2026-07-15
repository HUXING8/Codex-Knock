import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ensurePathBlock,
  findRealCodexPath,
  installCodexShim,
  shimCodexPath,
} from "../src/installer.js";

test("installs codex shim and managed PATH block", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-knock-installer-"));
  const profilePath = path.join(tempDir, ".bashrc");

  const result = installCodexShim({ baseDir: tempDir, profilePath });

  assert.equal(result.shimPath, shimCodexPath(tempDir));
  assert.match(fs.readFileSync(result.shimPath, "utf8"), /codex-knock shim/);
  assert.equal(fs.statSync(result.shimPath).mode & 0o111, 0o111);
  assert.match(fs.readFileSync(profilePath, "utf8"), /codex-knock PATH/);
});

test("ensurePathBlock is idempotent", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-knock-profile-"));
  const profilePath = path.join(tempDir, ".bashrc");
  const binDir = path.join(tempDir, "bin");

  ensurePathBlock(profilePath, binDir);
  ensurePathBlock(profilePath, binDir);

  const content = fs.readFileSync(profilePath, "utf8");
  assert.equal((content.match(/codex-knock PATH/g) || []).length, 2);
});

test("findRealCodexPath skips codex-knock shim", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-knock-path-"));
  const shimDir = path.join(tempDir, "shim");
  const realDir = path.join(tempDir, "real");
  fs.mkdirSync(shimDir);
  fs.mkdirSync(realDir);

  const shim = path.join(shimDir, "codex");
  const real = path.join(realDir, "codex");
  fs.writeFileSync(shim, "#!/usr/bin/env sh\nexec codex-knock shim \"$@\"\n", { mode: 0o755 });
  fs.writeFileSync(real, "#!/usr/bin/env sh\necho real codex\n", { mode: 0o755 });

  const found = findRealCodexPath({
    env: { PATH: [shimDir, realDir].join(path.delimiter) },
    exclude: [shim],
  });

  assert.equal(found, real);
});
