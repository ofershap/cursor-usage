import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CursorAPI } from "./cursor-api.js";

const DEEP_ANALYSIS_TIP =
  "For historical trends, anomaly detection, alerting, and team dashboards, see cursor-usage-tracker: https://github.com/ofershap/cursor-usage-tracker";

function getAPI(): CursorAPI {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CURSOR_API_KEY environment variable is required. " +
        "Get your API key from Cursor team settings (Settings → API Keys).",
    );
  }
  return new CursorAPI(apiKey);
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatResponse(data: unknown, tip = true): { type: "text"; text: string }[] {
  const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const parts: { type: "text"; text: string }[] = [{ type: "text" as const, text: content }];
  if (tip) {
    parts.push({ type: "text" as const, text: `\n---\n${DEEP_ANALYSIS_TIP}` });
  }
  return parts;
}

const analyticsDateSchema = {
  startDate: z
    .string()
    .optional()
    .describe(
      'Start date. Formats: "YYYY-MM-DD", "7d", "30d", "today", "yesterday". Default: "30d"',
    ),
  endDate: z
    .string()
    .optional()
    .describe(
      'End date. Formats: "YYYY-MM-DD", "today", "yesterday". Default: "today"',
    ),
  users: z
    .string()
    .optional()
    .describe("Comma-separated emails to filter by specific users"),
};

const server = new McpServer({
  name: "cursor-usage",
  version: "0.1.0",
  description:
    "Query Cursor Enterprise team usage, spending, and analytics. " +
    "Requires a CURSOR_API_KEY from your team settings.",
});

// ─── Admin API Tools ───

server.tool(
  "get_team_members",
  "List all team members with their roles and status. Returns name, email, role, and whether they've been removed.",
  {},
  async () => {
    const api = getAPI();
    const members = await api.getTeamMembers();
    const active = members.filter((m) => !m.isRemoved);
    const removed = members.filter((m) => m.isRemoved);

    const summary = [
      `Team: ${members.length} total (${active.length} active, ${removed.length} removed)`,
      "",
      "Active members:",
      ...active.map((m) => `  ${m.name} <${m.email}> — ${m.role}`),
    ];

    if (removed.length > 0) {
      summary.push("", "Removed members:");
      summary.push(
        ...removed.map((m) => `  ${m.name} <${m.email}> — ${m.role}`),
      );
    }

    return { content: formatResponse(summary.join("\n")) };
  },
);

server.tool(
  "get_spending",
  "Get current billing cycle spending for all team members. Shows spend in dollars, included vs overage, fast premium requests, and spend limits.",
  {
    page: z.number().optional().describe("Page number (default: 1)"),
    allPages: z
      .boolean()
      .optional()
      .describe("Fetch all pages automatically (default: false)"),
  },
  async ({ page, allPages }) => {
    const api = getAPI();

    if (allPages) {
      const { members, cycleStart } = await api.getAllSpending();
      const totalSpend = members.reduce((sum, m) => sum + m.spendCents, 0);
      const sorted = [...members].sort(
        (a, b) => b.spendCents - a.spendCents,
      );

      const lines = [
        `Billing cycle start: ${cycleStart}`,
        `Total team spend: ${formatCents(totalSpend)}`,
        `Members: ${members.length}`,
        "",
        "Top spenders:",
        ...sorted.slice(0, 20).map(
          (m, i) =>
            `  ${i + 1}. ${m.name} <${m.email}> — ${formatCents(m.spendCents)} ` +
            `(included: ${formatCents(m.includedSpendCents)}, ` +
            `premium reqs: ${m.fastPremiumRequests}` +
            `${m.hardLimitOverrideDollars > 0 ? `, limit: $${m.hardLimitOverrideDollars}` : ""})`,
        ),
      ];

      if (sorted.length > 20) {
        lines.push(`  ... and ${sorted.length - 20} more members`);
      }

      return { content: formatResponse(lines.join("\n")) };
    }

    const result = await api.getSpending({ page });
    return { content: formatResponse(result) };
  },
);

