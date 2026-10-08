---
name: predeploy-checklist
description: Walk through a fixed pre-deploy checklist before shipping a change to a self-hosted service. Use when the user says they are about to deploy, release, update, redeploy, or push to a server or VPS, or asks "is this safe to ship".
---

# Pre-deploy checklist

Work through the steps in order. For each step, mark it PASS, FAIL, or UNKNOWN, with one line of evidence. Do not run anything that changes the server. Ask the user to run commands on the server, or run read-only commands locally.

1. **Scope**: What is being deployed (service, image tag, config change)? State it in one sentence and confirm with the user if unclear.
2. **Backup**: A backup of persistent data exists, is recent, and has been restorable. Ask for the backup time and the last restore test. A backup never restored counts as UNKNOWN.
3. **Pinned version**: The new image tag or commit is exact and not `latest`. Run the compose-review skill's image checks on any changed compose file.
4. **Config diff**: Compare the new compose and env variable names against what is running. Only compare variable *names*, never values. Flag added, removed, or renamed variables.
5. **Migrations**: Note any database migrations, whether they are reversible, and whether they run automatically on start.
6. **Rollback**: A concrete rollback command exists in writing (previous image tag, `docker compose up -d` with the old file, or a restore step). If the migration is irreversible, say so.
7. **Health and smoke test**: Define the check that proves it worked (URL, expected status, log line) and what failure looks like.
8. **Window and impact**: Expected downtime, who is affected, and whether this is a good time.
9. **Disk and resources**: Enough free disk for the new image and logs; no resource limits being exceeded.

## Output

End with a verdict: `GO`, `GO WITH CAUTION`, or `NO-GO`.

- NO-GO if Backup, Rollback, or Pinned version is FAIL.
- GO WITH CAUTION if anything is UNKNOWN.
- GO only if every step is PASS.

Then list the exact commands to run the deploy and the rollback, based on what the user told you. If you lack information for a command, ask for it instead of guessing.

