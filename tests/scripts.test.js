const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const P = path.join(__dirname, "..", "plugins");
const detect = path.join(P, "devcontainer-setup/skills/init/scripts/detect-stack.js");
const validate = path.join(P, "devcontainer-setup/skills/check/scripts/validate-config.js");
const { isSecretPath, bashWritesSecret } = require(path.join(P, "selfhost-ops/hooks/scripts/block-secrets.js"));

function tmp(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "mkt-"));
  for (const [n, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, n)), { recursive: true });
    fs.writeFileSync(path.join(d, n), c);
  }
  return d;
}
const run = (script, dir) => spawnSync("node", [script, dir], { encoding: "utf8" });

test("detect: flutter and bun.lock", () => {
  const d = tmp({ "pubspec.yaml": "dependencies:\n  flutter:\n    sdk: flutter\n" });
  assert.equal(JSON.parse(run(detect, d).stdout).detected[0].stack, "flutter");
  const b = tmp({ "package.json": "{}", "bun.lock": "" });
  assert.equal(JSON.parse(run(detect, b).stdout).detected[0].packageManager, "bun");
});

test("detect: windows mount regex", () => {
  const r = JSON.parse(run(detect, os.tmpdir()).stdout);
  assert.equal(r.isWindowsMount, false);
  assert.match("/mnt/c/x", /^\/mnt\/[a-z]\//i);
});

test("validate: BOM, comments, trailing commas", () => {
  const d = tmp({ ".devcontainer/devcontainer.json": '﻿{ // c\n "name":"x", "image":"a:1",}' });
  assert.equal(run(validate, d).status, 0);
});

test("validate: errors and none found", () => {
  assert.equal(run(validate, tmp({ ".devcontainer/devcontainer.json": '{"name":"x"}' })).status, 1);
  assert.equal(run(validate, tmp({})).status, 2);
});

test("hook: paths", () => {
  assert.ok(isSecretPath("/a/.env"));
  assert.ok(isSecretPath("x/.env.production"));
  assert.ok(isSecretPath("k.pem"));
  assert.ok(!isSecretPath(".env.example"));
});

test("hook: bash", () => {
  for (const c of ["echo A=1 > .env", "cp x .env", "mv a .env.local", "tee -a .env", "sed -i s/a/b/ .env", "cp k /tmp/server.key"])
    assert.ok(bashWritesSecret(c), c);
  for (const c of ["cat .env.example", "cp .env.example .env.sample", "ls", "echo hi > out.txt", "cp .env.example x && echo a > .env.example"])
    assert.ok(!bashWritesSecret(c), c);
  assert.ok(bashWritesSecret("cp .env.example y; echo a > .env"));
});
