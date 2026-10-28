import { afterEach, describe, expect, it, vi } from "vitest";
import { loginToPortal, PortalApiError, PortalClient, refreshPortalSession } from "./client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.PORTAL_API_BASE_URL;
});

describe("portal authentication", () => {
  it("logs in without exposing credentials in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, status: 200, message: "ok", data: { accessToken: "access", refreshToken: "refresh" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginToPortal("student", "secret")).resolves.toEqual({ accessToken: "access", refreshToken: "refresh" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-ems.ndub.edu.bd/authenticate/student-portal/student",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ username: "student", password: "secret" }) }),
    );
  });

  it("maps rejected credentials to an authentication error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401)));
    await expect(loginToPortal("bad", "bad")).rejects.toMatchObject<Partial<PortalApiError>>({ code: "AUTH", status: 401 });
  });

  it("uses the refresh token as the bearer credential", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data: { accessToken: "new-access", refreshToken: "new-refresh" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await refreshPortalSession("old-refresh");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer old-refresh");
  });
});

describe("PortalClient", () => {
  it("sends the access token and returns envelope data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data: [{ semesterId: 33, semesterName: "Fall" }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const semesters = await new PortalClient("access-token").getSemesters();
    expect(semesters[0].semesterId).toBe(33);
    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.pathname).toBe("/student-portal/fixed-credit/students-semester-list");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer access-token");
  });

  it("rejects malformed successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: true })));
    await expect(new PortalClient("access-token").getStudentProfile()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("loads semester-specific routine periods with bearer authentication", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            periodId: 12,
            periodIndex: 1,
            timeSlot: "8:00AM - 9:20AM",
            isBreakPeriod: false,
            semesterId: 33,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const periods = await new PortalClient("access-token").getRoutinePeriods(33);
    expect(periods[0].timeSlot).toBe("8:00AM - 9:20AM");
    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.pathname).toBe("/student-portal/routine/period/list");
    expect(requestUrl.searchParams.get("semesterId")).toBe("33");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer access-token");
  });

  it("loads active routine rooms with their display titles", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: [{ roomId: 5, totalCapacity: 58, roomTitle: "311", isLab: false }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rooms = await new PortalClient("access-token").getRoutineRooms();
    expect(rooms[0]).toMatchObject({ roomId: 5, roomTitle: "311" });
    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.pathname).toBe("/student-portal/room/list");
    expect(requestUrl.searchParams.get("showableInRoutine")).toBe("true");
    expect(requestUrl.searchParams.get("status")).toBe("Active");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer access-token");
  });
});
