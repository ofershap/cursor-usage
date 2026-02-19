import { describe, it, expect, vi, beforeEach } from "vitest";
import { CursorAPI } from "../src/cursor-api.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

describe("CursorAPI", () => {
  let api: CursorAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    api = new CursorAPI("test-api-key", "https://api.cursor.com");
  });

  describe("authentication", () => {
    it("sends Basic auth header with base64-encoded key", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ teamMembers: [] }));

      await api.getTeamMembers();

      const [, options] = mockFetch.mock.calls[0];
      const expectedAuth = `Basic ${Buffer.from("test-api-key:").toString("base64")}`;
      expect(options.headers.Authorization).toBe(expectedAuth);
    });
  });

  describe("getTeamMembers", () => {
    it("returns team members array", async () => {
      const members = [
        {
          name: "Alice",
          email: "alice@co.com",
          id: "1",
          role: "admin",
          isRemoved: false,
        },
        { name: "Bob", email: "bob@co.com", id: "2", role: "member", isRemoved: false },
      ];
      mockFetch.mockResolvedValueOnce(jsonResponse({ teamMembers: members }));

      const result = await api.getTeamMembers();
      expect(result).toEqual(members);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.cursor.com/teams/members",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  describe("getSpending", () => {
    it("returns spending data with cycle start date", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          teamMemberSpend: [
            {
              userId: "1",
              email: "alice@co.com",
              name: "Alice",
              role: "admin",
              spendCents: 5000,
              includedSpendCents: 4000,
              fastPremiumRequests: 10,
              monthlyLimitDollars: null,
              hardLimitOverrideDollars: 0,
            },
          ],
          subscriptionCycleStart: 1708300800000,
          totalMembers: 1,
          totalPages: 1,
          limitedUsersCount: 0,
          maxUserSpendCents: 5000,
        }),
      );

      const result = await api.getSpending();
      expect(result.members).toHaveLength(1);
      expect(result.members[0].email).toBe("alice@co.com");
      expect(result.cycleStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("getDailyUsage", () => {
    it("sends POST with pagination params", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          period: { startDate: 0, endDate: 0 },
          data: [],
          pagination: {
            page: 1,
            pageSize: 100,
            totalUsers: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
      );

      await api.getDailyUsage({ page: 2, pageSize: 50 });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body);
      expect(body.page).toBe(2);
      expect(body.pageSize).toBe(50);
    });
  });

  describe("getAllDailyUsage", () => {
    it("paginates through all pages", async () => {
      const entry = {
        date: 0,
        day: "2026-02-01",
        userId: "1",
        email: "alice@co.com",
        isActive: true,
        totalLinesAdded: 100,
        totalLinesDeleted: 10,
        acceptedLinesAdded: 80,
        acceptedLinesDeleted: 5,
        totalApplies: 20,
        totalAccepts: 15,
        totalRejects: 5,
        totalTabsShown: 50,
        totalTabsAccepted: 30,
        composerRequests: 10,
        chatRequests: 5,
        agentRequests: 3,
        cmdkUsages: 10,
        subscriptionIncludedReqs: 15,
        apiKeyReqs: 0,
        usageBasedReqs: 3,
        bugbotUsages: 0,
        mostUsedModel: "claude-sonnet-4.5",
        applyMostUsedExtension: ".ts",
        tabMostUsedExtension: ".ts",
      };

      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({
            period: { startDate: 0, endDate: 0 },
            data: [entry],
            pagination: {
              page: 1,
              pageSize: 100,
              totalUsers: 2,
              totalPages: 2,
              hasNextPage: true,
              hasPreviousPage: false,
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            period: { startDate: 0, endDate: 0 },
            data: [{ ...entry, email: "bob@co.com" }],
            pagination: {
              page: 2,
              pageSize: 100,
              totalUsers: 2,
              totalPages: 2,
              hasNextPage: false,
              hasPreviousPage: true,
            },
          }),
        );

      const result = await api.getAllDailyUsage();
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("analytics endpoints", () => {
    it("builds query params correctly", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: [], params: {} }));

      await api.getDAU({
        startDate: "2026-02-01",
        endDate: "2026-02-15",
        users: ["alice@co.com", "bob@co.com"],
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("startDate=2026-02-01");
      expect(url).toContain("endDate=2026-02-15");
      expect(url).toContain("users=" + encodeURIComponent("alice@co.com,bob@co.com"));
    });

    it("uses defaults when no options provided", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: [], params: {} }));

      await api.getModelUsage();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("startDate=30d");
      expect(url).toContain("endDate=today");
    });
  });

  describe("rate limiting", () => {
    it("retries on 429 with Retry-After header", async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ "Retry-After": "1" }),
          text: () => Promise.resolve("Rate limited"),
        })
        .mockResolvedValueOnce(jsonResponse({ teamMembers: [] }));

      const promise = api.getTeamMembers();
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe("error handling", () => {
    it("throws on non-OK responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers(),
        text: () => Promise.resolve("Forbidden"),
      });

      await expect(api.getTeamMembers()).rejects.toThrow("Cursor API 403: Forbidden");
    });
  });
});
