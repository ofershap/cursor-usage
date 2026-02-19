export interface TeamMember {
  name: string;
  email: string;
  id: string;
  role: string;
  isRemoved: boolean;
}

export interface RawDailyUsageEntry {
  date: number;
  day: string;
  userId: string;
  email: string;
  isActive: boolean;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  acceptedLinesAdded: number;
  acceptedLinesDeleted: number;
  totalApplies: number;
  totalAccepts: number;
  totalRejects: number;
  totalTabsShown: number;
  totalTabsAccepted: number;
  composerRequests: number;
  chatRequests: number;
  agentRequests: number;
  cmdkUsages: number;
  subscriptionIncludedReqs: number;
  apiKeyReqs: number;
  usageBasedReqs: number;
  bugbotUsages: number;
  mostUsedModel: string;
  applyMostUsedExtension: string;
  tabMostUsedExtension: string;
  clientVersion?: string;
}

export interface DailyUsageResponse {
  period: { startDate: number; endDate: number };
  data: RawDailyUsageEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalUsers: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface MemberSpend {
  userId: string;
  email: string;
  name: string;
  role: string;
  spendCents: number;
  includedSpendCents: number;
  fastPremiumRequests: number;
  monthlyLimitDollars: number | null;
  hardLimitOverrideDollars: number;
}

export interface SpendResponse {
  teamMemberSpend: MemberSpend[];
  subscriptionCycleStart: number;
  totalMembers: number;
  totalPages: number;
  limitedUsersCount: number;
  maxUserSpendCents: number;
}

export interface GroupMemberSpend {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  leftAt: string | null;
  spendCents: number;
  dailySpend: Array<{ date: string; spendCents: number }>;
}

export interface BillingGroup {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  spendCents: number;
  currentMembers: GroupMemberSpend[];
  dailySpend: Array<{ date: string; spendCents: number }>;
}

export interface GroupsResponse {
  groups: BillingGroup[];
  unassignedGroup: BillingGroup;
  billingCycle?: {
    cycleStart: string;
    cycleEnd: string;
  };
}

export interface FilteredUsageEvent {
  timestamp: string;
  model: string;
  kind: string;
  maxMode: boolean;
  requestsCosts: number;
  isTokenBasedCall: boolean;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    cacheWriteTokens: number;
    cacheReadTokens: number;
    totalCents: number;
  };
  userEmail: string;
  isChargeable: boolean;
  isHeadless: boolean;
}

export interface FilteredUsageEventsResponse {
  totalUsageEventsCount: number;
  pagination: {
    numPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  usageEvents: FilteredUsageEvent[];
  period: { startDate: number; endDate: number };
}

export interface AnalyticsDAUEntry {
  date: string;
  dau: number;
  cli_dau: number;
  cloud_agent_dau: number;
  bugbot_dau: number;
}

export interface AnalyticsModelBreakdown {
  [model: string]: { messages: number; users: number };
}

export interface AnalyticsModelUsageEntry {
  date: string;
  model_breakdown: AnalyticsModelBreakdown;
}

export interface AnalyticsAgentEditsEntry {
  event_date: string;
  total_suggested_diffs: number;
  total_accepted_diffs: number;
  total_rejected_diffs: number;
  total_green_lines_accepted: number;
  total_red_lines_accepted: number;
  total_green_lines_rejected: number;
  total_red_lines_rejected: number;
  total_green_lines_suggested: number;
  total_red_lines_suggested: number;
  total_lines_suggested: number;
  total_lines_accepted: number;
}

export interface AnalyticsTabsEntry {
  event_date: string;
  total_suggestions: number;
  total_accepts: number;
  total_rejects: number;
  total_lines_suggested: number;
  total_lines_accepted: number;
  total_green_lines_accepted: number;
  total_red_lines_accepted: number;
  total_green_lines_rejected: number;
  total_red_lines_rejected: number;
  total_green_lines_suggested: number;
  total_red_lines_suggested: number;
}

export interface AnalyticsMCPEntry {
  event_date: string;
  tool_name: string;
  mcp_server_name: string;
  usage: number;
}

export interface AnalyticsFileExtensionsEntry {
  event_date: string;
  file_extension: string;
  total_files: number;
  total_accepts: number;
  total_rejects: number;
  total_lines_suggested: number;
  total_lines_accepted: number;
  total_lines_rejected: number;
}

export interface AnalyticsClientVersionsEntry {
  event_date: string;
  client_version: string;
  user_count: number;
  percentage: number;
}

export interface AnalyticsCommandsEntry {
  event_date: string;
  command_name: string;
  usage: number;
}

export interface AnalyticsPlansEntry {
  event_date: string;
  model: string;
  usage: number;
}

export interface AnalyticsResponse<T> {
  data: T[];
  params: Record<string, unknown>;
}
