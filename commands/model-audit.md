---
name: model-audit
description: Audit model usage across the team to identify cost optimization opportunities.
---

# Model Audit

Audit the team's model usage to find cost-saving opportunities:

1. Call `get_model_usage` with `startDate: "30d"` for a full month view.
2. Call `get_spending` with `allPages: true` to correlate model usage with spend.
3. Call `get_agent_edits` and `get_tabs` to understand effectiveness per model tier.

Present findings as:

**Model Distribution**

- Pie chart description: what % of messages go to each model
- Premium vs standard vs budget model split

**Cost Impact**

- Estimated cost per model (messages × approximate cost per request)
- Which models are driving the most spend

**Optimization Opportunities**

- Users heavily using premium models for tasks that standard models handle well
- Specific recommendations: "User X could save ~$Y/month by switching from [model] to [model] for [task type]"

**Action Items**

- Ranked list of changes by estimated savings
- Suggested spend limits if appropriate
