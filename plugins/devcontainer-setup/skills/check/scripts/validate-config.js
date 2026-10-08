#!/usr/bin/env node
// Docker-free validator for devcontainer.json files (JSONC).
// Usage: node validate-config.js [project-folder-or-file]
// Prints a JSON report. Exit code 1 if any file has errors, 2 if none found.
// Strict about syntax (unlike `devcontainer read-configuration`, which tolerates
// broken JSON), and checks basic structure. It does not resolve features,
// images, or variables.

const fs = require("fs");
const path = require("path");

// Remove // and /* */ comments and trailing commas, respecting string literals.
function toStrictJson(src) {
  let out = "";
  for (let i = 0, inStr = false; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) {
      out += c;
      if (c === "\\") { out += n === undefined ? "" : n; i++ }
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; out += "\n"; continue; }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i++;
      continue;
    }
    out += c;
  }
  // Second pass: drop commas that directly precede } or ] (outside string).
  let res = "";
  for (let i = 0, inStr = false; i < out.length; i++) {
    const c = out[i];
    if (inStr) {
      res += c;
      if (c === "\\") { res += out[i + 1] ?? ""; i++ }
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; res += c; continue; }
    if (c === ",") {
      let j = i + 1;
      while (j < out.length && /\s/.test(out[j])) j++;
      if (out[j] === "}" || out[j] === "]") continue;
    }
    res += c;
  }
  return res;
}

function findConfigs(target) {
  const abs = path.resolve(target || ".");
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return [abs];
  const found = [];
  const add = (p) => { if (fs.existsSync(p)) found.push(p); };
  add(path.join(abs, ".devcontainer", "devcontainer.json"));
  add(path.join(abs, ".devcontainer.json"));
  const dir = path.join(abs, ".devcontainer");
  if (fs.existsSync(dir)) {
    for (const sub of fs.readdirSync(dir)) {
      const p = path.join(dir, sub, "devcontainer.json");
      if (fs.existsSync(p)) found.push(p);
    }
  }
  return found;
}

function check(file) {
  const errors = [], warnings = [];
  let cfg;
  try {
    cfg = JSON.parse(toStrictJson(fs.readFileSync(file, "utf8")));
  } catch (e) {
    return { file, ok: false, errors: [`Syntax error: ${e.message}`], warnings };
  }
  if (cfg === null || typeof cfg !== "object" || Array.isArray(cfg)) {
    return { file, ok: false, errors: ["Top level must be a JSON object"], warnings };
  }
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

  const hasSource = cfg.image || cfg.dockerFile || cfg.dockerComposeFile || (cfg.build && (cfg.build.dockerfile || cfg.build.dockerFile));
  if (!hasSource) errors.push("No image, build.dockerfile, or dockerComposeFile defined");
  if (cfg.dockerComposeFile && !cfg.service) errors.push('"dockerComposeFile" requires "service"');
  if (cfg.name !== undefined && typeof cfg.name !== "string") errors.push('"name" must be a string');
  if (cfg.features !== undefined && !isObj(cfg.features)) errors.push('"features" must be an object');
  if (cfg.forwardPorts !== undefined && !Array.isArray(cfg.forwardPorts)) errors.push('"forwardPorts" must be an array');
  if (cfg.mounts !== undefined && !Array.isArray(cfg.mounts)) errors.push('"mounts" must be an array');
  if (cfg.runArgs !== undefined && !Array.isArray(cfg.runArgs)) errors.push('"runArgs" must be an array');

  const ext = cfg.customizations && cfg.customizations.vscode && cfg.customizations.vscode.extensions;
  if (ext !== undefined && (!Array.isArray(ext) || ext.some((x) => typeof x !== "string"))) {
    errors.push('"customizations.vscode.extensions" must be an array of strings');
  }

  if (typeof cfg.image === "string") {
    const tag = cfg.image.split("/").pop();
    if (!tag.includes(":") || tag.endsWith(":latest")) warnings.push(`Image "${cfg.image}" is unpinned (no tag or :latest)`);
  }
  if (isObj(cfg.features)) {
    for (const id of Object.keys(cfg.features)) {
      const last = id.split("/").pop();
      if (id.includes("/") && !last.includes(":")) warnings.push(`Feature "${id}" has no version tag`);
    }
  }
  if (!cfg.name) warnings.push('No "name" set');

  return { file, ok: errors.length === 0, errors, warnings };
}

const files = findConfigs(process.argv[2]);
if (files.length === 0) {
  process.stdout.write(JSON.stringify({ ok: false, error: "No devcontainer configuration found" }, null, 2) + "\n");
  process.exit(2);
}
const results = files.map(check);
process.stdout.write(JSON.stringify({ ok: results.every((r) => r.ok), results }, null, 2) + "\n");
process.exit(results.every((r) => r.ok) ? 0 : 1);
