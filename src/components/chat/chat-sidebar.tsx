"use client";

import { GraduationCap, LogOut, MessageSquare, Plus, Trash2, X } from "lucide-react";
import type { SafeStudentSummary } from "@/lib/portal/types";
import type { Conversation } from "./chat-app";

interface ChatSidebarProps {
  open: boolean;
  conversations: Conversation[];
  selectedId: string;
  student: SafeStudentSummary | null;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
}

function initials(name?: string) {
  return (name || "Student")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ChatSidebar(props: ChatSidebarProps) {
  return (
    <>
      <button
        className={`sidebar-backdrop ${props.open ? "is-open" : ""}`}
        onClick={props.onClose}
        aria-label="Close conversations"
        tabIndex={props.open ? 0 : -1}
      />
      <aside className={`chat-sidebar ${props.open ? "is-open" : ""}`} aria-label="Conversation history">
        <div className="sidebar-brand">
          <div className="brand-mark"><GraduationCap size={21} strokeWidth={1.8} /></div>
          <div><strong>NDUB AI</strong><span>Student assistant</span></div>
          <button className="icon-button sidebar-close" onClick={props.onClose} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        <button className="new-chat-button" onClick={props.onNew}>
          <Plus size={18} /> New conversation
        </button>

        <div className="conversation-list">
          <p className="sidebar-label">Your conversations</p>
          {[...props.conversations]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((conversation) => (
              <div className={`conversation-item ${conversation.id === props.selectedId ? "is-active" : ""}`} key={conversation.id}>
                <button onClick={() => props.onSelect(conversation.id)} title={conversation.title}>
                  <MessageSquare size={16} />
                  <span>{conversation.title}</span>
                </button>
                <button
                  className="delete-chat"
                  onClick={() => props.onDelete(conversation.id)}
                  aria-label={`Delete ${conversation.title}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
        </div>

        <div className="sidebar-account">
          <div className="student-avatar">{initials(props.student?.studentName)}</div>
          <div className="student-meta">
            <strong>{props.student?.studentName || "Loading profile…"}</strong>
            <span>{props.student?.studentRoll || "Student portal"}</span>
          </div>
          <button className="icon-button" onClick={props.onLogout} aria-label="Sign out" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}
