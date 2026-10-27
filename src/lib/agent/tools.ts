import { tool } from "ai";
import { z } from "zod";
import { PortalClient } from "@/lib/portal/client";
import type { ProgramRoutineRow, RunningCourse, Semester } from "@/lib/portal/types";
import { academicSemesterForDate, currentDateTime, isoDateInTimeZone, UNIVERSITY_TIME_ZONE } from "./time";
import { searchTavily } from "./tavily";

export function selectCurrentSemester(semesters: Semester[], now = new Date()) {
  const academic = academicSemesterForDate(now, UNIVERSITY_TIME_ZONE);
  const targetTerm = academic.term.toLowerCase();
  const targetYear = String(academic.year);
  const metadata = semesters.map((semester) => ({
    semester,
    searchable: [semester.semesterName, semester.label, semester.semesterType]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));

  return (
    metadata.find(
      ({ semester, searchable }) =>
        semester.isSemesterEnd === false && searchable.includes(targetTerm) && searchable.includes(targetYear),
    )?.semester ??
    metadata.find(({ searchable }) => searchable.includes(targetTerm) && searchable.includes(targetYear))?.semester ??
    metadata.find(
      ({ semester, searchable }) => semester.isSemesterEnd === false && searchable.includes(targetTerm),
    )?.semester ??
    semesters.find((semester) => semester.isSemesterEnd === false) ??
    metadata.find(({ searchable }) => searchable.includes(targetTerm))?.semester ??
    semesters[0]
  );
}

export async function resolveSemesterId(client: PortalClient, semesterId?: number, now = new Date()) {
  if (semesterId) return semesterId;
  const semesters = await client.getSemesters();
  const current = selectCurrentSemester(semesters, now);
  if (!current) throw new Error("No semester is available for this student.");
  return current.semesterId;
}

export async function getTodayAttendance(client: PortalClient, now = new Date()) {
  const semesters = await client.getSemesters();
  const activeSemester = selectCurrentSemester(semesters, now);
  if (!activeSemester) throw new Error("No semester is available for this student.");

  const date = isoDateInTimeZone(now, UNIVERSITY_TIME_ZONE);
  const courses = await client.getRunningCourses(activeSemester.semesterId);
  const attendance = await Promise.allSettled(
    courses.map(async (course) => {
      const details = await client.getClassAttendance(course.runningCourseId);
      return {
        runningCourseId: course.runningCourseId,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        records: (details.records ?? []).filter((record) => record.classDate === date),
      };
    }),
  );

  return {
    date,
    timeZone: UNIVERSITY_TIME_ZONE,
    semester: activeSemester,
    courses: attendance.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : {
            runningCourseId: courses[index].runningCourseId,
            courseCode: courses[index].courseCode,
            courseTitle: courses[index].courseTitle,
            records: [],
            error: "Attendance could not be loaded for this course.",
          },
    ),
    note: "An empty records array means no attendance record was found for today; it does not mean absent.",
  };
}

const dayOrder = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function buildStudentRoutine(courses: RunningCourse[], routine: ProgramRoutineRow[]) {
  const isRegisteredSlot = (runningCourseId: number, sectionName?: string) =>
    courses.some((course) => {
      if (course.runningCourseId !== runningCourseId) return false;
      const registeredSections = [course.sectionName, course.courseSection]
        .filter((section): section is string => Boolean(section))
        .map((section) => section.trim().toLowerCase());
      if (registeredSections.length === 0) return true;
      return Boolean(sectionName && registeredSections.includes(sectionName.trim().toLowerCase()));
    });
  const schedule = routine
    .flatMap((row) =>
      Object.entries(row.days ?? {}).flatMap(([day, slot]) =>
        slot && isRegisteredSlot(slot.runningCourseId, slot.sectionName)
          ? [
              {
                day,
                periodId: row.periodId,
                roomId: row.roomId,
                roomName: row.roomName,
                runningCourseId: slot.runningCourseId,
                courseCode: slot.courseCode,
                sectionName: slot.sectionName,
                facultyMemberName: slot.facultyMemberName,
                clubActivity: slot.clubActivity ?? false,
              },
            ]
          : [],
      ),
    )
    .sort((a, b) => {
      const dayDifference = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      return dayDifference || a.periodId - b.periodId;
    });

  return {
    registeredCourses: courses.map((course) => ({
      runningCourseId: course.runningCourseId,
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      sectionName: course.sectionName ?? course.courseSection,
      teachers: (course.courseTeachers ?? []).map((teacher) => ({
        facultyName: teacher.facultyName,
        facultyShortName: teacher.facultyShortName,
        rank: teacher.rank,
      })),
    })),
    schedule,
    note: "The portal routine provides period IDs but no clock times. Do not invent start or end times.",
  };
}

