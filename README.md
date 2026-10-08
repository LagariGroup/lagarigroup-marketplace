# lagarigroup-marketplace

Claude Code plugin marketplace for Lagari Group developer and self-hosting tooling.

## Install

```
/plugin marketplace add <path-or-repo>
/plugin install selfhost-ops@lagarigroup-marketplace
/plugin install devcontainer-setup@lagarigroup-marketplace
```

## Plugins

| Plugin | What it provides |
|---|---|
| `selfhost-ops` | Skills `compose-review`, `predeploy-checklist`, `vps-hardening-audit`; read-only `deploy-reviewer` agent; hook that blocks edits to `.env`, key and certificate files |
| `devcontainer-setup` | Skills `init` (detect stack, apply official template, validate) and `check` (Docker-free lint of devcontainer.json) |

The secrets hook is a guardrail against accidents, not a security boundary.

## Development

```
node --test tests/
claude plugin validate .
```