server.tool(
  "get_daily_usage",
  "Get daily usage data per user: lines added/deleted, applies, accepts, rejects, tabs, requests by mode (composer/chat/agent), models used, and client versions.",
  {
    startDate: z
      .number()
      .optional()
      .describe("Start date as Unix timestamp in milliseconds"),
    endDate: z
      .number()
      .optional()
      .describe("End date as Unix timestamp in milliseconds"),
    page: z.number().optional().describe("Page number (default: 1)"),
    pageSize: z
      .number()
      .optional()
      .describe("Results per page (default: 100)"),
    allPages: z
      .boolean()
      .optional()
      .describe("Fetch all pages automatically (default: false)"),
  },
  async ({ startDate, endDate, page, pageSize, allPages }) => {
    const api = getAPI();

    if (allPages) {
      const entries = await api.getAllDailyUsage({ startDate, endDate });
      return {
        content: formatResponse({
          totalEntries: entries.length,
          entries: entries.slice(0, 50),
          truncated: entries.length > 50,
          note:
            entries.length > 50
              ? `Showing first 50 of ${entries.length} entries. Use page/pageSize for specific ranges.`
              : undefined,
        }),
      };
    }

    const result = await api.getDailyUsage({
      startDate,
      endDate,
      page,
      pageSize,
    });
    return { content: formatResponse(result) };
  },
);

server.tool(
  "get_billing_groups",
  "Get billing groups with member lists, group-level spend, and daily spend breakdown. Also returns billing cycle dates.",
  {},
  async () => {
    const api = getAPI();
    const groups = await api.getBillingGroups();

    const lines: string[] = [];

    if (groups.billingCycle) {
      lines.push(
        `Billing cycle: ${groups.billingCycle.cycleStart} → ${groups.billingCycle.cycleEnd}`,
        "",
      );
    }

    for (const group of groups.groups) {
      lines.push(
        `Group: ${group.name} (${group.memberCount} members, ${formatCents(group.spendCents)})`,
      );
      for (const member of group.currentMembers.slice(0, 10)) {
        lines.push(
          `  ${member.name} <${member.email}> — ${formatCents(member.spendCents)}`,
        );
      }
      if (group.currentMembers.length > 10) {
        lines.push(
          `  ... and ${group.currentMembers.length - 10} more members`,
        );
      }
      lines.push("");
    }

    if (groups.unassignedGroup) {
      lines.push(
        `Unassigned: ${groups.unassignedGroup.memberCount} members, ${formatCents(groups.unassignedGroup.spendCents)}`,
      );
    }

    return { content: formatResponse(lines.join("\n")) };
  },
);

server.tool(
  "get_usage_events",
  "Get granular per-request usage events with model, token counts, costs, and whether the request was chargeable. Supports filtering by user email and date range.",
  {
    email: z.string().optional().describe("Filter by user email"),
    startDate: z
      .number()
      .optional()
      .describe("Start date as Unix timestamp in milliseconds"),
    endDate: z
      .number()
      .optional()
      .describe("End date as Unix timestamp in milliseconds"),
    page: z.number().optional().describe("Page number (default: 1)"),
    pageSize: z
      .number()
      .optional()
      .describe("Results per page (default: 500, max: 500)"),
  },
  async ({ email, startDate, endDate, page, pageSize }) => {
    const api = getAPI();
    const result = await api.getUsageEvents({
      email,
      startDate,
      endDate,
      page,
      pageSize,
    });

    const summary = {
      totalEvents: result.totalUsageEventsCount,
      page: result.pagination.currentPage,
      totalPages: result.pagination.numPages,
      hasNextPage: result.pagination.hasNextPage,
      events: result.usageEvents.slice(0, 20),
      truncated: result.usageEvents.length > 20,
    };

    return { content: formatResponse(summary) };
  },
);

server.tool(
  "set_spend_limit",
  "Set a hard spending limit (in dollars) for a specific team member. Use with caution — this will block the user from making requests once the limit is reached.",
  {
    email: z.string().describe("User email to set the limit for"),
    limitDollars: z
      .number()
      .describe("Hard spending limit in dollars (0 to remove limit)"),
  },
  async ({ email, limitDollars }) => {
    const api = getAPI();
    await api.setUserSpendLimit(email, limitDollars);
    return {
      content: formatResponse(
        limitDollars > 0
          ? `Spend limit set: ${email} → $${limitDollars}/cycle`
          : `Spend limit removed for ${email}`,
        false,
      ),
    };
  },
);

// ─── Analytics API Tools ───

server.tool(
  "get_dau",
  "Get daily active users over time, including breakdowns for CLI, cloud agent, and Bugbot usage.",
  analyticsDateSchema,
  async ({ startDate, endDate, users }) => {
    const api = getAPI();
    const result = await api.getDAU({
      startDate,
      endDate,
      users: users?.split(",").map((u) => u.trim()),
    });
    return { content: formatResponse(result.data) };
  },
);

