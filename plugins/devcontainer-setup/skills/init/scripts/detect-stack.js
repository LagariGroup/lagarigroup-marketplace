#!/usr/bin/env node
// Read-only project detector for Dev Container setup.
// Usage: node detect-stack.js [project-folder]
// Prints a JSON report to stdout. Scans the folder and its immediate subfolders.

const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || ".");
const SKIP = new Set([
  "node_modules", "vendor", "dist", "build", "target", "obj",
  "venv", "__pycache__", "coverage",
]);

const readText = (f, max = 200000) => {
  try { return fs.readFileSync(f, "utf8").slice(0, max); } catch { return ""; }
};
const readJson = (f) => {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; }
};
const list = (d) => {
  try { return fs.readdirSync(d); } catch { return [] }
};

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Not a directory: ${root}`);
  process.exit(1);
}

const detected = [];
const ports = new Map();
const addPort = (port, reason) => { if (!ports.has(port)) ports.set(port, reason); };

function scanDir(abs, rel) {
  const names = list(abs);
  const has = (n) => names.includes(n);
  const here = (n) => path.join(abs, n);
  const add = (stack, evidence, extra = {}) => detected.push({ stack, dir: rel || ".", evidence, ...extra });

  // Node
  if (has("package.json")) {
    const pkg = readJson(here("package.json")) || {};
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const frameworks = [];
    const fw = [
      ["next", "next", 3000], ["vite", "vite", 5173], ["nuxt", "nuxt", 3000],
      ["@angular/core", "angular", 4200], ["vue", "vue", null],
      ["@vue/cli-service", "vue-cli", 8080], ["react", "react", null],
      ["express", "express", 3000], ["@nestjs/core", "nestjs", 3000],
    ];
    for (const [dep, label, port] of fw) {
      if (deps[dep]) {
        frameworks.push(label);
        if (port) addPort(port, `${label} default`);
      }
    }
    let pm = "npm";
    if (has("pnpm-lock.yaml")) pm = "pnpm";
    else if (has("yarn.lock")) pm = "yarn";
    else if (has("bun.lockb") || has("bun.lock")) pm = "bun";
    else if (typeof pkg.packageManager === "string") pm = pkg.packageManager.split("@")[0];
    const typescript = Boolean(deps.typescript) || has("tsconfig.json");
    const nodeVersion =
      (pkg.engines && pkg.engines.node) ||
      readText(here(".nvmrc")).trim() ||
      readText(here(".node-version")).trim() || null;
    add("node", "package.json", { typescript, frameworks, packageManager: pm, nodeVersion });
  }

  // Python
  const pyFiles = ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py"].filter(has);
  if (pyFiles.length) {
    const text = (readText(here("requirements.txt")) + readText(here("pyproject.toml"))).toLowerCase();
    const frameworks = [];
    if (text.includes("django")) { frameworks.push("django"); addPort(8000, "django default"); }
    if (text.includes("fastapi")) { frameworks.push("fastapi"); addPort(8000, "uvicorn default"); }
    if (text.includes("flask")) { frameworks.push("flask"); addPort(5000, "flask default"); }
    const m = readText(here("pyproject.toml")).match(/requires-python\s*=\s*"([^"]+)"/);
    const pythonVersion = readText(here(".python-version")).trim() || (m ? m[1] : null);
    add("python", pyFiles.join(", "), { frameworks, pythonVersion });
  }

  // .NET
  const dotnetFiles = names.filter((n) => /\.(csproj|fsproj|sln|slnx)$/i.test(n) || n === "global.json");
  if (dotnetFiles.length) {
    const proj = names.find((n) => /\.(csproj|fsproj)$/i.test(n));
    const tf = proj ? readText(here(proj)).match(/<TargetFramework>([^<]+)</) : null;
    add("dotnet", dotnetFiles.join(", "), {
      targetFramework: tf ? tf[1] : null,
      note: "Check Properties/launchSettings.json for the real ports",
    });
  }

  // PHP / WordPress
  if (has("composer.json") || names.some((n) => n.endsWith(".php"))) {
    const wpPlugin = names.some(
      (n) => n.endsWith(".php") && /Plugin Name:/i.test(readText(here(n), 2048))
    );
    const wpSite = has("wp-config.php") || has("wp-content");
    if (has("composer.json") || wpPlugin || wpSite) {
      add("php", has("composer.json") ? "composer.json" : "*.php", {
        wordpress: wpPlugin || wpSite,
        wordpressKind: wpSite ? "site" : wpPlugin ? "plugin" : null,
      });
      if (wpPlugin || wpSite) addPort(8080, "typical local WordPress port");
    }
  }

  // Rust, Go, Flutter/Dart, JVM
  if (has("Cargo.toml")) add("rust", "Cargo.toml");
  if (has("go.mod")) {
    const m = readText(here("go.mod")).match(/^go\s+(\S+)/m);
    add("go", "go.mod", { goVersion: m ? m[1] : null });
  }
  if (has("pubspec.yaml")) {
    const isFlutter = /^\s*flutter:/m.test(readText(here("pubspec.yaml")));
    add(isFlutter ? "flutter" : "dart", "pubspec.yaml");
  }
  const jvm = ["pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"].filter(has);
  if (jvm.length) {
    const gradleText = ["build.gradle", "build.gradle.kts"].map((n) => readText(here(n))).join("\n");
    const kotlin = /kotlin/i.test(gradleText);
    add(kotlin ? "kotlin" : "java", jvm.join(", "), {
      buildTool: has("pom.xml") ? "maven" : "gradle",
      gradleWrapper: has("gradlew"),
    });
  }
}

scanDir(root, "");
for (const name of list(root)) {
  if (name.startsWith(".") || SKIP.has(name)) continue;
  const abs = path.join(root, name);
  try { if (fs.statSync(abs).isDirectory()) scanDir(abs, name); } catch { /* ignore */ }
}

// Compose and Dockerfile at the project root
const rootNames = list(root);
const composeFiles = rootNames.filter((n) => /^(docker-)?compose(\..+)?\.ya?ml$/i.test(n));
const services = [];
for (const f of composeFiles) {
  const lines = readText(path.join(root, f)).split(/\r?\n/);
  let inServices = false;
  for (const line of lines) {
    if (/^services:\s*$/.test(line)) { inServices = true; continue; }
    if (inServices && /^\S/.test(line) && line.trim() !== "") { inServices = false; }
    const m = inServices && line.match(/^ {2}([A-Za-z0-9_.-]+):\s*$/);
    if (m && !services.includes(m[1])) services.push(m[1]);
  }
}

// Existing devcontainer config
const existing = [];
if (fs.existsSync(path.join(root, ".devcontainer.json"))) existing.push(".devcontainer.json");
const dcDir = path.join(root, ".devcontainer");
if (fs.existsSync(dcDir)) {
  if (fs.existsSync(path.join(dcDir, "devcontainer.json"))) existing.push(".devcontainer/devcontainer.json");
  for (const sub of list(dcDir)) {
    const p = path.join(dcDir, sub, "devcontainer.json");
    if (fs.existsSync(p)) existing.push(`.devcontainer/${sub}/devcontainer.json`);
  }
}

const report = {
  root,
  isWsl: Boolean(process.env.WSL_DISTRO_NAME),
  isWindowsMount: /^\/mnt\/[a-z]\//i.test(root.replace(/\\/g, "/")),
  hasGit: fs.existsSync(path.join(root, ".git")),
  existingDevcontainer: existing,
  detected,
  compose: { files: composeFiles, services },
  hasDockerfile: rootNames.includes("Dockerfile"),
  suggestedPorts: [...ports].map(([port, reason]) => ({ port, reason })),
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
