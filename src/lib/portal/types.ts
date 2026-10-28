export interface PortalEnvelope<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  errors?: unknown;
  debugHint?: unknown;
}

export interface PortalTokens {
  accessToken: string;
  refreshToken: string;
}

export interface StudentProfile {
  profileInfo: {
    studentRoll: string;
    studentName: string;
    departmentCode?: string;
    departmentName?: string;
    programNameShort?: string;
    level?: number;
    term?: number;
    batchName?: string;
    status?: string;
    [key: string]: unknown;
  };
  advisorInfo?: Record<string, unknown>;
  creditSummary?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Semester {
  semesterId: number;
  semesterName: string;
  semesterType?: string;
  value?: number;
  label?: string;
  isSemesterEnd?: boolean;
  [key: string]: unknown;
}

export interface RunningCourse {
  runningCourseId: number;
  courseId?: number;
  courseCode: string;
  courseTitle: string;
  courseSection?: string;
  sectionName?: string;
  courseTeachers?: Array<{
    facultyName?: string;
    facultyShortName?: string;
    rank?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface RoutineSlot {
  runningCourseId: number;
  courseCode: string;
  sectionName?: string;
  facultyMemberName?: string;
  clubActivity?: boolean;
  [key: string]: unknown;
}

export interface ProgramRoutineRow {
  periodId: number;
  roomId?: number;
  roomName?: string;
  days: Record<string, RoutineSlot | null | undefined>;
  [key: string]: unknown;
}

export interface RoutinePeriod {
  periodId: number;
  periodIndex: number;
  timeSlot: string;
  isBreakPeriod: boolean;
  programType?: string;
  semesterId: number;
  [key: string]: unknown;
}

export interface RoutineRoom {
  roomId: number;
  totalCapacity: number | null;
  roomTitle: string;
  isLab: boolean;
  [key: string]: unknown;
}

export interface AttendanceRecord {
  classDate: string;
  classDay?: string;
  classStatus?: string;
  timeSlot?: string;
  presentStatus?: string;
  presentStatusShort?: string;
  isExempt?: boolean;
  isAttendanceSubmitted?: boolean;
  [key: string]: unknown;
}

export interface ClassAttendance {
  totalClass?: number;
  totalPresent?: number;
  presentPercentage?: number;
  records: AttendanceRecord[];
  [key: string]: unknown;
}

export interface SafeStudentSummary {
  studentRoll: string;
  studentName: string;
  departmentName?: string;
  programNameShort?: string;
  status?: string;
}