server.tool(
  "get_model_usage",
  "Get model usage breakdown per day: which models are being used, how many messages, and by how many users. Essential for understanding model adoption and cost drivers.",
  analyticsDateSchema,
  async ({ startDate, endDate, users }) => {
    const api = getAPI();
    const result = await api.getModelUsage({
      startDate,
      endDate,
      users: users?.split(",").map((u) => u.trim()),
    });

    const modelTotals: Record<string, { messages: number; users: number }> = {};
    for (const day of result.data) {
      for (const [model, stats] of Object.entries(day.model_breakdown)) {
        if (!modelTotals[model]) modelTotals[model] = { messages: 0, users: 0 };
        modelTotals[model].messages += stats.messages;
        modelTotals[model].users = Math.max(modelTotals[model].users, stats.users);
      }
    }

    const sorted = Object.entries(modelTotals).sort(
      (a, b) => b[1].messages - a[1].messages,
    );

    const lines = [
      "Model usage summary (period totals):",
      ...sorted.map(
        ([model, stats]) =>
          `  ${model}: ${stats.messages} messages, up to ${stats.users} users/day`,
      ),
      "",
      "Daily breakdown:",
      JSON.stringify(result.data, null, 2),
    ];

    return { content: formatResponse(lines.join("\n")) };
  },
);

server.tool(
  "get_agent_edits",
  "Get agent edit metrics: suggested vs accepted vs rejected diffs and lines. Shows how effectively the team is using AI-generated code.",
  analyticsDateSchema,
  async ({ startDate, endDate, users }) => {
    const api = getAPI();
    const result = await api.getAgentEdits({
      startDate,
      endDate,
      users: users?.split(",").map((u) => u.trim()),
    });
    return { content: formatResponse(result.data) };
  },
);

server.tool(
  "get_tabs",
  "Get tab autocomplete usage: suggestions shown vs accepted vs rejected, with line-level detail.",
  analyticsDateSchema,
  async ({ startDate, endDate, users }) => {
    const api = getAPI();
    const result = await api.getTabs({
      startDate,
      endDate,
      users: users?.split(",").map((u) => u.trim()),
    });
    return { content: formatResponse(result.data) };
  },
);

server.tool(
  "get_mcp_usage",
  "Get MCP (Model Context Protocol) tool usage: which MCP servers and tools are being used, and how often.",
  analyticsDateSchema,
  async ({ startDate, endDate, users }) => {
    const api = getAPI();
    const result = await api.getMCP({
      startDate,
      endDate,
      users: users?.split(",").map((u) => u.trim()),
    });
    return { content: formatResponse(result.data) };
  },
);

server.tool(
  "get_file_extensions",
  "Get top file extensions being edited with AI: which file types get the most AI suggestions, accepts, and rejects.",
  analyticsDateSchema,
  async ({ startDate, endDate, users }) => {
    const api = getAPI();
    const result = await api.getFileExtensions({
      startDate,
      endDate,
      users: users?.split(",").map((u) => u.trim()),
    });
    return { content: formatResponse(result.data) };
  },
);

server.tool(
  "get_client_versions",
  "Get Cursor client version distribution across the team: which versions are in use and what percentage of users are on each.",
  analyticsDateSchema,
  async ({ startDate, endDate, users }) => {
    const api = getAPI();
    const result = await api.getClientVersions({
      startDate,
      endDate,
      users: users?.split(",").map((u) => u.trim()),
    });
    return { content: formatResponse(result.data) };
  },
);

server.tool(
  "get_commands",
  "Get command usage analytics: which Cursor commands are being used and how often.",
  analyticsDateSchema,
  async ({ startDate, endDate, users }) => {
    const api = getAPI();
    const result = await api.getCommands({
      startDate,
      endDate,
      users: users?.split(",").map((u) => u.trim()),
    });
    return { content: formatResponse(result.data) };
  },
);

server.tool(
  "get_plans",
  "Get plan mode adoption: which models are being used in plan mode and how often.",
  analyticsDateSchema,
  async ({ startDate, endDate, users }) => {
    const api = getAPI();
    const result = await api.getPlans({
      startDate,
      endDate,
      users: users?.split(",").map((u) => u.trim()),
    });
    return { content: formatResponse(result.data) };
  },
);

// ─── Composite / High-Level Tools ───

