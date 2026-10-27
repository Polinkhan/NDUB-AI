import type { UIMessage } from "ai";

/**
 * Tool payloads can contain large portal responses. They are useful while a
 * tool loop is running, but completed historical calls do not need to be sent
 * to the model again. Keep only conversational text between requests.
 */
export function compactMessageHistory(messages: UIMessage[]): UIMessage[] {
  return messages
    .map((message) => ({
      ...message,
      parts: message.parts.filter((part) => part.type === "text"),
    }))
    .filter((message) => message.parts.length > 0);
}
