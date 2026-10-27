import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { compactMessageHistory } from "./history";

describe("chat history compaction", () => {
  it("keeps conversational text while dropping completed tool payloads", () => {
    const messages = [
      { id: "user-1", role: "user", parts: [{ type: "text", text: "Show my routine" }] },
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          { type: "tool-get_program_routine", toolCallId: "call-1", state: "output-available", input: {}, output: { huge: "x".repeat(80_000) } },
          { type: "text", text: "Here is your routine." },
        ],
      },
    ] as unknown as UIMessage[];

    const compacted = compactMessageHistory(messages);
    expect(compacted).toHaveLength(2);
    expect(compacted[1].parts).toEqual([{ type: "text", text: "Here is your routine." }]);
    expect(JSON.stringify(compacted).length).toBeLessThan(500);
  });

  it("removes failed assistant turns that contain only tool activity", () => {
    const messages = [
      { id: "user-1", role: "user", parts: [{ type: "text", text: "Show my routine" }] },
      {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "tool-get_program_routine", toolCallId: "call-1", state: "output-available", input: {}, output: {} }],
      },
    ] as unknown as UIMessage[];
    expect(compactMessageHistory(messages).map((message) => message.role)).toEqual(["user"]);
  });
});
