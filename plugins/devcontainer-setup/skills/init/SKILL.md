---
name: init
description: Set up Dev Containers (.devcontainer/devcontainer.json) in a project folder. Use whenever the user asks to add, create, set up, generate, or fix a devcontainer or dev container, wants a containerized or reproducible dev environment for a repo, mentions VS Code "Reopen in Container", or wants Docker-based development for a project, even if they do not say "devcontainer" exactly.
---

# Set up a Dev Container

Produce a working `.devcontainer/` for the current project using the official `devcontainer` CLI and published templates, not hand-written config, then validate it.

## 1. Inspect the project

Run the bundled detector (path relative to this skill's directory) against the project folder:

```bash
node scripts/detect-stack.js <project-folder>
```

It is read-only and prints JSON: detected stacks, package manager, suggested ports, compose services, existing devcontainer files, and WSL warnings. Read the JSON before doing anything else, then:

- **`existingDevcontainer` is not empty**: stop and ask whether to update it in place, replace it, or leave it alone. Never overwrite silently.
- **`isWindowsMount` is true** (project under `/mnt/c/...` or another drive):
- **Several stacks detected**: a devcontainer is one environment per folder. Ask which stack is primary (one question), use its template, and add the others as features.

## 2. Check tooling

- `devcontainer --version`. If missing, use `npx -y @devcontainer/cli` in its place.
- `docker info`. Needed to build or start the container, not to generate files. If it fails, continue and say the build check will be skipped.
- `git status --porcelain`. Applying a template can overwrite files. If the tree is dirty, ask the user to commit or stash first.

## 3. Choose the template

Read `references/stacks.md` and pick the template, features, ports, and extensions for the primary stack. Prefer an official template from `ghcr.io/devcontainers/templates/`. If the project already has a compose file, use the existing-compose template rather than duplicating services.

## 4. Apply it

```bash
devcontainer templates apply --workspace-folder <project-folder> \
  --template-id ghcr.io/devcontainers/templates/<template>:latest \
  --template-args '{}' \
  --features '[{"id":"ghcr.io/devcontainers/features/<feature>:<major>"}]'
```

Omit `--features` when none are needed. If you do not know a template's option names, leave `--template-args` empty and adjust the generated file afterwards. If the command fails (offline, registry unreachable), fall back to writing `.devcontainer/devcontainer.json` from the skeleton in `references/stacks.md` and tell the user you did.

## 5. Tailor the generated config

Edit `.devcontainer/devcontainer.json`. It is JSONC, so keep any comments.

- Set `name` to the project folder name.
- Set `forwardPorts` from `suggestedPorts` in the detector output.
- Set `postCreateCommand` to install dependencies with the detected package manager.
- Add the stack's recommended extensions under `customizations.vscode.extensions`.
- Ask once whether to include Claude Code in the container. If yes, add the feature `ghcr.io/anthropics/devcontainer-features/claude-code:1.0`, placed after any Node feature, and offer the optional volume mount from `references/stacks.md` so the login survives rebuilds.
- Never put secrets or tokens in `devcontainer.json`. Reference host variables with `${localEnv:NAME}` only when the user wants that, and never read or print `.env` files.

## 6. Validate

Run the `check` skill from this plugin on the project folder, or run its validator directly: `node ../check/scripts/validate-config.js <project-folder>` (path relative to this skill's directory). It must report no errors. Fix any it finds and re-run.

Do not run `devcontainer build` or `devcontainer up` without asking, since they pull images and can take minutes. If the user agrees, run `devcontainer up --workspace-folder <project-folder>` and then one `devcontainer exec` command that proves the toolchain works (for example `node -v` or `python --version`). These need Docker running.

## 7. Report

Summarize: files created or changed, template and features used, forwarded ports, and the validation result. Then give the open instructions: from a WSL terminal run `code .` in the project folder, then use the Command Palette and choose "Dev Containers: Reopen in Container". This requires Docker Desktop's WSL integration to be enabled for the distro. Do not commit files; remind the user that `.devcontainer/` should be committed so the team shares it.

