export const UNIVERSITY_TIME_ZONE = "Asia/Dhaka";

export interface AcademicSemester {
  term: "Spring" | "Fall";
  year: number;
  label: string;
}

export function isoDateInTimeZone(date = new Date(), timeZone = UNIVERSITY_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function currentDateTime(date = new Date(), timeZone = UNIVERSITY_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "full",
    timeStyle: "long",
    hour12: true,
  });
  return {
    iso: date.toISOString(),
    localDate: isoDateInTimeZone(date, timeZone),
    formatted: formatter.format(date),
    timeZone,
  };
}

export function academicSemesterForDate(date = new Date(), timeZone = UNIVERSITY_TIME_ZONE): AcademicSemester {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const month = Number(values.month);
  const year = Number(values.year);
  const term = month <= 6 ? "Spring" : "Fall";
  return { term, year, label: `${term} ${year}` };
}
