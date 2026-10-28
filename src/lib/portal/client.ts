import type {
  ClassAttendance,
  PortalEnvelope,
  PortalTokens,
  ProgramRoutineRow,
  RoutinePeriod,
  RunningCourse,
  Semester,
  StudentProfile,
} from "./types";

const DEFAULT_PORTAL_BASE_URL = "https://api-ems.ndub.edu.bd";

export class PortalApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: "AUTH" | "UPSTREAM" | "INVALID_RESPONSE" = "UPSTREAM",
  ) {
    super(message);
    this.name = "PortalApiError";
  }
}

function baseUrl() {
  return (process.env.PORTAL_API_BASE_URL || DEFAULT_PORTAL_BASE_URL).replace(/\/$/, "");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new PortalApiError("The student portal returned an invalid response.", response.status, "INVALID_RESPONSE");
  }
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export async function loginToPortal(username: string, password: string): Promise<PortalTokens> {
  const response = await fetch(`${baseUrl()}/authenticate/student-portal/student`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new PortalApiError(
      response.status === 401 ? "The username or password is incorrect." : errorMessage(payload, "Unable to sign in to the student portal."),
      response.status,
      response.status === 401 ? "AUTH" : "UPSTREAM",
    );
  }

  const data = (payload as Partial<PortalEnvelope<Partial<PortalTokens>>>).data;
  if (!data?.accessToken || !data.refreshToken) {
    throw new PortalApiError("The student portal did not return a valid session.", 502, "INVALID_RESPONSE");
  }
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

export async function refreshPortalSession(refreshToken: string): Promise<PortalTokens> {
  const response = await fetch(`${baseUrl()}/student-portal/refreshtoken`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${refreshToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new PortalApiError("Your student portal session has expired.", response.status, "AUTH");
  }

  const data = (payload as Partial<PortalEnvelope<Partial<PortalTokens>>>).data;
  if (!data?.accessToken || !data.refreshToken) {
    throw new PortalApiError("The student portal did not return a valid refreshed session.", 502, "INVALID_RESPONSE");
  }
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

export class PortalClient {
  constructor(private readonly accessToken: string) {}

  private async get<T>(path: string, query?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${baseUrl()}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${this.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      throw new PortalApiError(
        response.status === 401 ? "Your student portal session has expired." : errorMessage(payload, "The student portal request failed."),
        response.status,
        response.status === 401 ? "AUTH" : "UPSTREAM",
      );
    }

    const envelope = payload as Partial<PortalEnvelope<T>>;
    if (envelope.success === false || !("data" in envelope)) {
      throw new PortalApiError(errorMessage(payload, "The student portal returned an invalid response."), 502, "INVALID_RESPONSE");
    }
    return envelope.data as T;
  }

  getStudentProfile() {
    return this.get<StudentProfile>("/student-portal/student-profile-details");
  }

  getOfferedCourses() {
    return this.get<Record<string, unknown>>("/student-portal/fixed-credit/student-offered-courses");
  }

  getSemesters() {
    return this.get<Semester[]>("/student-portal/fixed-credit/students-semester-list");
  }

  getRunningCourses(semesterId: number) {
    return this.get<RunningCourse[]>("/student-portal/registered-course-list-by-running-semester", { semesterId });
  }

  getCourseDetails(runningCourseId: number) {
    return this.get<Record<string, unknown>>("/student-portal/course-details-by-running-course-id", { runningCourseId });
  }

  getAttendanceSummary(semesterId: number) {
    return this.get<Record<string, unknown>>("/student-portal/attendance-summary-by-semester", { semesterId });
  }

  getClassAttendance(runningCourseId: number) {
    return this.get<ClassAttendance>("/student-portal/class-attendance-by-running-course-id", { runningCourseId });
  }

  getProgramRoutine(semesterId: number) {
    return this.get<ProgramRoutineRow[]>("/student-portal/program-routine", { semesterId });
  }

  getRoutinePeriods(semesterId: number) {
    return this.get<RoutinePeriod[]>("/student-portal/routine/period/list", { semesterId });
  }
}

export function toSafeStudentSummary(profile: StudentProfile) {
  const info = profile.profileInfo;
  return {
    studentRoll: info.studentRoll,
    studentName: info.studentName,
    departmentName: info.departmentName,
    programNameShort: info.programNameShort,
    status: info.status,
  };
}
