export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
}

export async function searchTavily(input: {
  query: string;
  topic?: "general" | "news" | "finance";
  timeRange?: "day" | "week" | "month" | "year";
}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Web search is not configured.");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: input.query,
      topic: input.topic ?? "general",
      time_range: input.timeRange,
      search_depth: "basic",
      max_results: 5,
      chunks_per_source: 2,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      include_published_date: true,
      safe_search: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error("Web search is temporarily unavailable.");
  const payload = (await response.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      score?: number;
      published_date?: string;
    }>;
  };

  return (payload.results ?? [])
    .filter((result) => result.title && result.url)
    .map<TavilyResult>((result) => ({
      title: result.title!,
      url: result.url!,
      content: result.content ?? "",
      score: result.score,
      publishedDate: result.published_date,
    }));
}
