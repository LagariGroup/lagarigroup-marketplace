---
name: check
description: Review and validate an existing Dev Container configuration (.devcontainer/devcontainer.json or .devcontainer.json). Use when the user asks to check, audit, lint, debug, or fix a devcontainer, when "Reopen in Container" fails, or when a dev container build or startup misbehaves.
---

# Check a Dev Container

Read-only review. Do not edit files unless the user asks for the fixes afterwards.

## 1. Locate and validate

Run the bundled validator (path relative to this skill's directory) on the project folder:

```bash
node scripts/validate-config.js <project-folder>
```

It needs no Docker. It finds `.devcontainer/devcontainer.json`, `.devcontainer.json`, and `.devcontainer/<name>/devcontainer.json`, parses them strictly (comments and trailing commas allowed, as in JSONC), and checks basic structure. Exit code 0 means valid, 1 means errors, 2 means no config found. If there are errors, report them and stop until they are fixed.

Optionally, when the Docker CLI is available, `devcontainer read-configuration --workspace-folder <project-folder>` (or `npx -y @devcontainers/cli read-configuration ...`) shows the fully resolved config, including variables and `extends`. It needs a `docker` binary on the PATH and tolerates broken JSON, so it cannot replace the validator. Do not run `devcontainer build` or `devcontainer up` without asking.

## 2. Lint the config

Read the file (and any referenced Dockerfile or compose file) and flag:

- **Secrets**: literal tokens, passwords, or API keys in `containerEnv`, `remoteEnv`, `build.args`, or `postCreateCommand`. Host variables via `${localEnv:NAME}` are fine. Never open `.env` files.
- **Unpinned versions**: features with no version tag, images using `latest` or no tag, especially for databases.
- **Privilege**: `privileged: true`, `--privileged` in `runArgs`, extra `capAdd`, or a mount of `/var/run/docker.sock` without an obvious reason (deploy tooling).
- **User**: `remoteUser` or `containerUser` set to `root` when a non-root user exists in the image.
- **Mounts**: bind mounts of the whole home directory, SSH keys, or cloud credentials.
- **Ports**: `forwardPorts` that do not match the ports the project actually uses.
- **Setup**: no `postCreateCommand` for a project that clearly needs dependency installation; commands that need network access at every start instead of once.
- **Ordering**: a Claude Code feature listed before the Node feature it depends on.
- **Portability**: Windows-style paths, or a workspace on a `/mnt/c/...` drive mount under WSL.

## 3. Output

One line verdict: `Valid`, `Valid with warnings`, or `Invalid`. Then a table with columns Severity (High/Medium/Low), Location (JSON key), Issue, Fix. Give the corrected JSON snippet for each High item. Skip checks that do not apply instead of padding the list.
