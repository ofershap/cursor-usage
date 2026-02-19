<p align="center">
  <img src="assets/logo.svg" alt="Cursor Usage" width="100" height="100" />
</p>

<h1 align="center">Cursor Usage</h1>

<p align="center">
  Ask your AI agent about your team's Cursor spending. Get answers in seconds, not spreadsheets.
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-green" alt="MCP" /></a>
</p>

---

![Demo](assets/demo.gif)

<sub>Demo animation created with <a href="https://github.com/ofershap/remotion-readme-kit">remotion-readme-kit</a></sub>

---

## What This Does

You manage a Cursor Enterprise team. You want to know who's spending what, which models are being used, and whether you're getting value from AI. Instead of logging into a dashboard, you ask your AI agent:

> "How much did my team spend this week?"

> "Who's using the most expensive models?"

> "Give me a full usage report for the current billing cycle."

This plugin gives your agent the tools and knowledge to answer those questions using the Cursor Enterprise API directly.

## What's Included

| Component | What it does |
|-----------|-------------|
| **MCP Server** | 15 tools wrapping the full Cursor Admin + Analytics API |
| **Skills** | Data interpretation guide + cost optimization framework |
| **Rules** | Always-on cost-awareness guidance for model selection |
| **Commands** | Quick-access: `/usage-report`, `/spend-check`, `/model-audit` |
| **Agent** | Specialized usage analyst persona |

## Install

### Cursor (Marketplace)

```
/add-plugin cursor-usage
```

Then set your API key in Cursor settings:
- Open Settings → MCP
- Find `cursor-usage` and set `CURSOR_API_KEY` to your Cursor Enterprise Admin API key

### Claude Code

```
/plugin install cursor-usage
```

### Manual (any MCP-compatible client)

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "cursor-usage": {
      "command": "npx",
      "args": ["-y", "cursor-usage-mcp"],
      "env": {
        "CURSOR_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### As a Skill Only (no MCP server)

Copy the `skills/` directory into your project's `.cursor/skills/` or `.claude/skills/` folder. The skills work standalone as reference material even without the MCP server.

## Getting Your API Key

1. Go to your Cursor team settings (Settings → Team → API Keys)
2. Generate an Admin API key
3. For analytics endpoints, you may also need an Analytics API key

The API key gives read access to your team's usage data. The only write operation is `set_spend_limit`.

## Available Tools

### Admin API

| Tool | Description |
|------|-------------|
| `get_team_members` | List all team members with roles and status |
| `get_spending` | Current billing cycle spend per member |
| `get_daily_usage` | Daily usage data: lines, requests, models, modes |
| `get_billing_groups` | Billing groups with member lists and spend |
| `get_usage_events` | Per-request events with model, tokens, and costs |
| `set_spend_limit` | Set a hard spending limit for a user |

### Analytics API

| Tool | Description |
|------|-------------|
| `get_dau` | Daily active users (includes CLI, cloud agent, Bugbot) |
| `get_model_usage` | Model usage breakdown per day |
| `get_agent_edits` | Agent edit acceptance/rejection rates |
| `get_tabs` | Tab autocomplete effectiveness |
| `get_mcp_usage` | MCP tool adoption |
| `get_file_extensions` | Top file types being edited with AI |
| `get_client_versions` | Cursor version distribution |
| `get_commands` | Command usage analytics |
| `get_plans` | Plan mode adoption |

### Composite Tools

| Tool | Description |
|------|-------------|
| `get_team_overview` | One-call summary: members, spend, DAU, top models |
| `get_user_deep_dive` | Deep dive into a specific user's usage patterns |

## Example Conversations

**Quick spend check:**
> You: "How much has my team spent this billing cycle?"
> Agent: *calls get_team_overview* → "Your team of 47 active members has spent $3,842 this cycle. Top spender is Alice at $412, followed by Bob at $287..."

**User investigation:**
> You: "Why is Bob's spend so high?"
> Agent: *calls get_user_deep_dive* → "Bob has made 847 requests this week, 73% using claude-opus-4.5. His daily average is $41 vs the team median of $12. Switching his chat requests to Sonnet would save approximately $180/month..."

**Model audit:**
> You: "/model-audit"
> Agent: *calls get_model_usage + get_spending + get_agent_edits* → "62% of your team's messages use Sonnet (good). However, 5 users account for 78% of all Opus usage. Their acceptance rate on Opus is 44% vs 51% on Sonnet, suggesting Opus isn't providing measurably better results for most of their tasks..."

## For Deeper Analysis

This plugin answers quick questions in the IDE. For teams that need:

- **Historical trends** over months (API is limited to 30 days)
- **Automated anomaly detection** with statistical outlier detection
- **Slack/email alerts** when spend spikes
- **Incident tracking** with MTTD/MTTI/MTTR lifecycle
- **Web dashboard** with charts and visualizations

See **[cursor-usage-tracker](https://github.com/ofershap/cursor-usage-tracker)** — the open-source dashboard this plugin is part of.

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build
npm run build

# Type check
npm run typecheck

# Run tests
npm test

# Validate plugin structure
npm run validate
```

## Requirements

- Node.js 20+
- A Cursor Enterprise team with API access
- Admin API key (and optionally Analytics API key)

## License

MIT
