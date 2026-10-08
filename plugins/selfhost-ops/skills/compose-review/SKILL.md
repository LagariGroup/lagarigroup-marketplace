---
name: compose-review
description: Audit a Docker Compose file (docker-compose.yml, compose.yaml, compose.*.yml) for deployment risk. Use whenever the user asks to review, check, harden, or sanity-check a compose file or a self-hosted stack, or before deploying a service to a VPS, even if they do not say "audit".
---

# Compose review

Review the compose file(s) the user points at. If none are named, look for `docker-compose*.yml` and `compose*.y*ml` in the working directory. Read the files and referenced `env_file` names. Never read the contents of `.env` files; only note whether they exist.

## Checks

For every service, check and record a finding for each failure:

1. **Image pinning**: flag `latest`, a missing tag, or a floating major tag on anything stateful (databases, queues). Prefer an exact version, or a digest for critical services.
2. **User**: flag containers that run as root when the image supports a non-root `user:`.
3. **Secrets**: flag credentials, tokens, or keys written inline under `environment:`. They should come from `env_file` or Docker secrets.
4. **Ports**: flag `ports:` that publish to all interfaces. Databases and admin UIs should be bound to `127.0.0.1` or kept on an internal network behind a reverse proxy.
5. **Restart policy**: flag a missing `restart:` on long-running services.
6. **Healthchecks**: flag services other services depend on that have no `healthcheck`, or `depends_on` without `condition: service_healthy`.
7. **Volumes**: flag stateful services with no named volume or bind mount (data lost on recreate), and bind mounts of sensitive host paths.
8. **Privilege**: flag `privileged: true`, `network_mode: host`, extra `cap_add`, and any mount of `/var/run/docker.sock`.
9. **Resources**: note the absence of memory or CPU limits on a shared VPS.
10. **Logging**: note missing log rotation (`logging.options.max-size` / `max-file`), a common cause of full disks.

## Output

Respond with a short report:

- A one-line verdict: `OK to deploy`, `Deploy with fixes`, or `Do not deploy`.
- A findings table with columns: Severity (High/Medium/Low), Service, Issue, Fix.
- Order by severity. For each High finding, include the corrected YAML snippet.

Do not rewrite the whole file unless asked. Do not invent problems; if a check does not apply, skip it silently.

