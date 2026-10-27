import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./prompt";

describe("agent instructions", () => {
  it("includes live Dhaka context and multilingual behavior", () => {
    const prompt = buildSystemPrompt(new Date("2026-10-26T20:15:00.000Z"));
    expect(prompt).toContain("Calendar date: 2026-10-27");
    expect(prompt).toContain("Asia/Dhaka");
    expect(prompt).toContain("English, বাংলা, and Banglish");
    expect(prompt).toContain("Current regular undergraduate semester: Fall 2026");
    expect(prompt).toContain("Spring (January-June) and Fall (July-December)");
    expect(prompt).toContain("For routine questions, call get_program_routine only");
    expect(prompt).toContain("I was created by Abu Sayed Polin to help NDUB (Notre Dame University Bangladesh) students.");
    expect(prompt).toContain("[Visit Abu Sayed Polin's portfolio](https://polinkhan.com)");
    expect(prompt).toContain("Do not insert creator credit into unrelated academic answers");
    expect(prompt).toContain("missing record as unknown, not absent");
    expect(prompt).toContain("Never put student profile details");
  });
});
