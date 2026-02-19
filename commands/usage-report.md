---
name: usage-report
description: Generate a comprehensive team usage and spending report for the current billing cycle.
---

# Usage Report

Generate a team usage report by following these steps:

1. Call `get_team_overview` to get the high-level summary (members, spend, DAU, top models).
2. Call `get_spending` with `allPages: true` to get the full spending breakdown.
3. Call `get_model_usage` for the last 7 days to show recent model adoption trends.
4. Call `get_agent_edits` for the last 7 days to show AI effectiveness metrics.

Present the report in this structure:

**Team Summary**

- Total members, active members, DAU trend
- Total spend this cycle, average per member
- Billing cycle dates

**Spending Breakdown**

- Top 10 spenders with amounts
- Spend distribution (median, p75, p90, max)
- Anyone exceeding 3x the median (flag as potential concern)

**Model Adoption**

- Top 5 models by message volume
- Premium vs standard model split
- Any model concentration risks

**AI Effectiveness**

- Agent edit acceptance rate
- Tab completion acceptance rate
- Lines of code accepted vs suggested

**Recommendations**

- Cost optimization opportunities (reference the cursor-cost-optimization skill)
- Users who might benefit from model guidance
- Any anomalies worth investigating
