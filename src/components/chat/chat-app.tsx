"use client";

import type { UIMessage } from "ai";
import { LoaderCircle, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { SafeStudentSummary } from "@/lib/portal/types";
import { ChatPanel } from "./chat-panel";
import { ChatSidebar } from "./chat-sidebar";

const STORAGE_KEY = "ndub-ai-conversations-v1";

export interface Conversation {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt: number;
  updatedAt: number;
}

function createConversation(): Conversation {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: "New conversation", messages: [], createdAt: now, updatedAt: now };
}

function loadConversations() {
  if (typeof window === "undefined") return [createConversation()];
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]") as unknown;
    const valid = Array.isArray(saved) ? saved.filter(isStoredConversation) : [];
    return valid.length ? valid : [createConversation()];
  } catch {
    return [createConversation()];
  }
}

function isStoredConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Conversation>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    Array.isArray(item.messages) &&
    typeof item.createdAt === "number" &&
    typeof item.updatedAt === "number"
  );
}

export function ChatApp() {
  const router = useRouter();
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [selectedId, setSelectedId] = useState("");
  const [student, setStudent] = useState<SafeStudentSummary | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) {
        sessionStorage.removeItem(STORAGE_KEY);
        router.replace("/login");
        router.refresh();
        return;
      }
      if (response.ok) {
        const payload = (await response.json()) as { student: SafeStudentSummary };
        setStudent(payload.student);
      }
    });
  }, [router]);

  useEffect(() => {
    if (hydrated) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, hydrated]);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0],
    [conversations, selectedId],
  );

  const addConversation = useCallback(() => {
    const next = createConversation();
    setConversations((current) => [next, ...current]);
    setSelectedId(next.id);
    setSidebarOpen(false);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((current) => {
      const remaining = current.filter((conversation) => conversation.id !== id);
      const next = remaining.length ? remaining : [createConversation()];
      setSelectedId((active) => (active === id ? next[0].id : active));
      return next;
    });
  }, []);

  const updateMessages = useCallback((id: string, messages: UIMessage[]) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id ? { ...conversation, messages, updatedAt: Date.now() } : conversation,
      ),
    );
  }, []);

  const updateTitle = useCallback((id: string, title: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id && conversation.title === "New conversation"
          ? { ...conversation, title, updatedAt: Date.now() }
          : conversation,
      ),
    );
  }, []);

  async function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  if (!hydrated || !selected) {
    return (
      <main className="app-loading">
        <div className="brand-mark"><LoaderCircle className="spin" size={22} /></div>
        <p>Opening your assistant…</p>
      </main>
    );
  }

  return (
    <main className="chat-app">
      <ChatSidebar
        open={sidebarOpen}
        conversations={conversations}
        selectedId={selected.id}
        student={student}
        onClose={() => setSidebarOpen(false)}
        onNew={addConversation}
        onSelect={(id) => {
          setSelectedId(id);
          setSidebarOpen(false);
        }}
        onDelete={deleteConversation}
        onLogout={logout}
      />
      <section className="chat-main">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open conversations">
            <Menu size={21} />
          </button>
          <span>NDUB AI</span>
          <div className="mobile-header__spacer" />
        </header>
        <ChatPanel
          key={selected.id}
          conversation={selected}
          student={student}
          onMessagesChange={updateMessages}
          onTitleChange={updateTitle}
        />
      </section>
    </main>
  );
}
