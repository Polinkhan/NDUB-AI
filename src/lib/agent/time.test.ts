import { describe, expect, it } from "vitest";
import { academicSemesterForDate, currentDateTime, isoDateInTimeZone } from "./time";

describe("Dhaka date and time", () => {
  it("uses the Dhaka calendar date across a UTC boundary", () => {
    const instant = new Date("2026-10-26T20:15:00.000Z");
    expect(isoDateInTimeZone(instant)).toBe("2026-10-27");
    expect(currentDateTime(instant).timeZone).toBe("Asia/Dhaka");
  });

  it("supports a requested IANA timezone", () => {
    const instant = new Date("2026-10-27T01:00:00.000Z");
    expect(isoDateInTimeZone(instant, "America/New_York")).toBe("2026-10-26");
  });

  it("maps January through June to Spring", () => {
    expect(academicSemesterForDate(new Date("2026-01-01T00:00:00.000Z"))).toEqual({
      term: "Spring",
      year: 2026,
      label: "Spring 2026",
    });
    expect(academicSemesterForDate(new Date("2026-06-30T17:59:59.000Z")).term).toBe("Spring");
  });

  it("maps July through December to Fall", () => {
    expect(academicSemesterForDate(new Date("2026-06-30T18:00:00.000Z"))).toEqual({
      term: "Fall",
      year: 2026,
      label: "Fall 2026",
    });
    expect(academicSemesterForDate(new Date("2026-12-31T17:59:59.000Z")).term).toBe("Fall");
  });
});
