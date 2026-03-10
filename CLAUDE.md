# AcademiClaw

Academic-focused AI assistant based on NanoClaw. An optimized version for research and academic workflows. See [README_MINIMAL.md](README_MINIMAL.md) for setup and installation.

## Quick Context

AcademiClaw is a minimal, academic-focused fork of NanoClaw. Single Node.js process with skill-based channel system. Channels (WhatsApp, Telegram, Feishu) self-register at startup. Messages route to Claude Agent SDK running in containers (Linux VMs). Each group has isolated filesystem and memory.

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Orchestrator: state, message loop, agent invocation |
| `src/channels/registry.ts` | Channel registry (self-registration at startup) |
| `src/ipc.ts` | IPC watcher and task processing |
| `src/router.ts` | Message formatting and outbound routing |
| `src/config.ts` | Trigger pattern, paths, intervals |
| `src/container-runner.ts` | Spawns agent containers with mounts |
| `src/task-scheduler.ts` | Runs scheduled tasks |
| `src/db.ts` | SQLite operations |
| `groups/{name}/CLAUDE.md` | Per-group memory (isolated) |
| `container/skills/agent-browser.md` | Browser automation tool (available to all agents via Bash) |

## Skills

| Skill | When to Use |
|-------|-------------|
| `/setup` | First-time installation, authentication, service configuration |
| `/add-whatsapp` | Add WhatsApp channel |
| `/add-telegram` | Add Telegram channel |
| `/add-slack` | Add Slack channel |
| `/add-feishu` | Add Feishu/Lark channel (Chinese users) |

## Development

Run commands directly—don't tell the user to run them.

```bash
npm run dev          # Run with hot reload
npm run build        # Compile TypeScript
./container/build.sh # Rebuild agent container
```

Service management:
```bash
# macOS (launchd)
launchctl load ~/Library/LaunchAgents/com.academiclaw.plist
launchctl unload ~/Library/LaunchAgents/com.academiclaw.plist
launchctl kickstart -k gui/$(id -u)/com.academiclaw  # restart

# Linux (systemd)
systemctl --user start academiclaw
systemctl --user stop academiclaw
systemctl --user restart academiclaw
```

## Troubleshooting

**Channels not connecting:** Verify credentials are set in `.env`. Channels auto-enable when their credentials are present.

**Container agent fails:** Ensure container runtime is running — Docker Desktop or `sudo systemctl start docker`.

**No response to messages:** Check trigger pattern. Main channel doesn't need prefix. Check logs: `tail -f logs/academiclaw.log`.

## Container Build Cache

The container buildkit caches aggressively. `--no-cache` alone does NOT invalidate COPY steps. To force a clean rebuild: prune the builder then re-run `./container/build.sh`.

## Based on NanoClaw

AcademiClaw is a minimal, academic-focused derivative of [NanoClaw](https://github.com/anthropics/nanoclaw). This version removes test files, development tools, and includes only essential channels for academic use cases.