export async function getStudentRoutine(client: PortalClient, semesterId?: number, now = new Date()) {
  const semesters = await client.getSemesters();
  const semester = semesterId
    ? semesters.find((item) => item.semesterId === semesterId)
    : selectCurrentSemester(semesters, now);
  const resolvedSemesterId = semesterId ?? semester?.semesterId;
  if (!resolvedSemesterId) throw new Error("No semester is available for this student.");

  const [courses, routine] = await Promise.all([
    client.getRunningCourses(resolvedSemesterId),
    client.getProgramRoutine(resolvedSemesterId),
  ]);
  return {
    semester: semester ?? { semesterId: resolvedSemesterId },
    ...buildStudentRoutine(courses, routine),
  };
}

const optionalSemester = z.object({
  semesterId: z.number().int().positive().optional().describe("Semester ID. Omit to use the date-derived current semester."),
});

export function createStudentTools(accessToken: string, now = new Date()) {
  const client = new PortalClient(accessToken);

  return {
    get_student_profile: tool({
      description: "Get the authenticated student's profile, academic identity, advisor, and credit summary.",
      inputSchema: z.object({}),
      execute: () => client.getStudentProfile(),
    }),
    get_offered_courses: tool({
      description: "Get courses currently offered to the authenticated student.",
      inputSchema: z.object({}),
      execute: () => client.getOfferedCourses(),
    }),
    list_semesters: tool({
      description: "List the student's available semesters and whether each semester has ended.",
      inputSchema: z.object({}),
      execute: () => client.getSemesters(),
    }),
    list_registered_courses: tool({
      description: "List registered courses and teachers for a semester. Omit semesterId to use Spring (Jan-Jun) or Fall (Jul-Dec) for today's Dhaka date.",
      inputSchema: optionalSemester,
      execute: async ({ semesterId }) => {
        const resolvedSemesterId = await resolveSemesterId(client, semesterId, now);
        return { semesterId: resolvedSemesterId, courses: await client.getRunningCourses(resolvedSemesterId) };
      },
    }),
    get_course_details: tool({
      description: "Get complete details for one registered running course.",
      inputSchema: z.object({ runningCourseId: z.number().int().positive() }),
      execute: ({ runningCourseId }) => client.getCourseDetails(runningCourseId),
    }),
    get_attendance_summary: tool({
      description: "Get attendance totals and percentages for all courses in a semester.",
      inputSchema: optionalSemester,
      execute: async ({ semesterId }) => {
        const resolvedSemesterId = await resolveSemesterId(client, semesterId, now);
        return client.getAttendanceSummary(resolvedSemesterId);
      },
    }),
    get_class_attendance: tool({
      description: "Get class-by-class attendance records for one running course.",
      inputSchema: z.object({ runningCourseId: z.number().int().positive() }),
      execute: ({ runningCourseId }) => client.getClassAttendance(runningCourseId),
    }),
    get_program_routine: tool({
      description:
        "Get this student's complete weekly routine. This one tool already resolves the current semester, checks registered courses, and filters the large program routine to the student's own classes. Do not call profile or course-list tools for a routine request.",
      inputSchema: optionalSemester,
      execute: ({ semesterId }) => getStudentRoutine(client, semesterId, now),
    }),
    get_today_attendance: tool({
      description: "Reliably check every registered course for attendance records dated today in Asia/Dhaka.",
      inputSchema: z.object({}),
      execute: () => getTodayAttendance(client, now),
    }),
    get_current_datetime: tool({
      description: "Get the exact current date, time, and timezone. Defaults to Asia/Dhaka.",
      inputSchema: z.object({
        timeZone: z.string().min(1).optional().describe("An IANA timezone such as Asia/Dhaka."),
      }),
      execute: ({ timeZone }) => {
        try {
          return currentDateTime(now, timeZone ?? UNIVERSITY_TIME_ZONE);
        } catch {
          throw new Error("That timezone is not valid.");
        }
      },
    }),
    search_web: tool({
      description:
        "Search the public web for current or external information. Do not include private student portal data in the query.",
      inputSchema: z.object({
        query: z.string().min(2).max(500),
        topic: z.enum(["general", "news", "finance"]).optional(),
        timeRange: z.enum(["day", "week", "month", "year"]).optional(),
      }),
      execute: searchTavily,
    }),
  };
}
