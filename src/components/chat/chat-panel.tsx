"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, CalendarCheck, Clock3, GraduationCap, LoaderCircle, Square, TextSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import type { SafeStudentSummary } from "@/lib/portal/types";
import type { Conversation } from "./chat-app";
import { ChatMessage } from "./message";

const suggestions = [
  { icon: CalendarCheck, label: "Check today's attendance", prompt: "What is my attendance for today?" },
  { icon: Clock3, label: "Show this semester's routine", prompt: "Show me my routine for the current semester." },
  { icon: GraduationCap, label: "List my registered courses", prompt: "What courses am I registered for this semester?" },
  { icon: TextSearch, label: "Summarize attendance", prompt: "Summarize my attendance by course and flag anything below 75%." },
];

interface ChatPanelProps {
  conversation: Conversation;
  student: SafeStudentSummary | null;
  onMessagesChange: (id: string, messages: UIMessage[]) => void;
  onTitleChange: (id: string, title: string) => void;
}

function makeTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 42).trim()}…` : clean;
}

export function ChatPanel({ conversation, student, onMessagesChange, onTitleChange }: ChatPanelProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", credentials: "same-origin" }),
    [],
  );

  const { messages, sendMessage, status, error, stop, regenerate, clearError } = useChat({
    id: conversation.id,
    messages: conversation.messages,
    transport,
    onError: async () => {
      const session = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      if (session?.status === 401) {
        sessionStorage.removeItem("ndub-ai-conversations-v1");
        router.replace("/login");
        router.refresh();
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    onMessagesChange(conversation.id, messages);
  }, [conversation.id, messages, onMessagesChange]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    clearError();
    if (!conversation.messages.length) onTitleChange(conversation.id, makeTitle(value));
    setInput("");
    await sendMessage({ text: value });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit(input);
    }
  }

  return (
    <div className="chat-panel">
      <div className="messages-scroll" ref={scrollRef} aria-live="polite">
        {messages.length === 0 ? (
          <div className="welcome-state">
            <div className="welcome-orb"><GraduationCap size={30} strokeWidth={1.6} /></div>
            <p className="eyebrow">Your academic copilot</p>
            <h1>How can I help{student?.studentName ? `, ${student.studentName.split(" ")[0]}` : ""}?</h1>
            <p>Ask naturally about your portal in English, বাংলা, or Banglish.</p>
            <div className="suggestion-grid">
              {suggestions.map((suggestion) => (
                <button key={suggestion.prompt} onClick={() => void submit(suggestion.prompt)}>
                  <suggestion.icon size={19} />
                  <span>{suggestion.label}</span>
                  <ArrowUp className="suggestion-arrow" size={16} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                busy={busy}
                onRegenerate={() => void regenerate({ messageId: message.id })}
              />
            ))}
            {status === "submitted" ? (
              <div className="assistant-thinking"><LoaderCircle className="spin" size={17} /> Thinking…</div>
            ) : null}
          </div>
        )}
      </div>

      <div className="composer-zone">
        {error ? (
          <div className="chat-error" role="alert">
            <span>{error.message || "Something went wrong. Please try again."}</span>
            <button onClick={() => void regenerate()}>Retry</button>
          </div>
        ) : null}
        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about attendance, courses, routine…"
            rows={1}
            maxLength={8_000}
            aria-label="Message NDUB AI"
          />
          {busy ? (
            <button type="button" className="send-button" onClick={() => void stop()} aria-label="Stop response">
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button type="submit" className="send-button" disabled={!input.trim()} aria-label="Send message">
              <ArrowUp size={19} />
            </button>
          )}
        </form>
        <p className="composer-note">NDUB AI can make mistakes. Verify important academic information in the portal.</p>
      </div>
    </div>
  );
}
