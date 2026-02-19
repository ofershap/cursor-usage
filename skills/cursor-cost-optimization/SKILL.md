---
name: cursor-cost-optimization
description: Reduce Cursor AI spending without sacrificing developer productivity. Use when asked about cost optimization, budget management, model selection strategy, or spend reduction for Cursor Enterprise teams.
---

# Cursor Cost Optimization

You have access to Cursor Enterprise usage data through the `cursor-usage` MCP server. This skill teaches you how to identify cost-saving opportunities and recommend actionable changes.

## Cost Optimization Framework

### Step 1: Understand the Spend Profile

Call `get_team_overview` to get the baseline, then:

1. **Identify the spend distribution** — Is spend concentrated in a few users or spread evenly?
   - If top 10% of users account for >50% of spend → focus on those users
   - If spend is evenly distributed → focus on model selection policies

2. **Identify the cost driver** — Is it model choice, volume, or both?
   - Call `get_model_usage` to see which models dominate
   - Premium models (Opus, GPT-5) at 10-50x the cost of standard models (Sonnet, GPT-4o)
   - A team of 50 where 5 people use Opus can spend more than the other 45 combined

### Step 2: Model Selection Optimization

The single highest-impact cost lever is model selection.

| Task Type | Recommended Model Tier | Why |
|-----------|----------------------|-----|
| Code completion / tabs | Budget (Flash) | High volume, low complexity, latency-sensitive |
| Inline edits (Cmd+K) | Standard (Sonnet, GPT-4o) | Good balance of quality and cost |
| Chat conversations | Standard | Most questions don't need frontier models |
| Agent mode (complex tasks) | Premium (Opus) only when needed | Reserve for genuinely complex multi-step work |
| Code review | Standard | Pattern matching, not creative generation |

**Key insight**: Most developers default to the "best" model out of habit, not necessity. 80%+ of requests can be handled by standard-tier models with no noticeable quality difference.

### Step 3: Spend Limits

Use `set_spend_limit` to set guardrails:

- **Soft approach**: Set limits at 2-3x the team median spend. This catches runaway usage without blocking normal work.
- **Hard approach**: Set limits at a fixed dollar amount per cycle. Good for budget-constrained teams.
- **Per-group approach**: Use billing groups to set different limits for different teams based on their needs.

**Warning**: Setting limits too low causes developer frustration and workarounds. Start generous and tighten based on data.

### Step 4: Usage Pattern Optimization

1. **Agent mode loops**: Check `get_usage_events` for users with many consecutive agent requests. Long agent loops are the #1 cause of unexpected spend spikes.
2. **Headless requests**: Filter events where `isHeadless: true`. These are background processes (Bugbot, indexing) that may be running unnecessarily.
3. **Low acceptance rates**: Call `get_agent_edits` and `get_tabs`. If acceptance rates are below 30%, the team may need better prompting practices, not more AI requests.

## Cost Benchmarks

These are rough benchmarks based on typical enterprise teams:

| Team Size | Monthly Spend (healthy) | Monthly Spend (high) | Monthly Spend (alarm) |
|-----------|------------------------|---------------------|----------------------|
| 10 devs | $200-500 | $500-1,500 | >$2,000 |
| 50 devs | $1,000-3,000 | $3,000-8,000 | >$10,000 |
| 100 devs | $2,000-6,000 | $6,000-15,000 | >$20,000 |
| 500 devs | $10,000-30,000 | $30,000-75,000 | >$100,000 |

These assume a mix of standard and premium model usage. Teams exclusively using premium models will be 3-5x higher.

## Presenting Recommendations

When presenting cost optimization findings:

1. **Lead with the dollar impact** — "Switching 3 users from Opus to Sonnet would save ~$X/month"
2. **Show the data** — Reference specific users, models, and spend figures
3. **Acknowledge tradeoffs** — Premium models ARE better for complex tasks; the goal is right-sizing, not downgrading
4. **Suggest incremental changes** — Don't recommend sweeping policy changes; suggest a pilot with willing users first

## For Deeper Analysis

This skill covers quick, data-driven cost optimization. For ongoing monitoring with:
- Automated anomaly detection (statistical outlier detection)
- Slack/email alerts when spend spikes
- Historical trend analysis over months
- Incident lifecycle tracking (MTTD/MTTI/MTTR)

See [cursor-usage-tracker](https://github.com/ofershap/cursor-usage-tracker) — the open-source dashboard built for exactly this.
