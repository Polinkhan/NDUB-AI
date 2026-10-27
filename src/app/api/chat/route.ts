import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  convertToModelMessages,
  safeValidateUIMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { refreshAuthenticatedSession } from "@/lib/auth/session";
import { buildSystemPrompt } from "@/lib/agent/prompt";
import { compactMessageHistory } from "@/lib/agent/history";
import { createStudentTools } from "@/lib/agent/tools";
import { isSameOrigin, noStoreJson } from "@/lib/http/security";

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return noStoreJson({ error: "Invalid request origin." }, { status: 403 });

  const tokens = await refreshAuthenticatedSession();
  if (!tokens) return noStoreJson({ error: "Your session has expired. Please sign in again." }, { status: 401 });

  const apiKey = process.env.NVIDIA_API_KEY;
  const modelId = process.env.NVIDIA_NIM_MODEL;
  if (!apiKey || !modelId) {
    return noStoreJson({ error: "The AI service is not configured yet." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { messages?: unknown };
    if (JSON.stringify(body.messages ?? []).length > 250_000) {
      return noStoreJson({ error: "This conversation is too large. Start a new chat." }, { status: 413 });
    }

    const tools = createStudentTools(tokens.accessToken);
    const validation = await safeValidateUIMessages<UIMessage>({ messages: body.messages, tools });
    if (!validation.success || validation.data.length === 0 || validation.data.length > 60) {
      return noStoreJson({ error: "The chat request is invalid or too long." }, { status: 400 });
    }

    const provider = createOpenAICompatible({
      name: "nvidia",
      apiKey,
      baseURL: (process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, ""),
      includeUsage: true,
    });

    const result = streamText({
      model: provider(modelId),
      instructions: buildSystemPrompt(),
      messages: await convertToModelMessages(compactMessageHistory(validation.data), { tools }),
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(8),
      temperature: 0.2,
      maxOutputTokens: 4_096,
      abortSignal: request.signal,
      maxRetries: 1,
    });

    return result.toUIMessageStreamResponse({
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
      onError: () => "The assistant could not complete that request. Please try again.",
    });
  } catch {
    return noStoreJson({ error: "The assistant could not start the request. Please try again." }, { status: 500 });
  }
}
