import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PortalClient } from "@/lib/portal/client";
import type { ProgramRoutineRow, RunningCourse } from "@/lib/portal/types";
import { buildStudentRoutine, getTodayAttendance, resolveSemesterId, selectCurrentSemester } from "./tools";

function portalStub(overrides: Partial<PortalClient> = {}) {
  return {
    getSemesters: vi.fn().mockResolvedValue([
      { semesterId: 20, semesterName: "Spring 2026", isSemesterEnd: true },
      { semesterId: 33, semesterName: "Fall 2026", isSemesterEnd: false },
    ]),
    getRunningCourses: vi.fn().mockResolvedValue([
      { runningCourseId: 1, courseCode: "CSE 101", courseTitle: "Programming" },
      { runningCourseId: 2, courseCode: "MAT 101", courseTitle: "Mathematics" },
    ]),
    getClassAttendance: vi.fn(async (id: number) => {
      if (id === 2) throw new Error("temporary failure");
      return {
        records: [
          { classDate: "2026-10-27", presentStatus: "Present", isAttendanceSubmitted: true },
          { classDate: "2026-10-26", presentStatus: "Absent", isAttendanceSubmitted: true },
        ],
      };
    }),
    ...overrides,
  } as unknown as PortalClient;
}

describe("student portal tool helpers", () => {
  it("selects the Dhaka date-derived semester unless an ID is supplied", async () => {
    const portal = portalStub();
    await expect(resolveSemesterId(portal, undefined, new Date("2026-10-27T06:00:00.000Z"))).resolves.toBe(33);
    await expect(resolveSemesterId(portal, 44)).resolves.toBe(44);
  });

  it("prefers the exact term and year even when portal active flags are inconsistent", () => {
    const semesters = [
      { semesterId: 10, semesterName: "Fall 2025", isSemesterEnd: false },
      { semesterId: 11, semesterName: "Spring 2026", isSemesterEnd: false },
      { semesterId: 12, semesterName: "Fall 2026", isSemesterEnd: true },
    ];
    expect(selectCurrentSemester(semesters, new Date("2026-03-01T06:00:00.000Z"))?.semesterId).toBe(11);
    expect(selectCurrentSemester(semesters, new Date("2026-10-01T06:00:00.000Z"))?.semesterId).toBe(12);
  });

  it("falls back to the portal active semester when names do not identify a term", () => {
    const semesters = [
      { semesterId: 21, semesterName: "Semester A", isSemesterEnd: true },
      { semesterId: 22, semesterName: "Semester B", isSemesterEnd: false },
    ];
    expect(selectCurrentSemester(semesters, new Date("2026-10-01T06:00:00.000Z"))?.semesterId).toBe(22);
  });

  it("filters today's records in Dhaka and preserves partial failures", async () => {
    const result = await getTodayAttendance(portalStub(), new Date("2026-10-27T06:00:00.000Z"));
    expect(result.date).toBe("2026-10-27");
    expect(result.courses[0].records).toHaveLength(1);
    expect(result.courses[0].records[0].presentStatus).toBe("Present");
    expect(result.courses[1]).toMatchObject({ courseCode: "MAT 101", records: [], error: expect.any(String) });
    expect(result.note).toContain("does not mean absent");
  });

  it("reports when no semester exists", async () => {
    const portal = portalStub({ getSemesters: vi.fn().mockResolvedValue([]) });
    await expect(resolveSemesterId(portal)).rejects.toThrow("No semester");
  });

  it("reduces the real program routine sample to only registered classes", () => {
    const sample = JSON.parse(readFileSync(resolve(process.cwd(), "docs/ndub-sample-response.json"), "utf8")) as {
      endpoints: {
        runningCourses: { response: { data: RunningCourse[] } };
        programRoutine: { response: { data: ProgramRoutineRow[] } };
      };
    };
    const sourceRoutine = sample.endpoints.programRoutine.response.data;
    const result = buildStudentRoutine(sample.endpoints.runningCourses.response.data, sourceRoutine);

    expect(sourceRoutine).toHaveLength(105);
    expect(result.schedule).toHaveLength(10);
    expect(JSON.stringify(sourceRoutine).length).toBeGreaterThan(70_000);
    expect(JSON.stringify(result).length).toBeLessThan(5_000);
    expect(result.note).toContain("no clock times");
  });
});
