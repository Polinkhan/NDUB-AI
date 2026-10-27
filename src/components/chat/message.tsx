"use client";

import type { UIMessage } from "ai";
import { Check, Copy, Database, Globe2, GraduationCap, RefreshCcw } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const toolLabels: Record<string, string> = {
  get_student_profile: "Checking your profile",
  get_offered_courses: "Checking offered courses",
  list_semesters: "Looking up semesters",
  list_registered_courses: "Checking registered courses",
  get_course_details: "Opening course details",
  get_attendance_summary: "Reviewing attendance",
  get_class_attendance: "Checking class records",
  get_program_routine: "Opening your routine",
  get_today_attendance: "Checking today's attendance",
  get_current_datetime: "Checking university time",
  search_web: "Searching the web",
};

function textFromMessage(message: UIMessage) {
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function ToolActivity({ part }: { part: UIMessage["parts"][number] }) {
  if (!part.type.startsWith("tool-") && part.type !== "dynamic-tool") return null;
  const value = part as unknown as { type: string; toolName?: string; state?: string };
  const toolName = value.type === "dynamic-tool" ? value.toolName || "tool" : value.type.slice(5);
  const complete = value.state === "output-available" || value.state === "output-error";
  const Icon = toolName === "search_web" ? Globe2 : Database;
  return (
    <div className={`tool-activity ${complete ? "is-complete" : ""}`}>
      <Icon size={15} />
      <span>{toolLabels[toolName] || "Checking portal data"}</span>
      {complete ? <Check size={14} /> : <span className="tool-pulse" />}
    </div>
  );
}

interface ChatMessageProps {
  message: UIMessage;
  isLast: boolean;
  busy: boolean;
  onRegenerate: () => void;
}

export function ChatMessage({ message, isLast, busy, onRegenerate }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const text = textFromMessage(message);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  if (message.role === "user") {
    return (
      <article className="message-row message-row--user">
        <div className="user-message">{text}</div>
      </article>
    );
  }

  return (
    <article className="message-row message-row--assistant">
      <div className="assistant-avatar" aria-hidden="true"><GraduationCap size={18} /></div>
      <div className="assistant-content">
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div className="markdown" key={`${message.id}-text-${index}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                    ),
                  }}
                >
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }
          return <ToolActivity key={`${message.id}-part-${index}`} part={part} />;
        })}
        {text && !(isLast && busy) ? (
          <div className="message-actions">
            <button onClick={() => void copy()} aria-label="Copy response" title="Copy response">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            {isLast ? (
              <button onClick={onRegenerate} aria-label="Regenerate response" title="Regenerate response">
                <RefreshCcw size={15} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
