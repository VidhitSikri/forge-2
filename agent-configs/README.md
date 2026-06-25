# Agent Configs

This folder contains the configuration files for the two AI agents used to build this project.

## Architecture

```
User (Slack)
    │
    ▼
Hermes (Orchestrator)          ← hermes-system-prompt.md
    │  Plans tasks, assigns one at a time
    │
    ▼
OpenClaw (Coding Worker)       ← openclaw.json + openclaw-AGENTS.md + openclaw-SOUL.md
    │  Executes code, writes files, runs commands
    │
    ▼
forge-2 Repository
```

## Files

| File | What it is |
|------|-----------|
| `hermes-system-prompt.md` | The system prompt injected into Hermes (the orchestrator Slack bot). Defines how it plans, assigns tasks, and reviews completion reports. |
| `openclaw.json` | Main OpenClaw runtime config — model selection (MiniMax M3), Slack channel bindings, gateway settings, tool profile. **Tokens redacted.** |
| `openclaw-AGENTS.md` | OpenClaw workspace config — how the agent manages memory, what it can/can't do, heartbeat behavior. |
| `openclaw-SOUL.md` | OpenClaw personality config — behavioral principles, vibe, continuity rules. |

## How it worked in practice

1. **Hermes** received the project brief via Slack, broke it into tasks (T0–T6), and assigned them one at a time.
2. **OpenClaw** (running locally on this machine) received each task via Slack DM, executed the code changes, and sent back a completion report.
3. Hermes reviewed the report against acceptance criteria and issued the next task.
4. All Slack messages are preserved in `slack-export-file/sprint-main/`.

## Notes

- OpenClaw was running with `tools.profile = "coding"` — this activates the full coding toolset (file read/write, terminal, browser).
- The primary model used was `ollama/minimax-m3:cloud` (cloud-routed via Ollama).
- Hermes is a Slack App (`hermes-orchestrator`) — its "config" is the system prompt delivered per message.
- No API keys or auth tokens are included in this folder — all have been replaced with `<REDACTED>`.
