import type {
  TeamMember,
  DailyUsageResponse,
  MemberSpend,
  SpendResponse,
  GroupsResponse,
  FilteredUsageEventsResponse,
  AnalyticsDAUEntry,
  AnalyticsModelUsageEntry,
  AnalyticsAgentEditsEntry,
  AnalyticsTabsEntry,
  AnalyticsMCPEntry,
  AnalyticsFileExtensionsEntry,
  AnalyticsClientVersionsEntry,
  AnalyticsCommandsEntry,
  AnalyticsPlansEntry,
  AnalyticsResponse,
  RawDailyUsageEntry,
} from "./types.js";

export class CursorAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.cursor.com") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const { method = "GET", body } = options;
    const url = `${this.baseUrl}${endpoint}`;
    const credentials = Buffer.from(`${this.apiKey}:`).toString("base64");

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request<T>(endpoint, options);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Cursor API ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    const data = await this.request<{ teamMembers: TeamMember[] }>(
      "/teams/members",
    );
    return data.teamMembers;
  }

  async getDailyUsage(options: {
    startDate?: number;
    endDate?: number;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{
    entries: RawDailyUsageEntry[];
    pagination: DailyUsageResponse["pagination"];
  }> {
    const body: Record<string, unknown> = {
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 100,
    };
    if (options.startDate) body.startDate = options.startDate;
    if (options.endDate) body.endDate = options.endDate;

    const data = await this.request<DailyUsageResponse>(
      "/teams/daily-usage-data",
      { method: "POST", body },
    );

    return { entries: data.data, pagination: data.pagination };
  }

  async getAllDailyUsage(options: {
    startDate?: number;
    endDate?: number;
  } = {}): Promise<RawDailyUsageEntry[]> {
    const allEntries: RawDailyUsageEntry[] = [];
    let page = 1;

    while (true) {
      const { entries, pagination } = await this.getDailyUsage({
        ...options,
        page,
        pageSize: 100,
      });
      allEntries.push(...entries);
      if (!pagination.hasNextPage) break;
      page++;
    }

    return allEntries;
  }

  async getSpending(options: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<{
    members: MemberSpend[];
    cycleStart: string;
    totalPages: number;
    totalMembers: number;
  }> {
    const data = await this.request<SpendResponse>("/teams/spend", {
      method: "POST",
      body: { page: options.page ?? 1, pageSize: options.pageSize ?? 100 },
    });

    return {
      members: data.teamMemberSpend,
      cycleStart: new Date(data.subscriptionCycleStart)
        .toISOString()
        .split("T")[0]!,
      totalPages: data.totalPages,
      totalMembers: data.totalMembers,
    };
  }

  async getAllSpending(): Promise<{
    members: MemberSpend[];
    cycleStart: string;
  }> {
    const allMembers: MemberSpend[] = [];
    let cycleStart = "";
    let page = 1;

    while (true) {
      const result = await this.getSpending({ page });
      allMembers.push(...result.members);
      cycleStart = result.cycleStart;
      if (page >= result.totalPages) break;
      page++;
    }

    return { members: allMembers, cycleStart };
  }

  async getBillingGroups(): Promise<GroupsResponse> {
    return this.request<GroupsResponse>("/teams/groups");
  }

  async getUsageEvents(options: {
    email?: string;
    startDate?: number;
    endDate?: number;
    page?: number;
    pageSize?: number;
  } = {}): Promise<FilteredUsageEventsResponse> {
    return this.request<FilteredUsageEventsResponse>(
      "/teams/filtered-usage-events",
      {
        method: "POST",
        body: {
          email: options.email,
          startDate: options.startDate,
          endDate: options.endDate,
          page: options.page ?? 1,
          pageSize: options.pageSize ?? 500,
        },
      },
    );
  }

  async setUserSpendLimit(
    email: string,
    limitDollars: number,
  ): Promise<void> {
    await this.request("/teams/user-spend-limit", {
      method: "POST",
      body: { email, hardLimitDollars: limitDollars },
    });
  }

  private analyticsParams(options: {
    startDate?: string;
    endDate?: string;
    users?: string[];
  }): string {
    const params = new URLSearchParams();
    params.set("startDate", options.startDate ?? "30d");
    params.set("endDate", options.endDate ?? "today");
    if (options.users?.length) params.set("users", options.users.join(","));
    return params.toString();
  }

  async getDAU(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsResponse<AnalyticsDAUEntry>> {
    return this.request(`/analytics/team/dau?${this.analyticsParams(options)}`);
  }

  async getModelUsage(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsResponse<AnalyticsModelUsageEntry>> {
    return this.request(
      `/analytics/team/models?${this.analyticsParams(options)}`,
    );
  }

  async getAgentEdits(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsResponse<AnalyticsAgentEditsEntry>> {
    return this.request(
      `/analytics/team/agent-edits?${this.analyticsParams(options)}`,
    );
  }

  async getTabs(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsResponse<AnalyticsTabsEntry>> {
    return this.request(
      `/analytics/team/tabs?${this.analyticsParams(options)}`,
    );
  }

  async getMCP(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsResponse<AnalyticsMCPEntry>> {
    return this.request(
      `/analytics/team/mcp?${this.analyticsParams(options)}`,
    );
  }

  async getFileExtensions(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsResponse<AnalyticsFileExtensionsEntry>> {
    return this.request(
      `/analytics/team/top-file-extensions?${this.analyticsParams(options)}`,
    );
  }

  async getClientVersions(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsResponse<AnalyticsClientVersionsEntry>> {
    return this.request(
      `/analytics/team/client-versions?${this.analyticsParams(options)}`,
    );
  }

  async getCommands(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsResponse<AnalyticsCommandsEntry>> {
    return this.request(
      `/analytics/team/commands?${this.analyticsParams(options)}`,
    );
  }

  async getPlans(
    options: { startDate?: string; endDate?: string; users?: string[] } = {},
  ): Promise<AnalyticsResponse<AnalyticsPlansEntry>> {
    return this.request(
      `/analytics/team/plans?${this.analyticsParams(options)}`,
    );
  }
}
