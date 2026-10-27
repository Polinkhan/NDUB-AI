import { afterEach, describe, expect, it, vi } from "vitest";
import { searchTavily } from "./tavily";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TAVILY_API_KEY;
});

describe("Tavily search", () => {
  it("keeps only citation-safe result fields", async () => {
    process.env.TAVILY_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [{ title: "NDUB", url: "https://example.com", content: "Current notice", score: 0.9, raw_content: "ignored" }],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(searchTavily({ query: "NDUB notice" })).resolves.toEqual([
      { title: "NDUB", url: "https://example.com", content: "Current notice", score: 0.9 },
    ]);
  });

  it("fails safely when no server key is configured", async () => {
    await expect(searchTavily({ query: "test" })).rejects.toThrow("not configured");
  });
});