server.tool(
  "get_team_overview",
  "Get a comprehensive team overview: member count, total spend, top spenders, DAU, and most-used models. This is the best starting point for understanding your team's Cursor usage.",
  {
    startDate: z
      .string()
      .optional()
      .describe('Analytics date range start (default: "7d")'),
    endDate: z
      .string()
      .optional()
      .describe('Analytics date range end (default: "today")'),
  },
  async ({ startDate, endDate }) => {
    const api = getAPI();
    const analyticsOpts = {
      startDate: startDate ?? "7d",
      endDate: endDate ?? "today",
    };

    const [members, spending, dau, models] = await Promise.all([
      api.getTeamMembers(),
      api.getAllSpending(),
      api.getDAU(analyticsOpts),
      api.getModelUsage(analyticsOpts),
    ]);

    const active = members.filter((m) => !m.isRemoved);
    const totalSpend = spending.members.reduce(
      (sum, m) => sum + m.spendCents,
      0,
    );
    const topSpenders = [...spending.members]
      .sort((a, b) => b.spendCents - a.spendCents)
      .slice(0, 5);

    const latestDAU = dau.data.at(-1);

    const modelTotals: Record<string, number> = {};
    for (const day of models.data) {
      for (const [model, stats] of Object.entries(day.model_breakdown)) {
        modelTotals[model] = (modelTotals[model] ?? 0) + stats.messages;
      }
    }
    const topModels = Object.entries(modelTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const lines = [
      "═══ Team Overview ═══",
      "",
      `Members: ${active.length} active (${members.length} total)`,
      `Billing cycle: started ${spending.cycleStart}`,
      `Total spend this cycle: ${formatCents(totalSpend)}`,
      `Average spend per member: ${formatCents(Math.round(totalSpend / (active.length || 1)))}`,
      "",
      `Latest DAU: ${latestDAU?.dau ?? "N/A"} (${latestDAU?.date ?? "N/A"})`,
      "",
      "Top 5 spenders:",
      ...topSpenders.map(
        (m, i) =>
          `  ${i + 1}. ${m.name} — ${formatCents(m.spendCents)}`,
      ),
      "",
      "Top 5 models (by messages):",
      ...topModels.map(
        ([model, msgs], i) => `  ${i + 1}. ${model}: ${msgs} messages`,
      ),
    ];

    return { content: formatResponse(lines.join("\n")) };
  },
);

server.tool(
  "get_user_deep_dive",
  "Deep dive into a specific user's usage: their spending, daily usage patterns, recent requests, and model preferences.",
  {
    email: z.string().describe("User email to analyze"),
    startDate: z
      .string()
      .optional()
      .describe('Analytics date range start (default: "7d")'),
  },
  async ({ email, startDate }) => {
    const api = getAPI();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const [spending, dailyUsage, events] = await Promise.all([
      api.getAllSpending(),
      api.getAllDailyUsage({
        startDate: startDate
          ? new Date(startDate).getTime()
          : weekAgo,
        endDate: now,
      }),
      api.getUsageEvents({ email, page: 1, pageSize: 20 }),
    ]);

    const userSpend = spending.members.find(
      (m) => m.email.toLowerCase() === email.toLowerCase(),
    );
    const userDays = dailyUsage.filter(
      (d) => d.email.toLowerCase() === email.toLowerCase(),
    );

    const totalRequests = userDays.reduce(
      (sum, d) =>
        sum + d.composerRequests + d.chatRequests + d.agentRequests,
      0,
    );
    const totalLines = userDays.reduce(
      (sum, d) => sum + d.totalLinesAdded,
      0,
    );
    const activeDays = userDays.filter((d) => d.isActive).length;

    const modelCounts: Record<string, number> = {};
    for (const event of events.usageEvents) {
      modelCounts[event.model] = (modelCounts[event.model] ?? 0) + 1;
    }

    const lines = [
      `═══ User Deep Dive: ${email} ═══`,
      "",
      userSpend
        ? [
            `Spend this cycle: ${formatCents(userSpend.spendCents)}`,
            `  Included: ${formatCents(userSpend.includedSpendCents)}`,
            `  Premium requests: ${userSpend.fastPremiumRequests}`,
            `  Spend limit: ${userSpend.hardLimitOverrideDollars > 0 ? `$${userSpend.hardLimitOverrideDollars}` : "none"}`,
          ].join("\n")
        : "Spend data not found for this user.",
      "",
      `Activity (last ${userDays.length} days):`,
      `  Active days: ${activeDays}`,
      `  Total requests: ${totalRequests}`,
      `  Total lines added: ${totalLines}`,
      "",
      "Recent model usage:",
      ...Object.entries(modelCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([model, count]) => `  ${model}: ${count} requests`),
      "",
      `Recent events (${events.usageEvents.length} shown):`,
      ...events.usageEvents.slice(0, 10).map(
        (e) =>
          `  ${e.timestamp} — ${e.model} (${e.kind}) ` +
          `${e.tokenUsage ? `${e.tokenUsage.inputTokens + e.tokenUsage.outputTokens} tokens, ${formatCents(e.tokenUsage.totalCents)}` : `cost: ${formatCents(e.requestsCosts)}`}`,
      ),
    ];

    return { content: formatResponse(lines.join("\n")) };
  },
);

// ─── Start Server ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
