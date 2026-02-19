---
name: spend-check
description: Quick check on current team spending with alerts for any concerning patterns.
argument-hint: "[optional: user email to check specific user]"
---

# Spend Check

Perform a quick spending health check:

1. If a user email was provided, call `get_user_deep_dive` for that specific user and summarize their spend, model usage, and any concerns.

2. If no email was provided:
   a. Call `get_spending` with `allPages: true`
   b. Calculate: total spend, median spend, top 3 spenders
   c. Flag anyone spending >3x the team median
   d. Flag anyone with `hardLimitOverrideDollars` set to 0 who has high spend (approaching included limit)

3. Present a concise summary:
   - Total team spend this cycle
   - Top 3 spenders
   - Any flags or concerns
   - One-line recommendation if applicable
