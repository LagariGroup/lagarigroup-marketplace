---
name: vps-hardening-audit
description: Read-only security audit of a Linux VPS or self-hosted server (SSH, firewall, exposed ports, updates, fail2ban, Docker exposure). Use when the user asks to harden, audit, or security-check a server, VPS, or homelab host, or pastes output from commands like ss, ufw, or sshd -T.
---

# VPS hardening audit

This audit is read-only. Never change configuration, restart services, or open firewall ports. Ask the user to run the commands below on the server and paste the output, unless they have explicitly given you shell access to it.

## Commands to request

```bash
sudo sshd -T | grep -E '^(permitrootlogin|passwordauthentication|pubkeyauthentication|port|allowusers|maxauthtries) '
sudo ufw status verbose
sudo ss -tulpn
systemctl is-active fail2ban unattended-upgrades
apt list --upgradable 2>/dev/null | head -20
docker ps --format 'table {{.Names}}\t{{.Ports}}'
ls -l /var/run/docker.sock
df -h /
last -n 10
```

## What to evaluate

- **SSH**: root login disabled, password authentication disabled, key auth on, non-default port optional, `AllowUsers` set.
- **Firewall**: default deny incoming; only needed ports allowed (SSH, 80, 443).
- **Listening ports**: anything bound to `0.0.0.0` or `::` that should not face the internet. Note that Docker-published ports can bypass UFW rules, so compare `ss` and `docker ps` output against the firewall.
- **Brute-force protection**: fail2ban (or equivalent) active.
- **Updates**: unattended security upgrades active; count of pending upgrades.
- **Docker**: socket permissions, containers running privileged, services published publicly that should sit behind a reverse proxy.
- **Disk**: root filesystem under about 80 percent.
- **Recent logins**: unfamiliar IPs or users.

## Output

A findings table with Severity, Area, Evidence (quote the relevant line), and Recommended fix (as a command the user can review and run themselves). Finish with the three highest-impact fixes in priority order. Mark anything you could not assess because output was missing as `Not checked`.

